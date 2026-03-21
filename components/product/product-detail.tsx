"use client";

import { useMemo, useState } from "react";
import type { ProductWithVariants, ProductVariant } from "@/types/store";
import { formatPrice } from "@/lib/utils";
import { SizeSelectorBox } from "./size-selector-box";
import { SizeFitBox } from "./size-fit-box";

export function ProductDetail({ product }: { product: ProductWithVariants }) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants.find((v) => v.is_default)?.id ?? product.variants[0]?.id ?? null
  );

  const selectedVariant = useMemo<ProductVariant | undefined>(
    () => product.variants.find((v) => v.id === selectedVariantId),
    [product.variants, selectedVariantId]
  );

  const activePrice = selectedVariant?.price_override_cents ?? product.base_price_cents;

  return (
    <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-4">
        <div className="aspect-[4/5] overflow-hidden border border-stone-300 bg-white">
          {product.primary_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.primary_image_url}
              alt={product.name_en}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-stone-400">
              No image
            </div>
          )}
        </div>
      </section>

      <section className="space-y-8">
        <div className="space-y-2">
          <p className="upper-nav">{product.category}</p>
          <h1 className="text-4xl font-semibold tracking-tight">{product.name_en}</h1>
          <p className="text-xl">{formatPrice(activePrice)}</p>
          <p className="max-w-xl text-sm leading-6 text-stone-600">
            {product.description_en}
          </p>
        </div>

        <div className="space-y-4">
          <SizeSelectorBox
            product={product}
            variants={product.variants}
            selectedVariantId={selectedVariantId}
            onSelectVariant={setSelectedVariantId}
          />

          <SizeFitBox product={product} selectedVariant={selectedVariant ?? null} />
        </div>

        <button
          className="h-12 w-full rounded-full bg-stone-900 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-stone-300"
          disabled={!selectedVariant || selectedVariant.stock <= 0}
        >
          Add to Bag
        </button>
      </section>
    </div>
  );
}
