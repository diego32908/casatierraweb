import { createServerSupabaseClient } from "@/lib/supabase/server";

type Subscriber = {
  id: string;
  email: string;
  source: string;
  status: string;
  created_at: string;
};

const SOURCE_LABELS: Record<string, string> = {
  footer:   "Footer",
  popup:    "Popup",
  checkout: "Checkout",
};

async function getSubscribers(): Promise<Subscriber[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("subscribers")
      .select("id, email, source, status, created_at")
      .order("created_at", { ascending: false });
    return (data ?? []) as Subscriber[];
  } catch (e) {
    console.error("[subscribers admin] query error:", e);
    return [];
  }
}

export default async function AdminSubscribersPage() {
  const subscribers = await getSubscribers();

  const counts = {
    total:    subscribers.length,
    footer:   subscribers.filter((s) => s.source === "footer").length,
    popup:    subscribers.filter((s) => s.source === "popup").length,
    checkout: subscribers.filter((s) => s.source === "checkout").length,
    active:   subscribers.filter((s) => s.status === "active").length,
  };

  return (
    <section className="space-y-8 max-w-4xl">
      <header>
        <h1 className="text-3xl font-semibold">Subscribers</h1>
        <p className="mt-2 text-sm text-stone-500">
          Newsletter emails captured from the footer and popup.
        </p>
      </header>

      {/* Summary */}
      <div className="flex gap-6 text-sm flex-wrap">
        <span className="text-stone-900 font-medium">{counts.total} total</span>
        <span className="text-stone-400">{counts.active} active</span>
        <span className="text-stone-400">{counts.popup} from popup</span>
        <span className="text-stone-400">{counts.checkout} from checkout</span>
        <span className="text-stone-400">{counts.footer} from footer</span>
      </div>

      {subscribers.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-sm text-stone-400">No subscribers yet.</p>
          <p className="text-xs text-stone-300 mt-1">
            Emails appear here once someone submits the footer form or popup.
          </p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-stone-400 font-medium">Email</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-stone-400 font-medium">Source</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-stone-400 font-medium">Status</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-stone-400 font-medium">Date Added</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s, i) => (
                <tr
                  key={s.id}
                  className={i % 2 === 0 ? "bg-white" : "bg-stone-50"}
                >
                  <td className="px-5 py-3 text-stone-800">{s.email}</td>
                  <td className="px-5 py-3 text-stone-500">
                    {SOURCE_LABELS[s.source] ?? s.source}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        s.status === "active"
                          ? "text-stone-700"
                          : "text-stone-400"
                      }
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-stone-400 text-[12px]">
                    {new Date(s.created_at).toLocaleDateString("en-US", {
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
