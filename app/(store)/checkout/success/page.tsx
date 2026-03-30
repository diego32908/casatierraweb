"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";

export default function CheckoutSuccessPage() {
  const { clearCart } = useCart();

  // Clear cart once the customer lands here — payment is confirmed at this point.
  // Stripe redirects here only after checkout.session.completed.
  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4 text-center">
      {/* Checkmark */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "1px solid #e7e5e4",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 16 16" style={{ width: 18, height: 18, color: "#57534e" }} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M2.5 8.5l4 4 7-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="space-y-3 max-w-sm">
        <p className="text-[10px] uppercase tracking-[0.22em] text-stone-400">
          Order Confirmed
        </p>
        <h1 className="text-xl font-medium text-stone-900">
          Thank you for your order.
        </h1>
        <p className="text-sm text-stone-500 leading-relaxed">
          You&apos;ll receive a confirmation once your order is ready.
          Check your email for details.
        </p>
      </div>

      <Link
        href="/shop"
        className="mt-2 inline-block rounded-full border border-stone-900 px-8 py-3 text-xs font-medium uppercase tracking-[0.14em] text-stone-900 transition-colors hover:bg-stone-900 hover:text-white"
      >
        Continue Shopping
      </Link>
    </div>
  );
}
