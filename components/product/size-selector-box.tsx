"use client";

import { Bell } from "lucide-react";
import type { Product, ProductVariant } from "@/types/store";
import { cn } from "@/lib/utils";

interface Props {
  product: Product;
  variants: ProductVariant[];
  selectedVariantId: string | null;
  onSelectVariant: (variantId: string) => void;
}

export function SizeSelectorBox({
  product,
  variants,
  selectedVariantId,
  onSelectVariant,
}: Props) {
  return (
    <section className="panel">
      <div className="flex items-center justify-between border-b border-stone-300 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">Select a size</h2>
          <p className="text-sm text-stone-500">True to size</p>
        </div>
        <button className="text-sm font-medium text-stone-600">Size and fit</button>
      </div>

      <div className="grid">
        {variants
          .sort((a, b) => a.size_sort - b.size_sort)
          .map((variant) => {
            const isSelected = variant.id === selectedVariantId;
            const isOut = variant.stock <= 0;
            const isLow = variant.stock > 0 && variant.stock <= variant.low_stock_threshold;

            return (
              <div
                key={variant.id}
                className={cn(
                  "grid grid-cols-[1fr_auto] items-center gap-3 border-b border-stone-200 px-5 py-4",
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
                    <div className="text-base font-medium">{variant.size_label}</div>
                    {isOut ? (
                      <div className="text-sm text-stone-500">Out of stock. Get notified.</div>
                    ) : isLow ? (
                      <div className="text-sm text-amber-700">Low stock</div>
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
                    className="inline-flex items-center gap-2 text-sm text-stone-700"
                    aria-label={`Get notified for ${product.name_en} ${variant.size_label}`}
                  >
                    <Bell className="h-4 w-4" />
                    <span>Get Notified</span>
                  </button>
                ) : (
                  <span className="text-sm text-stone-400">
                    {variant.stock <= 5 ? `${variant.stock} left` : ""}
                  </span>
                )}
              </div>
            );
          })}
      </div>
    </section>
  );
}
