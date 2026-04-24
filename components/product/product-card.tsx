"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { HeartButton } from "./heart-button";
import { useLanguage, localize } from "@/lib/language";

type ColorStub = { color_name: string | null; color_hex: string | null };

export interface ProductCardData {
  id: string;
  slug: string;
  name_en: string;
  name_es?: string | null;
  base_price_cents: number;
  compare_at_price_cents: number | null;
  primary_image_url: string | null;
  variants?: ColorStub[];
}

// Hex fallbacks for color names that may not have a hex stored in the DB
const COLOR_HEX_FALLBACKS: Record<string, string> = {
  black:      "#1c1917",
  white:      "#fafaf9",
  cream:      "#fef9ef",
  ivory:      "#fffff0",
  beige:      "#f5f0e0",
  sand:       "#e8dcc8",
  natural:    "#f0ead8",
  taupe:      "#b5a99a",
  tan:        "#d2b48c",
  brown:      "#795548",
  rust:       "#b7410e",
  terracotta: "#c46437",
  burgundy:   "#722f37",
  wine:       "#6d2b3d",
  red:        "#c02828",
  pink:       "#f4a7b9",
  blush:      "#f2b5b5",
  coral:      "#ff6b6b",
  orange:     "#e8651a",
  yellow:     "#f5d042",
  mustard:    "#d4a017",
  olive:      "#6b7c3d",
  sage:       "#8aab7e",
  green:      "#2d6a4f",
  teal:       "#2a7f7f",
  blue:       "#2563eb",
  navy:       "#1e3a5f",
  indigo:     "#3730a3",
  purple:     "#7c3aed",
  lavender:   "#c4b5e8",
  grey:       "#9e9e9e",
  gray:       "#9e9e9e",
  charcoal:   "#4a4a4a",
  multicolor: "#d4a373",
};

// Light colors that need a visible border so the chip reads on a white background
const NEEDS_BORDER = new Set([
  "#f5f5f5", "#f5f0e8", "#ede8d8", "#d4c5a9",
  "#fafaf9", "#fef9ef", "#fffff0", "#f5f0e0",
  "#e8dcc8", "#f0ead8", "#f4a7b9", "#f2b5b5",
  "#f5d042", "#c4b5e8",
]);

function resolveHex(name: string, hex: string | null): string | null {
  if (hex) return hex;
  return COLOR_HEX_FALLBACKS[name.toLowerCase().trim()] ?? null;
}

function getDistinctColors(variants: ColorStub[]) {
  const seen = new Set<string>();
  const colors: { name: string; hex: string | null }[] = [];
  for (const v of variants) {
    if (v.color_name && !seen.has(v.color_name)) {
      seen.add(v.color_name);
      colors.push({ name: v.color_name, hex: v.color_hex ?? null });
    }
  }
  return colors;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const { locale } = useLanguage();
  const displayName = localize(product.name_en, product.name_es, locale);

  const onSale =
    product.compare_at_price_cents != null &&
    product.compare_at_price_cents > product.base_price_cents;

  const pctOff = onSale
    ? Math.round((1 - product.base_price_cents / product.compare_at_price_cents!) * 100)
    : 0;

  const colors = getDistinctColors(product.variants ?? []);
  // Show swatches for any product that has color data (single-color included)
  const showColors = colors.length >= 1;
  const visibleColors = colors.slice(0, 5);
  const overflow = colors.length - 5;

  return (
    <div className="group relative">
      <div className="relative aspect-[3/4] mb-3">
        <div className="absolute inset-0 overflow-hidden bg-stone-100">
          <Link href={`/products/${product.slug}`} className="block h-full w-full">
            {product.primary_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.primary_image_url}
                alt={displayName}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="h-full w-full bg-stone-200 transition-transform duration-500 group-hover:scale-105" />
            )}
          </Link>
        </div>
        <div style={{ position: "absolute", top: 10, right: 10, zIndex: 20 }}>
          <HeartButton productId={product.id} size={18} />
        </div>
      </div>

      <Link href={`/products/${product.slug}`} className="block">
        <p className="text-sm font-medium text-stone-900 leading-snug">{displayName}</p>

        {showColors && (
          <div className="mt-2 flex items-center gap-2">
            {visibleColors.map((c) => {
              const resolved = resolveHex(c.name, c.hex);
              const needsBorder = !resolved || NEEDS_BORDER.has(resolved.toLowerCase());
              return (
                <span
                  key={c.name}
                  title={c.name}
                  className="h-3.5 w-3.5 shrink-0"
                  style={{
                    backgroundColor: resolved ?? "#d6d3d1",
                    border: needsBorder ? "1px solid #d6d3d1" : "1px solid transparent",
                  }}
                />
              );
            })}
            {overflow > 0 && (
              <span className="text-[10px] text-stone-400 ml-0.5">+{overflow}</span>
            )}
          </div>
        )}

        <div className="mt-1.5 flex items-center gap-3">
          {onSale ? (
            <>
              <span className="text-[11px] text-stone-400 line-through">
                {formatPrice(product.compare_at_price_cents!)}
              </span>
              <span className="inline-flex items-baseline gap-2 bg-stone-900 px-2 py-0.5 text-white">
                <span className="text-xs font-semibold">-{pctOff}%</span>
                <span className="text-xs font-semibold">{formatPrice(product.base_price_cents)}</span>
              </span>
            </>
          ) : (
            <p className="text-sm text-stone-500">{formatPrice(product.base_price_cents)}</p>
          )}
        </div>
      </Link>
    </div>
  );
}
