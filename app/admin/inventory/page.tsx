export const dynamic = "force-dynamic";

import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { getStockStatus } from "@/lib/stock";
import { InventoryFilters } from "./inventory-filters";
import { ProductRowActions } from "./product-row-actions";

type VariantStub = { stock: number; low_stock_threshold: number };

type Product = {
  id: string;
  name_en: string;
  slug: string;
  category: string;
  size_mode: string;
  base_price_cents: number;
  featured: boolean;
  is_active: boolean;
  variants: VariantStub[];
};

type StockFilter = "" | "in_stock" | "low" | "out";

function getProductStockStatus(product: Product): "in_stock" | "low_stock" | "sold_out" | "untracked" {
  if (product.size_mode === "none") return "untracked";
  if (!product.variants.length) return "sold_out";
  const statuses = product.variants.map((v) => getStockStatus(v.stock, v.low_stock_threshold));
  if (statuses.every((s) => s === "sold_out")) return "sold_out";
  if (statuses.some((s) => s === "low_stock")) return "low_stock";
  return "in_stock";
}

function StockChip({ product }: { product: Product }) {
  const status = getProductStockStatus(product);
  if (status === "untracked") {
    return (
      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-400">
        Not tracked
      </span>
    );
  }
  if (!product.variants.length) {
    return (
      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-400">
        No variants
      </span>
    );
  }
  if (status === "sold_out") {
    return (
      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">
        Sold out
      </span>
    );
  }
  if (status === "low_stock") {
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

interface PageProps {
  searchParams: Promise<{ stock?: string; active?: string }>;
}

export default async function AdminInventoryPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const supabase = createServerSupabaseClient();

  const { data: allProducts } = await supabase
    .from("products")
    .select("id, name_en, slug, category, size_mode, base_price_cents, featured, is_active, variants:product_variants(stock, low_stock_threshold)")
    .order("sort_order")
    .order("created_at", { ascending: false });

  const products = (allProducts ?? []) as Product[];

  // Counts for chips
  const counts = {
    all:      products.length,
    inStock:  products.filter((p) => getProductStockStatus(p) === "in_stock").length,
    lowStock: products.filter((p) => getProductStockStatus(p) === "low_stock").length,
    soldOut:  products.filter((p) => getProductStockStatus(p) === "sold_out").length,
    active:   products.filter((p) => p.is_active).length,
    inactive: products.filter((p) => !p.is_active).length,
  };

  // Apply filters
  const stockFilter = (filters.stock ?? "") as StockFilter;
  const activeFilter = filters.active ?? "";

  const filtered = products.filter((p) => {
    if (stockFilter === "in_stock" && getProductStockStatus(p) !== "in_stock") return false;
    if (stockFilter === "low"      && getProductStockStatus(p) !== "low_stock") return false;
    if (stockFilter === "out"      && getProductStockStatus(p) !== "sold_out")  return false;
    if (activeFilter === "yes"     && !p.is_active) return false;
    if (activeFilter === "no"      && p.is_active)  return false;
    return true;
  });

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

      <InventoryFilters counts={counts} />

      <div className="panel">
        {!filtered.length ? (
          <div className="p-6">
            <p className="text-sm text-stone-500">
              {products.length === 0 ? (
                <>No products yet. <Link href="/admin/inventory/new" className="underline underline-offset-2">Add your first product.</Link></>
              ) : (
                "No products match these filters."
              )}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-200">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors"
              >
                <Link
                  href={`/admin/inventory/${product.id}`}
                  className="min-w-0 flex-1 space-y-0.5"
                >
                  <p className="truncate text-sm font-medium text-stone-900">
                    {product.name_en}
                  </p>
                  <p className="text-xs text-stone-400">{product.slug}</p>
                </Link>

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
                    <StockChip product={product} />
                    {product.featured && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        Featured
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        product.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {product.is_active ? "Active" : "Private"}
                    </span>
                  </div>

                  <ProductRowActions id={product.id} isActive={product.is_active} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
