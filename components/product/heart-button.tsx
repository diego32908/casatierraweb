"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useWishlist } from "@/components/wishlist/wishlist-context";

interface Props {
  productId: string;
  className?: string;
  size?: number;
}

const COLOR = {
  unsaved: "#78716C",   // stone-500 warm — legible on both light and dark images
  hover:   "#44403C",   // stone-700 warm — clear hover intent
  saved:   "#B52020",   // deep red — visually obvious, not neon, not maroon
};

export function HeartButton({ productId, className = "", size = 18 }: Props) {
  const { has, toggle } = useWishlist();
  const [hovered, setHovered] = useState(false);
  const saved = has(productId);

  return (
    <button
      type="button"
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`cursor-pointer ${className}`}
      style={{
        lineHeight: 0,
        padding: "6px",
        background: "rgba(255,255,255,0.90)",
        borderRadius: "50%",
        boxShadow: "0 1px 6px rgba(0,0,0,0.16)",
      }}
    >
      <Heart
        strokeWidth={1.5}
        style={{
          width: size,
          height: size,
          fill: saved ? COLOR.saved : "transparent",
          stroke: saved ? COLOR.saved : hovered ? COLOR.hover : COLOR.unsaved,
          transform: hovered && !saved ? "scale(1.1)" : "scale(1)",
          transition: "fill 160ms ease, stroke 160ms ease, transform 160ms ease",
          display: "block",
        }}
      />
    </button>
  );
}
