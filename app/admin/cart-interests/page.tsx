export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/server-auth";

type Row = {
  product_id: string;
  product_name: string | null;
  variant_label: string | null;
  count: number;
  last_seen: string;
};

export default async function AdminCartInterestsPage() {
  await requireAdmin();

  const supabase = createServerSupabaseClient();

  // Aggregate add-to-cart events grouped by product + variant
  const { data, error } = await supabase
    .from("cart_interests")
    .select("product_id, product_name, variant_label, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/cart-interests] query error:", error.message);
  }

  // Aggregate client-side
  const aggMap = new Map<string, Row>();
  for (const row of data ?? []) {
    const key = `${row.product_id}::${row.variant_label ?? ""}`;
    if (!aggMap.has(key)) {
      aggMap.set(key, {
        product_id:    row.product_id,
        product_name:  row.product_name,
        variant_label: row.variant_label,
        count:         0,
        last_seen:     row.created_at,
      });
    }
    const entry = aggMap.get(key)!;
    entry.count += 1;
    if (row.created_at > entry.last_seen) entry.last_seen = row.created_at;
  }

  const rows = [...aggMap.values()].sort((a, b) => b.count - a.count);

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-1">Admin</p>
        <h1 className="text-2xl font-serif font-normal text-stone-900">Cart Demand</h1>
        <p className="text-[13px] text-stone-400 mt-1">
          Products added to cart — a proxy for demand.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="border border-stone-200 p-10 text-center">
          <p className="text-[13px] text-stone-400">No cart events recorded yet.</p>
        </div>
      ) : (
        <div className="border border-stone-200 bg-white divide-y divide-stone-100">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-stone-400">
            <span>Product</span>
            <span className="text-right">Adds</span>
            <span className="text-right w-28">Last seen</span>
          </div>
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-5 py-3">
              <div className="min-w-0">
                <p className="text-[13px] text-stone-800 truncate">
                  {row.product_name ?? "Unknown"}
                </p>
                {row.variant_label && (
                  <p className="text-[12px] text-stone-400 mt-0.5">{row.variant_label}</p>
                )}
              </div>
              <span className="text-[14px] font-medium text-stone-900 text-right tabular-nums">
                {row.count}
              </span>
              <span className="text-[11px] text-stone-400 text-right w-28 shrink-0">
                {new Date(row.last_seen).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
