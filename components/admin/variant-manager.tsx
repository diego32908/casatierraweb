"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import type { ProductVariant, SizeMode, Audience } from "@/types/store";
import { upsertVariant, deleteVariant } from "@/app/actions/products";
import { getStockStatus } from "@/lib/stock";
import { getCanonicalSizes, type CanonicalSize } from "@/lib/sizing";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-500";
const labelCls = "block text-xs font-medium text-stone-500 mb-1";

// ── Predefined palette ─────────────────────────────────────────────────────
// Names are the canonical catalog values used for filtering.
const COLOR_PALETTE: { name: string; hex: string }[] = [
  { name: "Black",      hex: "#1a1a1a" },
  { name: "Charcoal",   hex: "#3d3d3d" },
  { name: "Grey",       hex: "#808080" },
  { name: "White",      hex: "#f5f5f5" },
  { name: "Ivory",      hex: "#f5f0e8" },
  { name: "Cream",      hex: "#ede8d8" },
  { name: "Sand",       hex: "#d4c5a9" },
  { name: "Beige",      hex: "#c9b99a" },
  { name: "Camel",      hex: "#c19a6b" },
  { name: "Taupe",      hex: "#a89080" },
  { name: "Stone",      hex: "#8c8078" },
  { name: "Brown",      hex: "#6b4226" },
  { name: "Chocolate",  hex: "#3d1c08" },
  { name: "Terracotta", hex: "#c06a42" },
  { name: "Rust",       hex: "#b74c2e" },
  { name: "Red",        hex: "#c0392b" },
  { name: "Burgundy",   hex: "#7d1d3f" },
  { name: "Pink",       hex: "#e8a0b4" },
  { name: "Lavender",   hex: "#c4b5d0" },
  { name: "Sage",       hex: "#7a9e7e" },
  { name: "Olive",      hex: "#6b7c49" },
  { name: "Forest",     hex: "#2d4a3e" },
  { name: "Teal",       hex: "#2a7f6f" },
  { name: "Sky",        hex: "#87b4d4" },
  { name: "Blue",       hex: "#2155a3" },
  { name: "Navy",       hex: "#1e3a5f" },
  { name: "Gold",       hex: "#c8a84b" },
  { name: "Silver",     hex: "#a8a8a8" },
];

// ── ColorPicker ────────────────────────────────────────────────────────────
// Module-level so React never remounts it inside a parent render.
interface ColorPickerProps {
  initialName?: string | null;
  initialHex?: string | null;
}

