"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import type { Product, ProductVariant } from "@/types/store";
import { cn } from "@/lib/utils";
import { getStockStatus } from "@/lib/stock";
import { sizeSelectorLabel } from "@/lib/sizing";

interface Props {
  product: Product;
  variants: ProductVariant[];
  selectedVariantId: string | null;
  onSelectVariant: (variantId: string | null) => void;
}

interface ColorEntry {
  name: string;
  hex: string | null;
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

export function SizeSelectorBox({
  product,
  variants,
  selectedVariantId,
  onSelectVariant,
}: Props) {
  const distinctColors = getDistinctColors(variants);
  // Show color section whenever at least one color is assigned
  const hasColors = distinctColors.length >= 1;
  const isMultiColor = distinctColors.length > 1;

  const [selectedColor, setSelectedColor] = useState<string | null>(() => {
    // Auto-select the only color for single-color products
    if (distinctColors.length === 1) return distinctColors[0].name;
    return null;
  });

  function handleColorSelect(colorName: string) {
    // Multi-color products: toggle; single-color products: no-op (always selected)
    if (!isMultiColor) return;
    const next = selectedColor === colorName ? null : colorName;
    setSelectedColor(next);

    if (next) {
      const colorVariants = variants.filter((v) => v.color_name === next);
      if (colorVariants.length === 1) {
        onSelectVariant(colorVariants[0].id);
      } else {
        onSelectVariant(null);
      }
    } else {
      onSelectVariant(null);
    }
  }

  // Variants to show in the size list
  const sizeVariants =
    hasColors && selectedColor
      ? variants.filter((v) => v.color_name === selectedColor)
      : variants;

  const showSizeRows =
    !hasColors || (selectedColor !== null && sizeVariants.length > 1);

  return (
    <section className="panel">
      {/* ── Color section ── */}
      {hasColors && (
        <div className="border-b border-stone-200 px-5 py-5 space-y-3">
          {/* Label + selected name */}
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
            /* Interactive swatch picker for multi-color products */
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
            /* Non-interactive display for single-color products */
            <div className="flex items-center gap-2">
              <span
                className="h-9 w-9 shrink-0 border border-stone-200"
                style={{
                  backgroundColor: distinctColors[0].hex ?? "#d6d3d1",
                }}
              />
              <span className="text-sm text-stone-600">
                {distinctColors[0].name}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Size header ── */}
      {showSizeRows && (
        <div className="flex items-center justify-between border-b border-stone-300 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">{sizeSelectorLabel(product)}</h2>
            {product.fit_note && (
              <p className="text-sm text-stone-500">{product.fit_note}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Size rows ── */}
      {showSizeRows && (
        <div className="grid">
          {sizeVariants
            .slice()
            .sort((a, b) => a.size_sort - b.size_sort)
            .map((variant) => {
              const isSelected = variant.id === selectedVariantId;
              const status = getStockStatus(
                variant.stock,
                variant.low_stock_threshold
              );
              const isOut = status === "sold_out";
              const isLow = status === "low_stock";

              return (
                <div
                  key={variant.id}
                  className={cn(
                    "grid grid-cols-[1fr_auto] items-center gap-3 border-b border-stone-200 px-5 py-4 last:border-b-0",
                    isSelected && "bg-stone-50"
                  )}
                >
                  <button
                    onClick={() => !isOut && onSelectVariant(variant.id)}
                    disabled={isOut}
                    className={cn(
                      "flex items-center justify-between text-left",
                      isOut && "cursor-not-allowed opacity-60"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="text-base font-medium">
                        {variant.size_label}
                      </div>
                      {isOut ? (
                        <div className="text-sm text-stone-400">Sold out</div>
                      ) : isLow ? (
                        <div className="text-sm text-amber-700">
                          Only {variant.stock} left
                        </div>
                      ) : null}
                    </div>

                    {isSelected && !isOut ? (
                      <span className="rounded-full border border-stone-900 px-2 py-0.5 text-[11px] uppercase tracking-[0.18em]">
                        Selected
                      </span>
                    ) : null}
                  </button>

                  {isOut ? (
                    <button
                      className="inline-flex items-center gap-2 text-sm text-stone-600 transition-colors hover:text-stone-900"
                      aria-label={`Get notified when ${product.name_en} ${variant.size_label} is back`}
                    >
                      <Bell className="h-4 w-4" />
                      <span>Notify me</span>
                    </button>
                  ) : (
                    <span className="text-sm text-stone-400">
                      {isLow ? `${variant.stock} left` : ""}
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* ── Auto-selected single variant (color-only product) ── */}
      {hasColors && selectedColor && !showSizeRows && (
        <div className="px-5 py-4 text-sm text-stone-600">
          One size available in{" "}
          <span className="font-medium text-stone-900">{selectedColor}</span>
          {" "}— added to selection.
        </div>
      )}

      {/* ── No color chosen yet (multi-color products) ── */}
      {isMultiColor && !selectedColor && (
        <div className="px-5 py-4 text-sm text-stone-500">
          Select a color above to see available sizes.
        </div>
      )}
    </section>
  );
}
