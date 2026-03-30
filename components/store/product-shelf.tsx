import Link from "next/link";
import { ProductCard, type ProductCardData } from "@/components/product/product-card";

interface ProductShelfProps {
  eyebrow: string;
  products: ProductCardData[];
  viewAllHref?: string;
  viewAllLabel?: string;
}

/**
 * A reusable product grid section — eyebrow label, 4-column grid, optional "view all" link.
 * Used for Best Sellers, New Arrivals, and any future curated shelf (Adornment, El Hogar, etc.).
 */
export function ProductShelf({
  eyebrow,
  products,
  viewAllHref,
  viewAllLabel = "View All",
}: ProductShelfProps) {
  if (!products.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-10 md:px-16 py-16">
      <div className="mb-8 flex items-baseline justify-between border-b border-divide pb-4">
        <p className="eyebrow">{eyebrow}</p>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-[11px] uppercase tracking-[0.22em] text-stone-400 transition-colors duration-150 hover:text-ink"
          >
            {viewAllLabel}
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-4 md:gap-x-6 md:gap-y-16">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
