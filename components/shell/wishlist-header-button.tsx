"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlist } from "@/components/wishlist/wishlist-context";

// Matches product card/detail saved color exactly
const SAVED_RED = "#B52020";

export function WishlistHeaderButton() {
  const { count } = useWishlist();
  const [hovered, setHovered] = useState(false);
  const hasSaved = count > 0;

  return (
    <Link
      href="/wishlist"
      aria-label="Wishlist"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ lineHeight: 0 }}
    >
      <Heart
        strokeWidth={1.5}
        style={{
          width: 18,
          height: 18,
          fill: hasSaved ? SAVED_RED : "transparent",
          stroke: hasSaved ? SAVED_RED : "currentColor",
          transform: hovered ? "scale(1.08)" : "scale(1)",
          transition: "fill 160ms ease, stroke 160ms ease, transform 160ms ease",
          display: "block",
        }}
      />
    </Link>
  );
}
