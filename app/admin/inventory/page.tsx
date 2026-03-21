import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminInventoryPage() {
  const supabase = createServerSupabaseClient();

  const { data: products } = await supabase
    .from("products")
    .select("*");

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Inventory</h1>
        <p className="mt-2 text-sm text-stone-500">
          Manage products, variants, stock, low-stock flags, and featured placement.
        </p>
      </header>

      <div className="panel p-6">
        <p className="text-sm text-stone-600">
          V3 base only: table, filters, CSV import, duplicate product flow, and image ordering come next.
        </p>
      </div>

      <div className="panel p-6">
        <h2 className="mb-4 text-xl font-semibold">Products</h2>

        {!products?.length ? (
          <p className="text-sm text-stone-500">No products found.</p>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div key={product.id} className="border-b py-3">
                <p className="font-medium">{product.name_en}</p>
                <p className="text-sm text-stone-500">
                  ${(product.base_price_cents / 100).toFixed(2)}
                </p>
                <p className="text-xs text-stone-400">{product.slug}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}