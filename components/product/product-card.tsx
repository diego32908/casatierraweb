import Link from "next/link";
import { formatPrice } from "@/lib/utils";

type ColorStub = { color_name: string | null; color_hex: string | null };

export interface ProductCardData {
  id: string;
  slug: string;
  name_en: string;
  base_price_cents: number;
  compare_at_price_cents: number | null;
  primary_image_url: string | null;
  variants?: ColorStub[];
}

// Light colors that need a visible border so the chip reads on a white background
const NEEDS_BORDER = new Set(["#f5f5f5", "#f5f0e8", "#ede8d8", "#d4c5a9"]);

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
  const onSale =
    product.compare_at_price_cents != null &&
    product.compare_at_price_cents > product.base_price_cents;

  const pctOff = onSale
    ? Math.round((1 - product.base_price_cents / product.compare_at_price_cents!) * 100)
    : 0;

  const colors = getDistinctColors(product.variants ?? []);
  const showColors = colors.length > 1;
  const visibleColors = colors.slice(0, 5);
  const overflow = colors.length - 5;

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-stone-100 mb-3">
        {product.primary_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.primary_image_url}
            alt={product.name_en}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-stone-200 transition-transform duration-500 group-hover:scale-105" />
        )}

      </div>

      {/* Name */}
      <p className="text-sm font-medium text-stone-900 leading-snug">{product.name_en}</p>

      {/* Color chips — square, shown when 2+ distinct colors */}
      {showColors && (
        <div className="mt-2 flex items-center gap-2">
          {visibleColors.map((c) => (
            <span
              key={c.name}
              title={c.name}
              className="h-3.5 w-3.5 shrink-0"
              style={{
                backgroundColor: c.hex ?? "#d6d3d1",
                border: c.hex && NEEDS_BORDER.has(c.hex) ? "1px solid #d6d3d1" : "1px solid transparent",
              }}
            />
          ))}
          {overflow > 0 && (
            <span className="text-[10px] text-stone-400 ml-0.5">+{overflow}</span>
          )}
        </div>
      )}

      {/* Price */}
      <div className="mt-1.5 flex items-center gap-3">
        {onSale ? (
          <>
            {/* Original — very subtle */}
            <span className="text-[11px] text-stone-400 line-through">
              {formatPrice(product.compare_at_price_cents!)}
            </span>
            {/* Unified black sale block */}
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
  );
}
