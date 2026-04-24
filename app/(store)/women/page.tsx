import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/shell/back-link";
import { CategoryFilterSort } from "@/components/store/category-filter-sort";
import type { FilterableProduct } from "@/components/store/category-filter-sort";

export const metadata = { title: "Women — Tierra Oaxaca" };

export default async function WomenPage() {
  const supabase = createServerSupabaseClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, slug, name_en, name_es, base_price_cents, compare_at_price_cents, primary_image_url, created_at, category, variants:product_variants(color_name, color_hex, size_label)")
    .eq("is_active", true)
    .in("category", ["women", "dress", "skirt"])
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-12">
      <div className="mb-8"><BackLink fallback="/" /></div>
      <header className="mb-10 border-b border-stone-200 pb-6">
        <h1 className="font-serif text-4xl text-stone-900">Women</h1>
      </header>

      <CategoryFilterSort
        initialProducts={(products ?? []) as FilterableProduct[]}
        showSizeFilter
        showSubcatTabs
      />
    </div>
  );
}
