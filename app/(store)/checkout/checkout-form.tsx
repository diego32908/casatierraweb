"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";
import { formatPrice } from "@/lib/utils";
import { BackLink } from "@/components/shell/back-link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { CheckoutPromo } from "@/components/popups/checkout-promo";
import { loadPromo } from "@/lib/promo";
import type { FulfillmentType } from "@/types/store";

const inputCls =
  "w-full border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors";
const labelCls = "block text-[11px] uppercase tracking-[0.16em] text-stone-500 mb-1.5";

interface Props {
  flatShippingCents: number;
  priorityShippingCents: number;
  freeThresholdCents: number;
  promoCode: string | null;
  discountText: string | null;
}

export function CheckoutForm({
  flatShippingCents,
  priorityShippingCents,
  freeThresholdCents,
  promoCode,
  discountText,
}: Props) {
  const { items, subtotalCents, removeItem } = useCart();
  const [isPending, startTransition] = useTransition();
  const [error, setError]     = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [shippingOption, setShippingOption] = useState<"standard" | "priority" | "pickup">("standard");
  const [form, setForm] = useState({
    customerName: "",
    email: "",
    phone: "",
  });
  // Non-null when user is authenticated — email is locked to their auth email
  const [lockedEmail, setLockedEmail] = useState<string | null>(null);
  // Promo code from localStorage (set when user subscribed to newsletter)
  const [savedPromoCode, setSavedPromoCode] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setLockedEmail(user.email);
        setForm((prev) => ({ ...prev, email: user.email! }));
      }
    });
    // Read promo code saved during newsletter signup
    const promo = loadPromo();
    if (promo.status === "subscribed" && promo.promoCode) {
      setSavedPromoCode(promo.promoCode);
    }
  }, []);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <p className="text-sm text-stone-500">Your bag is empty.</p>
        <Link
          href="/shop"
          className="text-xs uppercase tracking-[0.14em] text-stone-700 underline-offset-4 hover:underline"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setWarning(null);

    startTransition(async () => {
      try {
        // Re-read promo code at submit time in case user just subscribed via CheckoutPromo
        const freshPromo = loadPromo();
        const discountCode =
          freshPromo.status === "subscribed" && freshPromo.promoCode
            ? freshPromo.promoCode
            : undefined;

        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: form.customerName.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim() || undefined,
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
          setError(data.error ?? "Checkout failed. Please try again.");
          return;
        }

        // Remove any items the server flagged as unavailable from the local cart.
        // This cleans up stale localStorage entries so they don't reappear.
        if (data.removedItems?.length) {
          for (const removed of data.removedItems) {
            const cartItemKey = `${removed.productId}::${removed.variantId || "none"}`;
            removeItem(cartItemKey);
          }
          const count = data.removedItems.length;
          setWarning(
            count === 1
              ? "1 unavailable item was removed from your cart."
              : `${count} unavailable items were removed from your cart.`
          );
          // Brief pause so the user reads the warning before being redirected
          await new Promise((r) => setTimeout(r, 1800));
        }

        // Cart is cleared on the success page after payment is confirmed —
        // NOT here, so the cart survives a cancel/back from Stripe's page.
        if (data.url) window.location.href = data.url;
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  // Shipping: mirrors computeShippingCents() in /lib/shipping.ts exactly.
  const fulfillment: FulfillmentType = shippingOption === "pickup" ? "pickup" : "shipping";
  const qualifiesForFreeShipping =
    shippingOption === "standard" && subtotalCents >= freeThresholdCents;
  const shippingCents =
    shippingOption === "pickup" ? 0
    : shippingOption === "priority" ? priorityShippingCents
    : qualifiesForFreeShipping ? 0
    : flatShippingCents;
  const totalCents = subtotalCents + shippingCents;

  // How many cents away from free standard shipping
  const amountUntilFreeShipping =
    shippingOption === "standard" && !qualifiesForFreeShipping
      ? freeThresholdCents - subtotalCents
      : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-16 md:px-8">
      <div className="mb-10">
        <BackLink fallback="/cart" />
      </div>

      <h1 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500 mb-12">
        Checkout
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-8 md:gap-12 lg:grid-cols-[1fr_300px]">

          {/* ── Left: customer info ── */}
          <div className="space-y-10">

            {/* Contact */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-stone-400 mb-5">
                Contact
              </p>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Full Name</label>
                  <input
                    required
                    className={inputCls}
                    value={form.customerName}
                    onChange={(e) => set("customerName", e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Email
                    {lockedEmail && (
                      <span className="ml-2 normal-case tracking-normal text-stone-400">
                        (linked to your account)
                      </span>
                    )}
                  </label>
                  <input
                    required
                    type="email"
                    className={inputCls}
                    style={lockedEmail ? { backgroundColor: "#fafaf9", color: "#78716c" } : undefined}
                    value={form.email}
                    onChange={(e) => !lockedEmail && set("email", e.target.value)}
                    readOnly={!!lockedEmail}
                    placeholder="jane@example.com"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className={labelCls}>Phone <span className="normal-case text-stone-400">(optional)</span></label>
                  <input
                    type="tel"
                    className={inputCls}
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
            </div>

            {/* Inline promo — shown only to non-subscribed users */}
            <CheckoutPromo
              promoCode={promoCode}
              discountText={discountText}
              onSubscribed={(code) => setSavedPromoCode(code)}
            />

            {/* Fulfillment */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-stone-400 mb-5">
                Shipping
              </p>
              <div className="space-y-3">
                {([
                  {
                    value: "standard" as const,
                    label: "Standard Shipping",
                    description: qualifiesForFreeShipping
                      ? `Free · Ships within 5–8 business days`
                      : `${formatPrice(flatShippingCents)} · Ships within 5–8 business days · Free on orders ${formatPrice(freeThresholdCents)}+`,
                  },
                  {
                    value: "priority" as const,
                    label: "Priority Shipping",
                    description: `${formatPrice(priorityShippingCents)} · Ships within 2–3 business days`,
                  },
                  {
                    value: "pickup" as const,
                    label: "Local Pickup",
                    description: "Free — pick up at 1600 E Holt Ave, Pomona, CA",
                  },
                ] as const).map(({ value, label, description }) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-start gap-3 border border-stone-200 px-4 py-3 transition-colors hover:border-stone-400"
                    style={{ borderColor: shippingOption === value ? "#1c1917" : undefined }}
                  >
                    <input
                      type="radio"
                      name="shipping_option"
                      value={value}
                      checked={shippingOption === value}
                      onChange={() => setShippingOption(value)}
                      className="mt-0.5 shrink-0 accent-stone-900"
                    />
                    <div>
                      <p className="text-sm font-medium text-stone-900">{label}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{description}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Free standard shipping nudge */}
              {amountUntilFreeShipping > 0 && (
                <p className="mt-3 text-xs text-stone-400">
                  Add {formatPrice(amountUntilFreeShipping)} more for free standard shipping.
                </p>
              )}
              {qualifiesForFreeShipping && (
                <p className="mt-3 text-xs text-stone-500">
                  Your order qualifies for free standard shipping.
                </p>
              )}
            </div>

            {/* Shipping address and tax are collected by Stripe at checkout */}
            {fulfillment === "shipping" && (
              <div className="border border-stone-100 bg-stone-50 px-4 py-3">
                <p className="text-xs text-stone-500">
                  Your shipping address and applicable taxes will be collected
                  securely on the next step.
                </p>
              </div>
            )}
          </div>

          {/* ── Right: order summary ── */}
          <div className="lg:pt-0">
            <div className="border border-stone-100 bg-white px-6 py-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-400 mb-5">
                Order Summary
              </p>

              {/* Items */}
              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-stone-700 truncate">{item.product_name}</p>
                      {(item.selected_color_name || item.selected_size) && (
                        <p className="text-[11px] text-stone-400">
                          {[item.selected_color_name, item.selected_size && `Size ${item.selected_size}`]
                            .filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-stone-700">{formatPrice(item.price_cents * item.quantity)}</p>
                      {item.quantity > 1 && (
                        <p className="text-[11px] text-stone-400">×{item.quantity}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-stone-100 my-4" />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-stone-500">Subtotal</span>
                  <span className="text-sm font-medium text-stone-900">{formatPrice(subtotalCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-stone-500">Shipping</span>
                  {shippingCents === 0 ? (
                    <span className="text-sm font-medium text-stone-500">Free</span>
                  ) : (
                    <span className="text-sm text-stone-400">{formatPrice(shippingCents)}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-stone-500">Tax</span>
                  <span className="text-sm text-stone-400">Calculated at checkout</span>
                </div>
              </div>

              <div className="flex justify-between mt-4 pt-4 border-t border-stone-200">
                <span style={{ fontSize: 15 }} className="font-medium text-stone-900">Estimated total</span>
                <span style={{ fontSize: 15 }} className="font-semibold text-stone-900">
                  {formatPrice(totalCents)}
                </span>
              </div>
              <p className="mt-1 text-right text-[11px] text-stone-400">Excludes tax</p>

              {warning && (
                <p className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 leading-relaxed">
                  {warning}
                </p>
              )}
              {error && (
                <p className="mt-4 text-xs text-red-600 leading-relaxed">{error}</p>
              )}

              {savedPromoCode && (
                <div className="mt-4 flex items-center gap-2 rounded border border-stone-200 bg-stone-50 px-3 py-2">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-stone-500" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2.5 8.5l4 4 7-8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-[11px] text-stone-600">
                    Discount <span className="font-mono font-semibold tracking-wide">{savedPromoCode}</span> will be applied automatically
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="mt-6 w-full rounded-full bg-stone-900 py-4 text-sm font-medium tracking-wide text-white transition-colors hover:bg-stone-700 disabled:opacity-60"
              >
                {isPending ? "Redirecting to Stripe…" : "Pay with Stripe"}
              </button>

              <p className="mt-3 text-center text-[11px] text-stone-400">
                Secured by Stripe. You&apos;ll be redirected to complete payment.
              </p>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
