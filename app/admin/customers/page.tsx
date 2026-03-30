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

async function getCustomers(): Promise<Customer[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("customers")
      .select("id, email, full_name, phone, birthday, first_order_at, first_order_completed, order_count, total_spent_cents, created_at")
      .order("created_at", { ascending: false });
    if (error) { console.error("[admin/customers]", error.message); return []; }
    return (data ?? []) as Customer[];
  } catch (e) {
    console.error("[admin/customers] query failed:", e);
    return [];
  }
}

export default async function AdminCustomersPage() {
  const customers = await getCustomers();

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
                  <td className="px-4 py-3 text-stone-500 text-xs">{c.full_name ?? "—"}</td>
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
