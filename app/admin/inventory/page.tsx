export const dynamic = "force-dynamic";

import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { InventoryClient, type InventoryProduct } from "./inventory-client";

export default async function AdminInventoryPage() {
  const supabase = createServerSupabaseClient();

  const { data: allProducts } = await supabase
    .from("products")
    .select(
      "id, name_en, slug, category, size_mode, base_price_cents, featured, is_active, is_archived, created_at, updated_at, variants:product_variants(stock, low_stock_threshold)"
    )
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

      <InventoryClient products={(allProducts ?? []) as InventoryProduct[]} />
    </section>
  );
}
