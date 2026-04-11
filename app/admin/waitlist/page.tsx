export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/server-auth";

type WaitlistRow = {
  id: string;
  email: string;
  created_at: string;
  product_id: string;
  variant_id: string | null;
  product_name: string | null;
  variant_label: string | null;
};

type GroupedProduct = {
  productId: string;
  productName: string | null;
  variants: {
    variantId: string | null;
    variantLabel: string | null;
    entries: WaitlistRow[];
  }[];
};

export default async function AdminWaitlistPage() {
  await requireAdmin();

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("waitlist")
    .select(`
      id,
      email,
      created_at,
      product_id,
      variant_id,
      product:products(name_en),
      variant:product_variants(size_label, color_name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/waitlist] query error:", error.message);
  }

  // Normalize rows (Supabase returns joined relations as arrays)
  const rows: WaitlistRow[] = (data ?? []).map((r: {
    id: string;
    email: string;
    created_at: string;
    product_id: string;
    variant_id: string | null;
    product: { name_en: string }[] | null;
    variant: { size_label: string; color_name: string | null }[] | null;
  }) => {
    const prod = Array.isArray(r.product) ? r.product[0] : r.product;
    const vari = Array.isArray(r.variant) ? r.variant[0] : r.variant;
    const variantParts = [vari?.color_name, vari?.size_label].filter(Boolean);
    return {
      id: r.id,
      email: r.email,
      created_at: r.created_at,
      product_id: r.product_id,
      variant_id: r.variant_id,
      product_name: prod?.name_en ?? null,
      variant_label: variantParts.length ? variantParts.join(" · ") : null,
    };
  });

  // Group by product → variant
  const productMap = new Map<string, GroupedProduct>();
  for (const row of rows) {
    if (!productMap.has(row.product_id)) {
      productMap.set(row.product_id, {
        productId: row.product_id,
        productName: row.product_name,
        variants: [],
      });
    }
    const prod = productMap.get(row.product_id)!;
    const variantKey = row.variant_id ?? "__no_variant__";
    let variantGroup = prod.variants.find((v) =>
      (v.variantId ?? "__no_variant__") === variantKey
    );
    if (!variantGroup) {
      variantGroup = { variantId: row.variant_id, variantLabel: row.variant_label, entries: [] };
      prod.variants.push(variantGroup);
    }
    variantGroup.entries.push(row);
  }

  const grouped = [...productMap.values()].sort(
    (a, b) => b.variants.reduce((s, v) => s + v.entries.length, 0) -
               a.variants.reduce((s, v) => s + v.entries.length, 0)
  );

  const totalEntries = rows.length;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-1">Admin</p>
          <h1 className="text-2xl font-serif font-normal text-stone-900">Waitlist</h1>
        </div>
        {totalEntries > 0 && (
          <span className="px-2.5 py-1 bg-stone-100 text-stone-600 border border-stone-200 text-[11px] uppercase tracking-[0.12em]">
            {totalEntries} total
          </span>
        )}
      </div>

      {grouped.length === 0 ? (
        <div className="border border-stone-200 p-10 text-center">
          <p className="text-[13px] text-stone-400">No waitlist entries yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((prod) => {
            const total = prod.variants.reduce((s, v) => s + v.entries.length, 0);
            return (
              <div key={prod.productId} className="border border-stone-200 bg-white">
                {/* Product header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                  <div>
                    <p className="text-[13px] font-medium text-stone-800">
                      {prod.productName ?? "Unknown product"}
                    </p>
                    <p className="text-[11px] text-stone-400 mt-0.5 font-mono">
                      {prod.productId.slice(0, 8)}
                    </p>
                  </div>
                  <span className="text-[11px] text-stone-500 uppercase tracking-[0.12em]">
                    {total} {total === 1 ? "entry" : "entries"}
                  </span>
                </div>

                {/* Variants */}
                <div className="divide-y divide-stone-100">
                  {prod.variants.map((vg, vi) => (
                    <div key={vi} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-stone-500">
                          {vg.variantLabel ?? "No variant"}
                        </p>
                        <span className="text-[11px] text-stone-400">
                          {vg.entries.length}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {vg.entries.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between text-[12px]">
                            <span className="text-stone-700">{entry.email}</span>
                            <span className="text-stone-400 shrink-0 ml-4">
                              {new Date(entry.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
