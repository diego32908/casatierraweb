"use client";

import { useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";
import { saveCart } from "@/lib/cart";
import { formatPrice } from "@/lib/utils";

interface DisplayItem {
  name: string;
  variant: string | null;
  quantity: number;
  totalCents: number;
  imageUrl: string | null;
}

interface ShippingAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}

interface Props {
  orderId: string | null;
  sessionId: string;
  customerName: string;
  email: string;
  fulfillment: "shipping" | "pickup";
  items: DisplayItem[];
  totalCents: number;
  shippingCents: number;
  taxCents: number;
  shippingAddress: ShippingAddress | null;
}

export function SuccessClient({
  orderId,
  sessionId,
  customerName,
  email,
  fulfillment,
  items,
  totalCents,
  shippingCents,
  taxCents,
  shippingAddress,
}: Props) {
  const { clearCart } = useCart();

  // useLayoutEffect fires synchronously before any useEffect, including
  // CartProvider's INIT effect that reads localStorage. Writing [] here
  // ensures INIT hydrates an empty cart instead of the just-purchased one.
  useLayoutEffect(() => {
    saveCart([]);
  }, []);

  // Also dispatch CLEAR to the in-memory reducer as a safety net.
  useEffect(() => {
    clearCart();
  }, [clearCart]);

  // Display order reference: short UUID if order exists, else last 8 chars of Stripe session
  const orderRef = orderId
    ? `#${orderId.slice(0, 8).toUpperCase()}`
    : `#${sessionId.replace(/^cs_(test|live)_/, "").slice(-8).toUpperCase()}`;

  const firstName = customerName.split(" ")[0] || null;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 md:px-8">

      {/* ── Header ── */}
      <div className="mb-10 text-center">
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            border: "1px solid #e7e5e4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <svg
            viewBox="0 0 16 16"
            style={{ width: 18, height: 18, color: "#57534e" }}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path d="M2.5 8.5l4 4 7-8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <p className="text-[10px] uppercase tracking-[0.22em] text-stone-400 mb-2">
          Order Confirmed
        </p>
        <h1 className="text-xl font-medium text-stone-900 mb-1">
          {firstName ? `Thank you, ${firstName}.` : "Thank you."}
        </h1>
        <p className="text-sm text-stone-500 leading-relaxed">
          {email
            ? <>A confirmation is on its way to{" "}<span className="font-medium text-stone-700">{email}</span>.</>
            : "A confirmation email is on its way."
          }
        </p>
        <p className="mt-2 text-xs text-stone-400">
          If you don&apos;t see it in a few minutes, check your spam or promotions folder.
        </p>
      </div>

      {/* ── Order summary card ── */}
      <div className="border border-stone-100 bg-white">

        {/* Order ref + fulfillment */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Order</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-stone-900">{orderRef}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Fulfillment</p>
            <p className="mt-0.5 text-sm capitalize text-stone-700">{fulfillment}</p>
          </div>
        </div>

        {/* Line items */}
        {items.length > 0 && (
          <div className="px-6 py-4 space-y-2 border-b border-stone-100">
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-14 w-11 shrink-0 object-cover bg-stone-100"
                  />
                )}
                <div className="flex flex-1 items-start justify-between gap-4 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm text-stone-700 truncate">{item.name}</p>
                    {item.variant && (
                      <p className="text-[11px] text-stone-400">{item.variant}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm text-stone-500">{formatPrice(item.totalCents)}</p>
                    {item.quantity > 1 && (
                      <p className="text-[11px] text-stone-400">×{item.quantity}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        <div className="px-6 py-4 space-y-2 border-b border-stone-100">
          {fulfillment === "shipping" && (
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Shipping</span>
              <span className="text-stone-500">
                {shippingCents === 0 ? "Free" : formatPrice(shippingCents)}
              </span>
            </div>
          )}
          {taxCents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Tax</span>
              <span className="text-stone-500">{formatPrice(taxCents)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-stone-100 pt-2 text-sm font-medium">
            <span className="text-stone-900">Total paid</span>
            <span className="text-stone-900">{formatPrice(totalCents)}</span>
          </div>
        </div>

        {/* Delivery info */}
        {fulfillment === "shipping" && shippingAddress?.line1 && (
          <div className="px-6 py-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-1.5">
              Ship to
            </p>
            <p className="text-sm text-stone-600 leading-relaxed">
              {shippingAddress.line1}
              {shippingAddress.line2 ? `, ${shippingAddress.line2}` : ""}
              {", "}
              {shippingAddress.city}, {shippingAddress.state}{" "}
              {shippingAddress.postalCode}
            </p>
          </div>
        )}
        {fulfillment === "pickup" && (
          <div className="px-6 py-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-1.5">
              Pick up at
            </p>
            <p className="text-sm text-stone-600">1600 E Holt Ave Ste D24-D26, Pomona, CA 91767</p>
            <p className="mt-1 text-[11px] text-stone-400">
              We&apos;ll contact you when your order is ready.
            </p>
          </div>
        )}
      </div>

      {/* ── Brand note ── */}
      <p className="mt-8 text-center text-[12px] text-stone-600 leading-relaxed px-2">
        As an immigrant-owned brand, Tierra Oaxaca exists between two homes &mdash; our
        roots in Mexico and our life here. Each piece carries that story forward. Thank
        you for being part of it.
      </p>

      {/* ── Actions ── */}
      <div className="mt-6 flex flex-col items-center gap-5">
        <Link
          href="/account"
          className="text-xs uppercase tracking-[0.14em] text-stone-500 underline underline-offset-4 hover:text-stone-900 transition-colors"
        >
          View order history
        </Link>
        <Link
          href="/shop"
          className="inline-block rounded-full border border-stone-900 px-8 py-3 text-xs font-medium uppercase tracking-[0.14em] text-stone-900 transition-colors hover:bg-stone-900 hover:text-white"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
