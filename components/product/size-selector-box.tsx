"use client";

import { useState } from "react";
import { Bell, Ruler } from "lucide-react";
import type { Product, ProductVariant } from "@/types/store";
import { cn } from "@/lib/utils";
import { getStockStatus } from "@/lib/stock";
import { getCanonicalSizes, sizeSelectorLabel } from "@/lib/sizing";
import { joinWaitlist } from "@/app/actions/waitlist";

interface Props {
  product: Product;
  variants: ProductVariant[];
  selectedVariantId: string | null;
  onSelectVariant: (variantId: string | null) => void;
  onScrollToChart?: () => void;
}

interface ColorEntry {
  name: string;
  hex: string | null;
}

type SizeEntryStatus = "in_stock" | "low_stock" | "sold_out" | "missing";

interface SizeEntry {
  label: string;
  sort: number;
  status: SizeEntryStatus;
  variant: ProductVariant | null;
}

function buildSizeEntries(
  product: Product,
  variants: ProductVariant[], // all variants for this product (all colors)
  selectedColor: string | null,
  hasColors: boolean
): SizeEntry[] {
  const canonicalSizes = getCanonicalSizes(product);

  // Variants filtered to the currently selected color
  const scopedVariants =
    hasColors && selectedColor
      ? variants.filter((v) => v.color_name === selectedColor)
      : variants;

  if (!canonicalSizes) {
    // numeric / custom / one_size — render scoped variants only, no canonical ladder
    return scopedVariants
      .slice()
      .sort((a, b) => a.size_sort - b.size_sort)
      .map((v) => ({
        label: v.size_label,
        sort: v.size_sort,
        status: getStockStatus(v.stock, v.low_stock_threshold) as SizeEntryStatus,
        variant: v,
      }));
  }

  // Universe = all size labels found on any variant of this product (any color)
  const allLabels = new Set(variants.map((v) => v.size_label.trim()));
  const isShoes = product.size_mode === "shoes_us";

  // Determine which canonical entries to render:
  // • Shoes: only sizes the product actually carries (any color)
  // • Apparel base: always render (even if no variant exists yet)
  // • Apparel optional (XS / 2XL+): only render if admin created a variant for it
  const relevantCanonical = canonicalSizes.filter((cs) => {
    if (isShoes) return allLabels.has(cs.label);
    return !cs.optional || allLabels.has(cs.label);
  });

  // Lookup for the selected-color variants
  const scopedByLabel = new Map<string, ProductVariant>();
  for (const v of scopedVariants) scopedByLabel.set(v.size_label.trim(), v);

  return relevantCanonical.map((cs) => {
    const v = scopedByLabel.get(cs.label) ?? null;
    const status: SizeEntryStatus = !v
      ? "missing"
      : (getStockStatus(v.stock, v.low_stock_threshold) as SizeEntryStatus);
    return { label: cs.label, sort: cs.sort, status, variant: v };
  });
}

// Light palette colors that need a visible border on white backgrounds
const LIGHT_HEX = new Set(["#f5f5f5", "#f5f0e8", "#ede8d8", "#d4c5a9"]);

function getDistinctColors(variants: ProductVariant[]): ColorEntry[] {
  const seen = new Set<string>();
  const colors: ColorEntry[] = [];
  for (const v of variants) {
    if (v.color_name && !seen.has(v.color_name)) {
      seen.add(v.color_name);
      colors.push({ name: v.color_name, hex: v.color_hex ?? null });
    }
  }
  return colors;
}

// ── Inline notify component — lives on the sold-out size row ─────────────────

