"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ProductWithVariants, ProductVariant } from "@/types/store";
import { formatPrice } from "@/lib/utils";
import { getStockStatus } from "@/lib/stock";
import { sizeSelectorLabel } from "@/lib/sizing";
import { SizeSelectorBox } from "./size-selector-box";
import { SizeChartSection } from "./size-chart-section";
import { useCart } from "@/components/cart/cart-context";
import { HeartButton } from "./heart-button";

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns a coherent audience + product-type label that matches the actual
 * size mode, preventing mismatches like "men's" breadcrumb with shoe sizing.
 */
function productAudienceLabel(product: ProductWithVariants): string | null {
  const { audience, size_mode, category } = product;

  const prefix: Record<string, string> = {
    mens: "Men's",
    womens: "Women's",
    kids: "Kids'",
    unisex: "",
  };
  const aud = prefix[audience] ?? "";

  if (size_mode === "shoes_us" || category === "shoes") {
    return aud ? `${aud} Footwear` : "Footwear";
  }
  if (category === "pottery") return "Pottery";
  if (category === "home_decor") return "Home";
  if (category === "accessories") {
    return aud ? `${aud} Accessories` : "Accessories";
  }
  // Apparel (men / women / kids categories)
  return aud || null;
}

// ── Sub-components ───────────────────────────────────────────────────────────

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

// ── Main component ───────────────────────────────────────────────────────────

export function ProductDetail({ product }: { product: ProductWithVariants }) {
  const { addItem } = useCart();
  const [addedToCart, setAddedToCart] = useState(false);
  const chartRef = useRef<HTMLElement>(null);

  function scrollToChart() {
    chartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const isNone = product.size_mode === "none";
  const isOneSize = product.size_mode === "one_size";

  const showSelector =
    !isNone && !isOneSize && product.variants.length > 0;

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
    if (addedToCart) return "Added to Bag";
    if (isNone) return "Add to Bag";
    if (isOneSize) {
      return stockStatus === "sold_out" ? "Sold Out" : "Add to Bag";
    }
    if (product.variants.length === 0) return "Out of Stock";
    if (!selectedVariant) return sizeSelectorLabel(product);
    return stockStatus === "sold_out" ? "Sold Out" : "Add to Bag";
  }

  function handleAddToBag() {
    if (!canAddToBag) return;
    addItem({
      product_id: product.id,
      variant_id: isNone ? null : (selectedVariant?.id ?? null),
      slug: product.slug,
      product_name: product.name_en,
      price_cents: activePrice,
      primary_image_url: product.primary_image_url ?? null,
      selected_color_name: isNone ? null : (selectedVariant?.color_name ?? null),
      selected_color_hex: isNone ? null : (selectedVariant?.color_hex ?? null),
      selected_size: isNone ? null : (selectedVariant?.size_label ?? null),
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }

  const audienceLabel = productAudienceLabel(product);

  // Show the "Size chart" button and lower chart section for products with
  // a canonical size context, or any product that has fit/style notes.
  const hasChartContent =
    product.size_mode === "alpha" ||
    product.size_mode === "kids" ||
    product.size_mode === "shoes_us" ||
    product.category === "shoes" ||
    !!product.fit_note ||
    !!product.fit_style;

  return (
    <>
      {/* ── Purchase area ── */}
      <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr]">
        {/* Left: image */}
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

        {/* Right: info */}
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

          {/* Name + audience label + price */}
          <div className="space-y-2">
            <div>
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
                  {product.name_en}
                </h1>
                <HeartButton
                  productId={product.id}
                  className="mt-2 shrink-0"
                  size={20}
                />
              </div>
              {audienceLabel && (
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-400">
                  {audienceLabel}
                </p>
              )}
            </div>
            {product.compare_at_price_cents &&
            product.compare_at_price_cents > activePrice ? (
              <div className="flex items-center gap-3">
                <p className="text-sm text-stone-400 line-through">
                  {formatPrice(product.compare_at_price_cents)}
                </p>
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

          {/* One-size stock pill */}
          {isOneSize && selectedVariant && (
            <div>
              <OneSizeStockPill
                stock={selectedVariant.stock}
                threshold={selectedVariant.low_stock_threshold}
              />
            </div>
          )}

          {/* Size selector with inline "Size chart" utility */}
          {showSelector && (
            <SizeSelectorBox
              product={product}
              variants={product.variants}
              selectedVariantId={selectedVariantId}
              onSelectVariant={setSelectedVariantId}
              onScrollToChart={hasChartContent ? scrollToChart : undefined}
            />
          )}

          {/* Add to bag */}
          <button
            className="h-12 w-full rounded-full bg-stone-900 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
            disabled={!canAddToBag}
            onClick={handleAddToBag}
          >
            {getButtonLabel()}
          </button>
        </section>
      </div>

      {/* ── Lower information section ── */}
      <div className="mt-20 divide-y divide-stone-200 border-t border-stone-200">
        {/* Size & Fit / Size Chart */}
        {hasChartContent && (
          <section ref={chartRef} className="py-12">
            <SizeChartSection product={product} variants={product.variants} />
          </section>
        )}

        {/* Shipping & Returns */}
        <section className="py-12">
          <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            Shipping &amp; Returns
          </h2>
          <div className="max-w-prose space-y-2 text-sm leading-7 text-stone-600">
            <p>Free standard shipping on orders over $150. Expedited options available at checkout.</p>
            <p>Standard delivery 5–8 business days within the US.</p>
            <p>Returns accepted within 30 days in original, unworn condition. Final sale items are not eligible for return.</p>
          </div>
        </section>

        {/* Materials */}
        <section className="py-12">
          <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            Materials
          </h2>
          {product.material || product.care_notes ? (
            <div className="max-w-prose space-y-2 text-sm leading-7 text-stone-600">
              {product.material && <p>{product.material}</p>}
              {product.care_notes && <p>{product.care_notes}</p>}
            </div>
          ) : (
            <p className="text-sm leading-7 text-stone-400">Material details coming soon.</p>
          )}
        </section>
      </div>
    </>
  );
}
