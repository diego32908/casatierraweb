import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

type Customer = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  birthday: string | null;
  first_order_at: string | null;
  first_order_completed: boolean;
  order_count: number;
  total_spent_cents: number;
  created_at: string;
};

async function getCustomers(): Promise<(Customer & { profile_name: string | null })[] | null> {
  try {
    const supabase = createServerSupabaseClient();

    const [customersResult, profilesResult] = await Promise.all([
      supabase
        .from("customers")
        .select("id, email, full_name, phone, birthday, first_order_at, first_order_completed, order_count, total_spent_cents, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("email, first_name, last_name"),
    ]);

    if (customersResult.error) {
      console.error("[admin/customers]", customersResult.error.message);
      return null;
    }

    // Build email → profile name map for enrichment
    const profileNameMap = new Map<string, string>();
    for (const p of (profilesResult.data ?? [])) {
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
      if (name) profileNameMap.set(p.email.toLowerCase(), name);
    }

    return (customersResult.data ?? []).map((c) => ({
      ...(c as Customer),
      profile_name: profileNameMap.get(c.email.toLowerCase()) ?? null,
    }));
  } catch (e) {
    console.error("[admin/customers] query failed:", e);
    return null;
  }
}

export default async function AdminCustomersPage() {
  const customers = await getCustomers() as (Customer & { profile_name: string | null })[] | null;

  if (customers === null) {
    return (
      <section className="space-y-8 max-w-5xl">
        <header>
          <h1 className="text-3xl font-semibold">Customers</h1>
        </header>
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load customers. Refresh to try again.
        </div>
      </section>
    );
  }

  const counts = {
    total:     customers.length,
    returning: customers.filter((c) => c.order_count > 1).length,
    firstOnly: customers.filter((c) => c.order_count === 1).length,
  };

  return (
    <section className="space-y-8 max-w-5xl">
      <header>
        <h1 className="text-3xl font-semibold">Customers</h1>
        <p className="mt-2 text-sm text-stone-500">
          Everyone who has placed an order. Built automatically on first checkout.
        </p>
      </header>

      {/* Summary */}
      <div className="flex gap-6 text-sm flex-wrap">
        <span className="text-stone-900 font-medium">{counts.total} total</span>
        <span className="text-stone-400">{counts.firstOnly} first order only</span>
        <span className="text-stone-400">{counts.returning} returning</span>
      </div>

      {customers.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-sm text-stone-400">No customers yet.</p>
          <p className="text-xs text-stone-300 mt-1">
            Customer profiles are created automatically after a successful order.
          </p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200">
                {["Email", "Name", "Orders", "Total Spent", "First Order", "Birthday", "Since"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-stone-400 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => (
                <tr key={c.id} className={i % 2 === 0 ? "bg-white" : "bg-stone-50"}>
                  <td className="px-4 py-3 text-stone-800 text-xs">{c.email}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs">
                    {c.profile_name ?? c.full_name ?? "—"}
                    {c.profile_name && c.full_name && c.profile_name !== c.full_name && (
                      <span className="ml-1 text-[10px] text-stone-300" title={`Checkout name: ${c.full_name}`}>*</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs text-center">{c.order_count}</td>
                  <td className="px-4 py-3 text-stone-700 text-xs font-medium">
                    {c.total_spent_cents > 0 ? formatPrice(c.total_spent_cents) : "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-400 text-xs">
                    {c.first_order_at
                      ? new Date(c.first_order_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-400 text-xs">
                    {c.birthday
                      ? new Date(c.birthday).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-300 text-xs">
                    {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
