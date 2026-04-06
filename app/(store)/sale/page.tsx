import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product/product-card";
import { BackLink } from "@/components/shell/back-link";

export const metadata = { title: "Sale — Tierra Oaxaca" };

export default async function SalePage() {
  const supabase = createServerSupabaseClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, slug, name_en, name_es, base_price_cents, compare_at_price_cents, primary_image_url, variants:product_variants(color_name, color_hex)")
    .eq("is_active", true)
    .not("compare_at_price_cents", "is", null)
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-12">
      <div className="mb-8"><BackLink fallback="/" /></div>
      <header className="mb-10 flex items-baseline justify-between border-b border-stone-200 pb-6">
        <h1 className="font-serif text-4xl text-stone-900">Sale</h1>
        <p className="text-xs text-stone-400 uppercase tracking-[0.18em]">
          {products?.length ?? 0} items
        </p>
      </header>

      {!products?.length ? (
        <p className="text-sm text-stone-500 py-20 text-center">No sale items at this time.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
