import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { getStockStatus } from "@/lib/stock";

type VariantStub = { stock: number; low_stock_threshold: number };

function aggregateStockChip({
  sizeMode,
  variants,
}: {
  sizeMode: string;
  variants: VariantStub[];
}) {
  if (sizeMode === "none") {
    return (
      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-400">
        Not tracked
      </span>
    );
  }
  if (!variants.length) {
    return (
      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-400">
        No variants
      </span>
    );
  }
  const statuses = variants.map((v) => getStockStatus(v.stock, v.low_stock_threshold));
  const allOut = statuses.every((s) => s === "sold_out");
  const anyLow = statuses.some((s) => s === "low_stock");
  if (allOut) {
    return (
      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">
        Sold out
      </span>
    );
  }
  if (anyLow) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
        Low stock
      </span>
    );
  }
  return (
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
      In stock
    </span>
  );
}

export default async function AdminInventoryPage() {
  const supabase = createServerSupabaseClient();

  const { data: products } = await supabase
    .from("products")
    .select("*, variants:product_variants(stock, low_stock_threshold)")
    .order("sort_order")
    .order("created_at", { ascending: false });

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Inventory</h1>
          <p className="mt-2 text-sm text-stone-500">
            Manage products, variants, stock, and featured placement.
          </p>
        </div>
        <Link
          href="/admin/inventory/new"
          className="shrink-0 rounded bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          + New Product
        </Link>
      </header>

      <div className="panel">
        {!products?.length ? (
          <div className="p-6">
            <p className="text-sm text-stone-500">
              No products yet.{" "}
              <Link
                href="/admin/inventory/new"
                className="underline underline-offset-2"
              >
                Add your first product.
              </Link>
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-200">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/admin/inventory/${product.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-medium text-stone-900">
                    {product.name_en}
                  </p>
                  <p className="text-xs text-stone-400">{product.slug}</p>
                </div>

                <div className="flex shrink-0 items-center gap-4 pl-4">
                  <div className="hidden text-right sm:block">
                    <p className="text-xs capitalize text-stone-500">
                      {product.category.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-stone-400">{product.size_mode}</p>
                  </div>

                  <p className="w-16 text-right text-sm text-stone-700">
                    {formatPrice(product.base_price_cents)}
                  </p>

                  <div className="flex items-center gap-2">
                    {aggregateStockChip({
                      sizeMode: product.size_mode,
                      variants: (product.variants as VariantStub[]) ?? [],
                    })}
                    {product.featured && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        Featured
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        product.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {product.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
