"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProductWithVariants, ProductVariant } from "@/types/store";
import { formatPrice } from "@/lib/utils";
import { getStockStatus } from "@/lib/stock";
import { sizeSelectorLabel } from "@/lib/sizing";
import { SizeSelectorBox } from "./size-selector-box";
import { SizeFitBox } from "./size-fit-box";

// Pill shown for one_size products — replaces the size selector
function OneSizeStockPill({ stock, threshold }: { stock: number; threshold: number }) {
  const status = getStockStatus(stock, threshold);
  if (status === "sold_out") {
    return (
      <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-500">
        Sold out
      </span>
    );
  }
  if (status === "low_stock") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
        Only {stock} left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
      One Size · In Stock
    </span>
  );
}

export function ProductDetail({ product }: { product: ProductWithVariants }) {
  const isNone = product.size_mode === "none";
  const isOneSize = product.size_mode === "one_size";

  // Show the interactive size selector only for proper multi-variant sizing modes
  const showSelector =
    !isNone && !isOneSize && product.variants.length > 0;

  // Pre-select a variant whenever one exists (covers one_size and sized modes)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(() => {
    if (product.variants.length === 0) return null;
    return (
      product.variants.find((v) => v.is_default)?.id ??
      product.variants[0]?.id ??
      null
    );
  });

  const selectedVariant = useMemo<ProductVariant | undefined>(
    () =>
      selectedVariantId
        ? product.variants.find((v) => v.id === selectedVariantId)
        : undefined,
    [product.variants, selectedVariantId]
  );

  const activePrice = selectedVariant?.price_override_cents ?? product.base_price_cents;

  // Explicit stock rules applied at the variant level
  const stockStatus = selectedVariant
    ? getStockStatus(selectedVariant.stock, selectedVariant.low_stock_threshold)
    : null;

  const canAddToBag =
    isNone
      ? true
      : !selectedVariant
      ? false
      : stockStatus !== "sold_out";

  function getButtonLabel(): string {
    if (isNone) return "Add to Bag";
    if (isOneSize) {
      return stockStatus === "sold_out" ? "Sold Out" : "Add to Bag";
    }
    // Multi-size: no variants exist yet
    if (product.variants.length === 0) return "Out of Stock";
    // Multi-size: variant not chosen yet → audience-aware prompt
    if (!selectedVariant) return sizeSelectorLabel(product);
    return stockStatus === "sold_out" ? "Sold Out" : "Add to Bag";
  }

  return (
    <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr]">
      {/* ── Left: image ── */}
      <section className="space-y-3">
        <div className="aspect-[4/5] overflow-hidden border border-stone-200 bg-stone-100">
          {product.primary_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.primary_image_url}
              alt={product.name_en}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] uppercase tracking-[0.22em] text-stone-400">
              No image
            </div>
          )}
        </div>

        {/* Thumbnail strip — only when multiple images exist */}
        {product.image_urls?.length > 1 && (
          <div className="flex gap-2">
            {product.image_urls.slice(0, 5).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`${product.name_en} view ${i + 1}`}
                className="h-16 w-16 border border-stone-200 object-cover"
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Right: info ── */}
      <section className="space-y-6">
        {/* Breadcrumb */}
        <nav
          aria-label="breadcrumb"
          className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-stone-500"
        >
          <Link href="/shop" className="transition-colors hover:text-stone-900">
            Shop
          </Link>
          <span>/</span>
          <span className="capitalize">{product.category.replace(/_/g, " ")}</span>
        </nav>

        {/* Name + price */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
            {product.name_en}
          </h1>
          {product.compare_at_price_cents &&
          product.compare_at_price_cents > activePrice ? (
            <div className="flex items-center gap-3">
              {/* Original — subtle */}
              <p className="text-sm text-stone-400 line-through">
                {formatPrice(product.compare_at_price_cents)}
              </p>
              {/* Unified black sale block */}
              <span className="inline-flex items-baseline gap-2 bg-stone-900 px-3 py-1.5 text-white">
                <span className="text-sm font-semibold">
                  -{Math.round((1 - activePrice / product.compare_at_price_cents) * 100)}%
                </span>
                <span className="text-sm font-semibold">{formatPrice(activePrice)}</span>
              </span>
            </div>
          ) : (
            <p className="text-xl text-stone-900">{formatPrice(activePrice)}</p>
          )}
        </div>

        {/* Description */}
        {product.description_en && (
          <p className="text-sm leading-7 text-stone-600">{product.description_en}</p>
        )}

        {/* One-size stock pill — shown instead of a size selector */}
        {isOneSize && selectedVariant && (
          <div>
            <OneSizeStockPill
              stock={selectedVariant.stock}
              threshold={selectedVariant.low_stock_threshold}
            />
          </div>
        )}

        {/* Size selector + fit box — only for multi-size products */}
        {showSelector && (
          <div className="space-y-3">
            <SizeSelectorBox
              product={product}
              variants={product.variants}
              selectedVariantId={selectedVariantId}
              onSelectVariant={setSelectedVariantId}
            />
            <SizeFitBox product={product} selectedVariant={selectedVariant ?? null} />
          </div>
        )}

        {/* Fit box for one_size — shows fit_style / fit_note / charts if present */}
        {isOneSize && (
          <SizeFitBox product={product} selectedVariant={selectedVariant ?? null} />
        )}

        {/* Add to bag */}
        <button
          className="h-12 w-full rounded-full bg-stone-900 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
          disabled={!canAddToBag}
        >
          {getButtonLabel()}
        </button>

        {/* Material */}
        {product.material && (
          <div className="border-t border-stone-200 pt-5">
            <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-stone-500">
              Materials
            </p>
            <p className="text-sm text-stone-600">{product.material}</p>
          </div>
        )}

        {/* Care */}
        {product.care_notes && (
          <div className="border-t border-stone-200 pt-5">
            <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-stone-500">
              Care
            </p>
            <p className="text-sm text-stone-600">{product.care_notes}</p>
          </div>
        )}
      </section>
    </div>
  );
}
