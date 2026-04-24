"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useWishlist } from "@/components/wishlist/wishlist-context";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ProductCard } from "@/components/product/product-card";
import type { ProductCardData } from "@/components/product/product-card";

export default function WishlistPage() {
  const { ids, hydrated } = useWishlist();
  const [products, setProducts] = useState<ProductCardData[]>([]);
  // `loaded` only becomes true after the FIRST completed fetch or confirmed-empty check.
  // This prevents the empty-state from flashing before the fetch starts.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Wait until localStorage has been read into context
    if (!hydrated) return;

    if (ids.length === 0) {
      // Confirmed empty — no fetch needed
      setProducts([]);
      setLoaded(true);
      return;
    }

    // Fetch the saved products; keep existing products visible while re-fetching.
    (async () => {
      try {
        const { data, error } = await supabaseBrowser
          .from("products")
          .select(
            "id, slug, name_en, name_es, base_price_cents, compare_at_price_cents, primary_image_url, variants:product_variants(color_name, color_hex)"
          )
          .in("id", ids)
          .eq("is_active", true)
          .eq("is_archived", false);

        if (error) {
          console.error("[Wishlist] fetch error — message:", error.message, "| code:", error.code, "| details:", error.details, "| hint:", error.hint);
        }
        setProducts((data ?? []) as ProductCardData[]);
        setLoaded(true);
      } catch (err) {
        console.error("[Wishlist] unexpected error:", err);
        setLoaded(true);
      }
    })();
  }, [ids, hydrated]);

  const showEmpty = loaded && products.length === 0;
  const showGrid  = loaded && products.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-12">
      <header className="mb-10 flex items-baseline justify-between border-b border-stone-200 pb-6">
        <h1 className="font-serif text-4xl text-stone-900">Saved</h1>
        {showGrid && (
          <p className="text-xs text-stone-400 uppercase tracking-[0.18em]">
            {products.length} {products.length === 1 ? "item" : "items"}
          </p>
        )}
      </header>

      {/* Empty state — only after confirmed no items */}
      {showEmpty && (
        <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
          <Heart className="h-8 w-8 text-stone-200" strokeWidth={1.25} />
          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-700">Nothing saved yet</p>
            <p className="text-xs text-stone-400">
              Tap the heart on any product to save it here.
            </p>
          </div>
          <Link
            href="/"
            className="mt-1 text-[11px] uppercase tracking-[0.22em] text-stone-900 underline underline-offset-4 decoration-1 transition-opacity hover:opacity-60"
          >
            Browse the collection
          </Link>
        </div>
      )}

      {/* Product grid */}
      {showGrid && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
