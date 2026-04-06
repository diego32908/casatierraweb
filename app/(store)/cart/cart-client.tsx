"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { BackLink } from "@/components/shell/back-link";
import { formatPrice } from "@/lib/utils";
import { loadPromo, isSubscribed } from "@/lib/promo";

interface Props {
  flatShippingCents: number;
  priorityShippingCents: number;
  freeThresholdCents: number;
}

export function CartClient({ flatShippingCents, priorityShippingCents, freeThresholdCents }: Props) {
  const { items, totalItems, subtotalCents, removeItem, setQty } = useCart();

  const [savedPromoCode, setSavedPromoCode] = useState<string | null>(null);
  const [shippingOption, setShippingOption] = useState<"standard" | "priority" | "pickup">("standard");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const promo = loadPromo();
    if (isSubscribed(promo) && promo.promoCode) setSavedPromoCode(promo.promoCode);
  }, []);

  // ── Shipping calc (mirrors computeShippingCents + checkout form) ──────────
  const qualifiesForFreeShipping =
    shippingOption === "standard" && subtotalCents >= freeThresholdCents;
  const shippingCents =
    shippingOption === "pickup" ? 0
    : shippingOption === "priority" ? priorityShippingCents
    : qualifiesForFreeShipping ? 0
    : flatShippingCents;
  const estimatedTotal = subtotalCents + shippingCents;

  // ── Direct-to-Stripe checkout ─────────────────────────────────────────────
  function handleCheckout() {
    setError(null);
    startTransition(async () => {
      try {
        const freshPromo = loadPromo();
        const discountCode =
          isSubscribed(freshPromo) && freshPromo.promoCode
            ? freshPromo.promoCode
            : undefined;

        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fulfillment: shippingOption === "pickup" ? "pickup" : "shipping",
            shippingSpeed: shippingOption === "pickup" ? undefined : shippingOption,
            discountCode,
            items: items.map((item) => ({
              productId: item.product_id,
              variantId: item.variant_id ?? "",
              quantity: item.quantity,
            })),
          }),
        });

        const data = await res.json() as {
          url?: string;
          error?: string;
          removedItems?: { productId: string; variantId: string }[];
        };

        if (!res.ok || data.error) {
          setError(data.error ?? "Unable to start checkout. Please try again.");
          return;
        }

        // Remove any items the server flagged as out of stock from local cart
        if (data.removedItems?.length) {
          for (const removed of data.removedItems) {
            removeItem(`${removed.productId}::${removed.variantId || "none"}`);
          }
        }

        if (data.url) window.location.href = data.url;
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center gap-7 px-4 text-center">
        <ShoppingBag className="h-9 w-9 text-stone-200" strokeWidth={1.25} />
        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-700">Your bag is empty</p>
          <p className="text-xs text-stone-400">Add something you love.</p>
        </div>
        <Link
          href="/shop"
          className="mt-1 inline-block rounded-full border border-stone-900 px-7 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-stone-900 transition-colors hover:bg-stone-900 hover:text-white"
        >
          Explore the Collection
        </Link>
      </div>
    );
  }

  // ── Cart ──────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-16 md:px-8">
      <div className="mb-8">
        <BackLink fallback="/shop" />
      </div>

      {/* Page header */}
      <div className="mb-12 flex items-baseline justify-between border-b border-stone-200 pb-5">
        <h1 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          Your Bag
        </h1>
        <span className="text-xs text-stone-400">
          {totalItems === 1 ? "1 item" : `${totalItems} items`}
        </span>
      </div>

      <div className="grid gap-8 md:gap-16 lg:grid-cols-[1fr_296px]">
        {/* ── Line items ────────────────────────────────────────────────── */}
        <div className="space-y-0">
          {items.map((item) => (
            <div
              key={item.key}
              className="group flex gap-4 md:gap-6 border-b border-stone-100 py-5 md:py-7 first:border-t first:border-stone-100"
            >
              {/* Thumbnail */}
              <Link
                href={`/products/${item.slug}`}
                className="shrink-0"
                tabIndex={-1}
                aria-hidden
              >
                <div className="h-[120px] w-[90px] overflow-hidden border border-stone-200 bg-stone-100 transition-opacity hover:opacity-80">
                  {item.primary_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.primary_image_url}
                      alt={item.product_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[9px] uppercase tracking-[0.14em] text-stone-400">
                      No image
                    </div>
                  )}
                </div>
              </Link>

              {/* Details */}
              <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                {/* Top row: name + remove */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1.5">
                    <Link
                      href={`/products/${item.slug}`}
                      className="block text-sm font-medium text-stone-900 hover:underline"
                    >
                      {item.product_name}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-400">
                      {item.selected_color_name && (
                        <span className="flex items-center gap-1.5">
                          {item.selected_color_hex && (
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full border border-stone-200"
                              style={{ backgroundColor: item.selected_color_hex }}
                            />
                          )}
                          {item.selected_color_name}
                        </span>
                      )}
                      {item.selected_color_name && item.selected_size && (
                        <span className="text-stone-300">·</span>
                      )}
                      {item.selected_size && <span>Size {item.selected_size}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.key)}
                    className="shrink-0 p-2 text-stone-300 transition-colors hover:text-stone-700"
                    aria-label={`Remove ${item.product_name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Bottom row: qty + price */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQty(item.key, item.quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-400 transition-colors hover:border-stone-400 hover:text-stone-700"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center text-sm text-stone-700">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(item.key, item.quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-400 transition-colors hover:border-stone-400 hover:text-stone-700"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-medium text-stone-900">
                      {formatPrice(item.price_cents * item.quantity)}
                    </span>
                    {item.quantity > 1 && (
                      <p className="text-[11px] text-stone-400">
                        {formatPrice(item.price_cents)} each
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Order summary + CTA ───────────────────────────────────────── */}
        <div className="lg:pt-0">
          <div className="border border-stone-100 bg-white px-6 py-8">

            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-400 mb-5">
              Order Summary
            </p>

            {/* Promo badge */}
            {savedPromoCode && (
              <div className="mb-5 flex items-center gap-2 rounded border border-stone-200 bg-stone-50 px-3 py-2">
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-stone-500" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2.5 8.5l4 4 7-8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-[11px] text-stone-600">
                  Discount <span className="font-mono font-semibold tracking-wide">{savedPromoCode}</span> applied automatically
                </p>
              </div>
            )}

            {/* Shipping selector */}
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-3">Shipping</p>
              <div className="space-y-2">
                {([
                  {
                    value: "standard" as const,
                    label: "Standard",
                    desc: qualifiesForFreeShipping ? "Free" : formatPrice(flatShippingCents),
                    sub: "5–8 business days",
                  },
                  {
                    value: "priority" as const,
                    label: "Priority",
                    desc: formatPrice(priorityShippingCents),
                    sub: "2–3 business days",
                  },
                  {
                    value: "pickup" as const,
                    label: "Local Pickup",
                    desc: "Free",
                    sub: "Pomona, CA",
                  },
                ]).map(({ value, label, desc, sub }) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 hover:bg-stone-50"
                  >
                    <input
                      type="radio"
                      name="shipping_option"
                      value={value}
                      checked={shippingOption === value}
                      onChange={() => setShippingOption(value)}
                      className="shrink-0 accent-stone-900"
                    />
                    <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <span className="text-sm text-stone-800">{label}</span>
                        <span className="ml-1.5 text-[11px] text-stone-400">{sub}</span>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-stone-700">{desc}</span>
                    </div>
                  </label>
                ))}
              </div>
              {shippingOption === "standard" && !qualifiesForFreeShipping && (
                <p className="mt-2 px-2 text-[11px] text-stone-400">
                  Free on orders {formatPrice(freeThresholdCents)}+
                </p>
              )}
            </div>

            {/* Line totals */}
            <div className="space-y-2 border-t border-stone-100 pt-5">
              <div className="flex justify-between">
                <span className="text-sm text-stone-500">Subtotal</span>
                <span className="text-sm font-medium text-stone-900">{formatPrice(subtotalCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-stone-500">Shipping</span>
                <span className="text-sm text-stone-500">
                  {shippingCents === 0 ? "Free" : formatPrice(shippingCents)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-stone-500">Tax</span>
                <span className="text-sm text-stone-400">Calculated at checkout</span>
              </div>
            </div>

            {/* Estimated total */}
            <div className="mt-4 flex justify-between border-t border-stone-200 pt-4">
              <span style={{ fontSize: 15 }} className="font-medium text-stone-900">Estimated total</span>
              <span style={{ fontSize: 15 }} className="font-semibold text-stone-900">{formatPrice(estimatedTotal)}</span>
            </div>
            <p className="mt-1 text-right text-[11px] text-stone-400">Excludes tax</p>

            {error && (
              <p className="mt-4 text-xs text-red-600 leading-relaxed">{error}</p>
            )}

            {/* CTA */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isPending}
              className="mt-6 w-full rounded-full bg-stone-900 py-4 text-sm font-medium tracking-wide text-white transition-colors hover:bg-stone-700 disabled:opacity-60"
            >
              {isPending ? "Redirecting to Stripe…" : "Checkout"}
            </button>

            <p className="mt-3 text-center text-[11px] text-stone-400">
              Secured by Stripe
            </p>

            <Link
              href="/shop"
              className="mt-4 block text-center text-xs uppercase tracking-wide text-stone-400 transition-colors hover:text-stone-700"
            >
              Continue Shopping
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
}
