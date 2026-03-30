"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";

export function CartBagButton() {
  const { totalItems } = useCart();

  return (
    <Link href="/cart" aria-label="Cart" className="inline-flex items-center justify-center">
      <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center">
        <ShoppingCart className="h-[18px] w-[18px]" strokeWidth={1.25} />
        {totalItems > 0 && (
          <span
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              transform: "translateX(35%) translateY(-35%)",
              width: 16,
              height: 16,
              minWidth: 16,
              maxWidth: 16,
              minHeight: 16,
              maxHeight: 16,
              borderRadius: 9999,
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              fontSize: 9,
              fontWeight: 600,
              color: "#ffffff",
              background: "#0c0a09",
            }}
          >
            {totalItems > 9 ? "9+" : totalItems}
          </span>
        )}
      </span>
    </Link>
  );
}
