import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/shell/back-link";
import { CategoryFilterSort } from "@/components/store/category-filter-sort";
import type { FilterableProduct } from "@/components/store/category-filter-sort";
import { fanOutByColor } from "@/lib/product-fanout";

export const metadata = { title: "Sale — Tierra Oaxaca" };

export default async function SalePage() {
  const supabase = createServerSupabaseClient();

  const { data: allProducts } = await supabase
    .from("products")
    .select("id, slug, name_en, name_es, base_price_cents, compare_at_price_cents, primary_image_url, created_at, category, variants:product_variants(id, color_name, color_hex, image_url, price_override_cents, is_default, size_label)")
    .eq("is_active", true)
    .eq("is_archived", false)
    .order("sort_order", { ascending: true });

  // Fan-out first, then keep only cards that have an active sale price.
  // This catches both product-level compare_at and variant-level price overrides.
  const saleCards = fanOutByColor(allProducts ?? []).filter(
    (p) => p.compare_at_price_cents != null && p.compare_at_price_cents > p.base_price_cents
  );

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-12">
      <div className="mb-8"><BackLink fallback="/" /></div>
      <header className="mb-10 border-b border-stone-200 pb-6">
        <h1 className="font-serif text-4xl text-stone-900">Sale</h1>
      </header>

      <CategoryFilterSort
        initialProducts={saleCards as FilterableProduct[]}
        showSizeFilter
        showSubcatTabs
        subcatMode="audience"
      />
    </div>
  );
}