function ColorPicker({ initialName, initialHex }: ColorPickerProps) {
  const isCustomInit =
    !!initialName && !COLOR_PALETTE.find((c) => c.name === initialName);

  const [mode, setMode] = useState<"none" | "palette" | "custom">(
    isCustomInit ? "custom" : initialName ? "palette" : "none"
  );
  const [selected, setSelected] = useState<string | null>(
    isCustomInit ? null : (initialName ?? null)
  );
  const [customName, setCustomName] = useState(isCustomInit ? (initialName ?? "") : "");
  const [customHex, setCustomHex] = useState(isCustomInit ? (initialHex ?? "") : "");

  const paletteEntry = COLOR_PALETTE.find((c) => c.name === selected);

  // Resolved values — always submitted via hidden inputs
  const submitName =
    mode === "palette" ? (paletteEntry?.name ?? "") :
    mode === "custom"  ? customName :
    "";
  const submitHex =
    mode === "palette" ? (paletteEntry?.hex ?? "") :
    mode === "custom"  ? customHex :
    "";

  function handlePaletteClick(name: string) {
    if (mode === "palette" && selected === name) {
      setSelected(null);
      setMode("none");
    } else {
      setSelected(name);
      setMode("palette");
    }
  }

  return (
    <div className="sm:col-span-2 md:col-span-3 space-y-3 pt-2 border-t border-stone-200">
      {/* Always-present hidden inputs — the form reads these */}
      <input type="hidden" name="color_name" value={submitName} />
      <input type="hidden" name="color_hex"  value={submitHex}  />

      {/* Section header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-600">
          Color
        </p>
        <p className="mt-0.5 text-[11px] text-stone-400">
          Assign a catalog color so shoppers can filter by color in the store.
        </p>
      </div>

      {/* Selected color — stacked preview */}
      <div className="rounded border border-stone-200 bg-stone-50 px-3 py-3">
        {mode === "none" ? (
          <p className="text-xs text-stone-400">
            No color selected — click a swatch below to assign one.
          </p>
        ) : (
          <div className="flex items-start gap-3">
            <span
              className="h-10 w-10 shrink-0 border border-stone-200"
              style={{ backgroundColor: submitHex || "#e7e5e4" }}
            />
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-stone-900">
                {submitName || "Custom color"}
              </p>
              {submitHex && (
                <p className="text-[11px] text-stone-400">{submitHex}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setSelected(null); setMode("none"); setCustomName(""); setCustomHex(""); }}
              className="text-xs text-stone-400 hover:text-stone-700 shrink-0 pt-0.5"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Palette grid — fixed columns to prevent overflow */}
      {mode !== "custom" && (
        <div className="grid grid-cols-7 gap-1.5">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c.name}
              type="button"
              title={c.name}
              onClick={() => handlePaletteClick(c.name)}
              className={cn(
                "h-8 w-8 shrink-0 border transition-all",
                c.hex === "#f5f5f5" || c.hex === "#f5f0e8" || c.hex === "#ede8d8"
                  ? "border-stone-300"
                  : "border-transparent",
                mode === "palette" && selected === c.name
                  ? "ring-2 ring-stone-900 ring-offset-1"
                  : "hover:ring-1 hover:ring-stone-400 hover:ring-offset-1"
              )}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      )}

      {/* Custom fallback toggle */}
      <button
        type="button"
        onClick={() => {
          if (mode === "custom") {
            setMode(selected ? "palette" : "none");
          } else {
            setMode("custom");
            setSelected(null);
          }
        }}
        className="text-[11px] text-stone-400 underline underline-offset-2 hover:text-stone-600"
      >
        {mode === "custom" ? "← Use standard palette" : "Need a custom color? (for unusual artisan colors)"}
      </button>

      {/* Custom inputs */}
      {mode === "custom" && (
        <div className="grid grid-cols-2 gap-3 rounded border border-stone-200 bg-stone-50 p-3">
          <div>
            <label className={labelCls}>Color name</label>
            <input
              className={inputCls}
              placeholder="e.g. Dusty Rose"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Hex code</label>
            <div className="flex items-center gap-2">
              <input
                className={inputCls}
                placeholder="#C4A0B5"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
              />
              {customHex && /^#[0-9A-Fa-f]{6}$/.test(customHex) && (
                <span
                  className="h-8 w-8 shrink-0 border border-stone-200"
                  style={{ backgroundColor: customHex }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SizeLabelPicker ────────────────────────────────────────────────────────
// Module-level — renders canonical size options or falls back to free text.
interface SizeLabelPickerProps {
  canonicalSizes: CanonicalSize[];
  initialLabel?: string | null;
  initialSort?: number | null;
}

function SizeLabelPicker({ canonicalSizes, initialLabel, initialSort }: SizeLabelPickerProps) {
  const isCustomInit =
    !!initialLabel && !canonicalSizes.find((s) => s.label === initialLabel);

  const [mode, setMode] = useState<"canonical" | "custom">(
    isCustomInit ? "custom" : "canonical"
  );
  const [selectedLabel, setSelectedLabel] = useState(
    isCustomInit ? "" : (initialLabel ?? "")
  );
  const [customLabel, setCustomLabel] = useState(isCustomInit ? (initialLabel ?? "") : "");

  const canonical = canonicalSizes.find((s) => s.label === selectedLabel);
  const submitLabel = mode === "canonical" ? selectedLabel : customLabel;
  const submitSort  = mode === "canonical" ? (canonical?.sort ?? 0) : 0;

  return (
    <div className="space-y-1.5">
      <input type="hidden" name="size_label" value={submitLabel} />
      <input type="hidden" name="size_sort"  value={submitSort}  />

      {mode === "canonical" ? (
        <>
          <label className={labelCls}>Size *</label>
          <select
            value={selectedLabel}
            onChange={(e) => setSelectedLabel(e.target.value)}
            className={inputCls}
            required
          >
            <option value="">— select —</option>
            {canonicalSizes.map((s) => (
              <option key={s.label} value={s.label}>{s.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => { setMode("custom"); setSelectedLabel(""); }}
            className="text-[11px] text-stone-400 underline underline-offset-2 hover:text-stone-600"
          >
            Enter custom size instead
          </button>
        </>
      ) : (
        <>
          <label className={labelCls}>Size label *</label>
          <input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="e.g. 32×30, 8.5W, One Size"
            required
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => { setMode("canonical"); setCustomLabel(""); }}
            className="text-[11px] text-stone-400 underline underline-offset-2 hover:text-stone-600"
          >
            ← Use standard sizes
          </button>
        </>
      )}
    </div>
  );
}

// ── VariantFields ──────────────────────────────────────────────────────────
interface FieldsProps {
  variant?: ProductVariant;
  showShoeFields: boolean;
  canonicalSizes: CanonicalSize[] | null;
}

function VariantFields({ variant, showShoeFields, canonicalSizes }: FieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
      {canonicalSizes ? (
        <SizeLabelPicker
          canonicalSizes={canonicalSizes}
          initialLabel={variant?.size_label}
          initialSort={variant?.size_sort}
        />
      ) : (
        <>
          <div>
            <label className={labelCls}>Size label *</label>
            <input
              name="size_label"
              required
              defaultValue={variant?.size_label}
              placeholder="e.g. M, 32, 8.5, One Size"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Sort order</label>
            <input
              name="size_sort"
              type="number"
              defaultValue={variant?.size_sort ?? 0}
              className={inputCls}
            />
          </div>
        </>
      )}
      <div>
        <label className={labelCls}>Stock</label>
        <input
          name="stock"
          type="number"
          min="0"
          defaultValue={variant?.stock ?? 0}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Low stock alert at</label>
        <input
          name="low_stock_threshold"
          type="number"
          min="0"
          defaultValue={variant?.low_stock_threshold ?? 5}
          className={inputCls}
        />
      </div>

      {showShoeFields && (
        <>
          <div>
            <label className={labelCls}>US size</label>
            <input name="us_size" defaultValue={variant?.us_size ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>EU size</label>
            <input name="eu_size" defaultValue={variant?.eu_size ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>UK size</label>
            <input name="uk_size" defaultValue={variant?.uk_size ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>MX size</label>
            <input name="mx_size" defaultValue={variant?.mx_size ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>JP size</label>
            <input name="jp_size" defaultValue={variant?.jp_size ?? ""} className={inputCls} />
          </div>
        </>
      )}

      <div className="flex items-end pb-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            name="is_default"
            defaultChecked={variant?.is_default ?? false}
          />
          Default variant
        </label>
      </div>

      {/* Shipping weight — spans 2 cols */}
      <div className="sm:col-span-2 md:col-span-3 pt-2 border-t border-stone-200">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-600 mb-2">
          Shipping weight <span className="font-normal text-stone-400">(optional — overrides product-level weight)</span>
        </p>
        <div className="flex gap-2 max-w-xs">
          <input
            name="weight_value"
            type="number"
            step="0.01"
            min="0"
            defaultValue={(() => {
              if (!variant?.weight_oz) return "";
              return variant.weight_oz >= 16
                ? (variant.weight_oz / 16).toFixed(2).replace(/\.?0+$/, "")
                : variant.weight_oz.toString();
            })()}
            placeholder="e.g. 2.5"
            className={inputCls}
          />
          <select
            name="weight_unit"
            defaultValue={variant?.weight_oz && variant.weight_oz >= 16 ? "lb" : "oz"}
            className="rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-500"
          >
            <option value="oz">oz</option>
            <option value="lb">lb</option>
          </select>
        </div>
      </div>

      {/* Color picker — spans full width */}
      <ColorPicker
        initialName={variant?.color_name}
        initialHex={variant?.color_hex}
      />
    </div>
  );
}

// ── StockStatusBadge ───────────────────────────────────────────────────────
function StockStatusBadge({ stock, threshold }: { stock: number; threshold: number }) {
  const status = getStockStatus(stock, threshold);
  if (status === "sold_out") {
    return (
      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">
        Sold out
      </span>
    );
  }
  if (status === "low_stock") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
        Low ({stock})
      </span>
    );
  }
  return (
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
      In stock ({stock})
    </span>
  );
}

// ── VariantManager ─────────────────────────────────────────────────────────
interface Props {
  productId: string;
  variants: ProductVariant[];
  sizeMode: SizeMode;
  audience: Audience;
}

export function VariantManager({ productId, variants, sizeMode, audience }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const showShoeFields = sizeMode === "shoes_us";
  const canonicalSizes = getCanonicalSizes({ audience, size_mode: sizeMode });

  function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setActionError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await upsertVariant(productId, formData);
      if (result.error) {
        setActionError(result.error);
      } else {
        setShowAddForm(false);
        router.refresh();
      }
    });
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>, variantId: string) {
    e.preventDefault();
    setActionError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("variant_id", variantId);
    startTransition(async () => {
      const result = await upsertVariant(productId, formData);
      if (result.error) {
        setActionError(result.error);
      } else {
        setEditingId(null);
        router.refresh();
      }
    });
  }

  function handleDelete(variantId: string) {
    if (!confirm("Delete this variant? This cannot be undone.")) return;
    setActionError(null);
    startTransition(async () => {
      const result = await deleteVariant(variantId, productId);
      if (result.error) {
        setActionError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  const sorted = [...variants].sort((a, b) => a.size_sort - b.size_sort);

  return (
    <div className="panel p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Variants
        </h2>
        <button
          type="button"
          onClick={() => { setShowAddForm(true); setEditingId(null); }}
          disabled={isPending}
          className="text-sm text-stone-700 underline underline-offset-2 hover:text-stone-900 disabled:opacity-60"
        >
          + Add variant
        </button>
      </div>

      {/* Colors on this product — summary of assigned colors */}
      {(() => {
        const seen = new Set<string>();
        const productColors: { name: string; hex: string | null }[] = [];
        for (const v of sorted) {
          if (v.color_name && !seen.has(v.color_name)) {
            seen.add(v.color_name);
            productColors.push({ name: v.color_name, hex: v.color_hex ?? null });
          }
        }
        return (
          <div className="rounded border border-stone-200 bg-stone-50 px-3 py-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500">
              Colors on this product
            </p>
            {productColors.length === 0 ? (
              <p className="text-xs text-stone-400">
                No colors assigned yet. Open or add a variant below to set its color.
              </p>
            ) : (
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {productColors.map((c) => (
                  <div key={c.name} className="flex items-center gap-1.5">
                    <span
                      className="h-4 w-4 shrink-0 border border-stone-200"
                      style={{ backgroundColor: c.hex ?? "#e7e5e4" }}
                    />
                    <span className="text-xs text-stone-700">{c.name}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-stone-400">
              Color is set per variant — edit a variant below to change it.
            </p>
          </div>
        );
      })()}

      {actionError && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {sorted.length === 0 && !showAddForm && (
        <p className="text-sm text-stone-400">No variants yet. Add one above.</p>
      )}

      <div className="space-y-2">
        {sorted.map((v) =>
          editingId === v.id ? (
            <form
              key={v.id}
              onSubmit={(e) => handleEditSubmit(e, v.id)}
              className="space-y-3 rounded border border-stone-300 bg-stone-50 p-4"
            >
              <VariantFields variant={v} showShoeFields={showShoeFields} canonicalSizes={canonicalSizes} />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded bg-stone-900 px-3 py-1.5 text-xs text-white hover:bg-stone-700 disabled:opacity-60"
                >
                  {isPending ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div
              key={v.id}
              className="flex items-center justify-between rounded border border-stone-200 px-4 py-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {v.color_hex && (
                    <span
                      className="h-3.5 w-3.5 shrink-0 border border-stone-200"
                      style={{ backgroundColor: v.color_hex }}
                    />
                  )}
                  <p className="text-sm font-medium text-stone-900">
                    {v.size_label}
                    {v.color_name ? ` · ${v.color_name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StockStatusBadge stock={v.stock} threshold={v.low_stock_threshold} />
                  {v.is_default && (
                    <span className="text-[10px] text-stone-400">Default</span>
                  )}
                  {showShoeFields && v.us_size && (
                    <span className="text-[10px] text-stone-400">US {v.us_size}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => { setEditingId(v.id); setShowAddForm(false); }}
                  disabled={isPending}
                  className="text-xs text-stone-600 underline underline-offset-2 hover:text-stone-900 disabled:opacity-60"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(v.id)}
                  disabled={isPending}
                  className="text-xs text-red-500 underline underline-offset-2 hover:text-red-700 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="space-y-3 rounded border border-stone-300 bg-stone-50 p-4"
        >
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-stone-500">
            New variant
          </p>
          <VariantFields showShoeFields={showShoeFields} canonicalSizes={canonicalSizes} />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-stone-900 px-3 py-1.5 text-xs text-white hover:bg-stone-700 disabled:opacity-60"
            >
              {isPending ? "Adding…" : "Add variant"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