function SizeRowNotify({
  productId,
  variantId,
  productName,
  variantLabel,
}: {
  productId: string;
  variantId: string | null;
  productName?: string;
  variantLabel?: string | null;
}) {
  const [state, setState] = useState<"idle" | "open" | "loading" | "done" | "error">("idle");
  const [email, setEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || state === "loading") return;
    setState("loading");
    const result = await joinWaitlist(productId, variantId, email, productName, variantLabel);
    if (result.error) {
      setState("error");
    } else {
      setState("done");
    }
  }

  if (state === "done") {
    return (
      <span className="text-xs text-stone-400">We'll notify you</span>
    );
  }

  if (state === "error") {
    return (
      <span className="text-xs text-red-500">Try again</span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setState(state === "open" ? "idle" : "open")}
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 transition-colors hover:text-stone-800"
      >
        <Bell className="h-3.5 w-3.5" />
        <span>Get notified</span>
      </button>

      {(state === "open" || state === "loading") && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="email"
            required
            autoFocus
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-32 border-b border-stone-300 bg-transparent pb-0.5 text-xs placeholder-stone-400 focus:border-stone-700 focus:outline-none"
          />
          <button
            type="submit"
            disabled={state === "loading"}
            className="text-xs text-stone-600 transition-colors hover:text-stone-900 disabled:opacity-40"
          >
            {state === "loading" ? "…" : "→"}
          </button>
        </form>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SizeSelectorBox({
  product,
  variants,
  selectedVariantId,
  onSelectVariant,
  onScrollToChart,
}: Props) {
  const distinctColors = getDistinctColors(variants);
  const hasColors = distinctColors.length >= 1;
  const isMultiColor = distinctColors.length > 1;

  const [selectedColor, setSelectedColor] = useState<string | null>(() => {
    // Single-color: auto-select so size panel opens immediately
    if (distinctColors.length === 1) return distinctColors[0].name;
    // Multi-color: start empty; user picks a color to reveal sizes
    return null;
  });

  function handleColorSelect(colorName: string) {
    if (!isMultiColor) return;
    // Direct select — no toggle; clicking the active color keeps it active
    setSelectedColor(colorName);
    const colorVariants = variants.filter((v) => v.color_name === colorName);
    if (colorVariants.length === 1) {
      onSelectVariant(colorVariants[0].id);
    } else {
      onSelectVariant(null);
    }
  }

  // Size panel is revealed once a color is chosen (or products have no colors)
  const showSizeRows = !hasColors || selectedColor !== null;

  const sizeEntries = showSizeRows
    ? buildSizeEntries(product, variants, selectedColor, hasColors)
    : [];

  return (
    <section className="panel">
      {/* ── Color section ── */}
      {hasColors && (
        <div className="border-b border-stone-200 px-5 py-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              Color
            </span>
            {selectedColor && (
              <span className="text-sm font-medium text-stone-900">
                {selectedColor}
              </span>
            )}
          </div>

          {isMultiColor ? (
            /* Interactive swatch picker — all colors selectable */
            <div className="flex flex-wrap gap-2.5">
              {distinctColors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleColorSelect(c.name)}
                  title={c.name}
                  className={cn(
                    "h-9 w-9 shrink-0 transition-all",
                    selectedColor === c.name
                      ? "ring-2 ring-stone-900 ring-offset-2"
                      : "ring-1 ring-transparent hover:ring-stone-500 hover:ring-offset-1"
                  )}
                  style={{
                    backgroundColor: c.hex ?? "#d6d3d1",
                    border:
                      c.hex && LIGHT_HEX.has(c.hex)
                        ? "1px solid #d6d3d1"
                        : "1px solid transparent",
                  }}
                />
              ))}
            </div>
          ) : (
            /* Single-color: non-interactive display */
            <div className="flex items-center gap-2">
              <span
                className="h-9 w-9 shrink-0 border border-stone-200"
                style={{ backgroundColor: distinctColors[0].hex ?? "#d6d3d1" }}
              />
              <span className="text-sm text-stone-600">{distinctColors[0].name}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Prompt shown before any color is chosen (multi-color only) ── */}
      {isMultiColor && !selectedColor && (
        <div className="px-5 py-4 text-sm text-stone-500">
          Select a color above to see available sizes.
        </div>
      )}

      {/* ── Size header — visible once color is chosen ── */}
      {showSizeRows && (
        <div className="flex items-start justify-between gap-4 border-b border-stone-300 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">{sizeSelectorLabel(product)}</h2>
            {product.size_mode === "shoes_us" && (
              <p className="text-xs text-stone-400 mt-0.5">US sizing</p>
            )}
            {product.fit_note && (
              <p className="text-sm text-stone-500 mt-0.5">{product.fit_note}</p>
            )}
          </div>
          {onScrollToChart && (
            <button
              type="button"
              onClick={onScrollToChart}
              className="inline-flex shrink-0 items-center gap-1.5 rounded border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-500 transition-colors hover:border-stone-300 hover:bg-white hover:text-stone-700"
            >
              <Ruler className="h-3.5 w-3.5" />
              <span>Size chart</span>
            </button>
          )}
        </div>
      )}

      {/* ── Size rows ── */}
      {showSizeRows && (
        <div className="grid">
          {sizeEntries.map((entry) => {
              const isUnavailable = entry.status === "sold_out" || entry.status === "missing";
              const isLow = entry.status === "low_stock";
              const isSelected = entry.variant?.id === selectedVariantId && !isUnavailable;

              return (
                <div
                  key={entry.label}
                  className={cn(
                    "grid grid-cols-[1fr_auto] items-start gap-3 border-b border-stone-200 px-5 py-4 last:border-b-0",
                    isSelected && "bg-stone-50"
                  )}
                >
                  {/* Left: size label + stock hint */}
                  <button
                    onClick={() => {
                      if (!isUnavailable && entry.variant) {
                        onSelectVariant(entry.variant.id);
                      }
                    }}
                    disabled={isUnavailable}
                    className={cn(
                      "flex items-center justify-between text-left pt-0.5",
                      isUnavailable ? "cursor-not-allowed" : "cursor-pointer"
                    )}
                  >
                    <div className="space-y-1">
                      {/* Size label — crossed out when unavailable */}
                      <div
                        className={cn(
                          "text-base font-medium",
                          isUnavailable
                            ? "line-through text-stone-400"
                            : "text-stone-900"
                        )}
                      >
                        {entry.label}
                      </div>
                      {isLow && (
                        <div className="text-sm text-amber-700">
                          Only {entry.variant!.stock} left
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <span className="rounded-full border border-stone-900 px-2 py-0.5 text-[11px] uppercase tracking-[0.18em]">
                        Selected
                      </span>
                    )}
                  </button>

                  {/* Right: notify for unavailable, stock count for low */}
                  {isUnavailable ? (
                    <SizeRowNotify
                      productId={product.id}
                      variantId={entry.variant?.id ?? null}
                      productName={product.name_en}
                      variantLabel={
                        [selectedColor, entry.label].filter(Boolean).join(" · ") || undefined
                      }
                    />
                  ) : (
                    <span className="pt-0.5 text-sm text-stone-400">
                      {isLow ? `${entry.variant!.stock} left` : ""}
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </section>
  );
}
