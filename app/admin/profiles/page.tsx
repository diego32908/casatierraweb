export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type Profile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  birthday: string | null;
  gender: string | null;
  created_at: string;
};

const GENDER_LABELS: Record<string, string> = {
  woman:            "Woman",
  man:              "Man",
  non_binary:       "Non-binary",
  prefer_not_to_say: "—",
};

async function getProfilesWithOrderStatus(): Promise<
  { profile: Profile; hasOrdered: boolean }[] | null
> {
  try {
    const supabase = createServerSupabaseClient();

    const [profilesResult, customerEmailsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, first_name, last_name, phone, birthday, gender, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("customers")
        .select("email"),
    ]);

    if (profilesResult.error) {
      console.error("[admin/profiles] profiles query failed:", profilesResult.error.message);
      return null;
    }

    const orderedEmails = new Set(
      (customerEmailsResult.data ?? []).map((c) => c.email.toLowerCase())
    );

    return (profilesResult.data ?? []).map((p) => ({
      profile: p as Profile,
      hasOrdered: orderedEmails.has(p.email.toLowerCase()),
    }));
  } catch (e) {
    console.error("[admin/profiles] query failed:", e);
    return null;
  }
}

export default async function AdminProfilesPage() {
  const rows = await getProfilesWithOrderStatus();

  if (rows === null) {
    return (
      <section className="space-y-8 max-w-5xl">
        <header>
          <h1 className="text-3xl font-semibold">Profiles</h1>
        </header>
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load profiles. Refresh to try again.
        </div>
      </section>
    );
  }

  const counts = {
    total:      rows.length,
    ordered:    rows.filter((r) => r.hasOrdered).length,
    notOrdered: rows.filter((r) => !r.hasOrdered).length,
  };

  return (
    <section className="space-y-8 max-w-5xl">
      <header>
        <h1 className="text-3xl font-semibold">Profiles</h1>
        <p className="mt-2 text-sm text-stone-500">
          Everyone who created an account, including those who have not yet placed an order.
        </p>
      </header>

      {/* Summary */}
      <div className="flex gap-6 text-sm flex-wrap">
        <span className="text-stone-900 font-medium">{counts.total} total</span>
        <span className="text-stone-400">{counts.ordered} have ordered</span>
        <span className="text-stone-400">{counts.notOrdered} no order yet</span>
      </div>

      {rows.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-sm text-stone-400">No profiles yet.</p>
          <p className="text-xs text-stone-300 mt-1">
            Profiles are created when a customer creates an account.
          </p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200">
                {["Email", "Name", "Phone", "Birthday", "Gender", "Ordered", "Joined"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-stone-400 font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ profile: p, hasOrdered }, i) => (
                <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-stone-50"}>
                  <td className="px-4 py-3 text-stone-800 text-xs">{p.email}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs">
                    {[p.first_name, p.last_name].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-400 text-xs">{p.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-400 text-xs">
                    {p.birthday
                      ? new Date(p.birthday).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-400 text-xs">
                    {p.gender ? (GENDER_LABELS[p.gender] ?? p.gender) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {hasOrdered ? (
                      <span className="text-stone-700 font-medium">Yes</span>
                    ) : (
                      <span className="text-stone-300">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-300 text-xs">
                    {new Date(p.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
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
