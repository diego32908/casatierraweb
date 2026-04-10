import { createServerSupabaseClient } from "@/lib/supabase/server";
import { StatusToggle } from "./status-toggle";

type Submission = {
  id: string;
  name: string;
  email: string;
  inquiry_type: string;
  message: string;
  status: "new" | "read" | "resolved";
  created_at: string;
};

const TYPE_LABELS: Record<string, string> = {
  general: "General",
  bulk:    "Bulk Order",
  custom:  "Custom Request",
  support: "Support",
};

const STATUS_STYLES: Record<string, string> = {
  new:      "bg-stone-900 text-white",
  read:     "bg-stone-200 text-stone-600",
  resolved: "bg-stone-100 text-stone-400",
};

async function getSubmissions(): Promise<Submission[] | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("contact_submissions")
      .select("id, name, email, inquiry_type, message, status, created_at")
      .order("created_at", { ascending: false });
    if (error) { console.error("[admin/leads]", error.message); return null; }
    return (data ?? []) as Submission[];
  } catch (e) {
    console.error("[admin/leads] query failed:", e);
    return null;
  }
}

export default async function AdminLeadsPage() {
  const submissions = await getSubmissions();

  if (submissions === null) {
    return (
      <section className="space-y-8 max-w-4xl">
        <header>
          <h1 className="text-3xl font-semibold">Inquiries</h1>
        </header>
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load inquiries. Refresh to try again.
        </div>
      </section>
    );
  }

  const counts = {
    new:      submissions.filter((s) => s.status === "new").length,
    read:     submissions.filter((s) => s.status === "read").length,
    resolved: submissions.filter((s) => s.status === "resolved").length,
  };

  return (
    <section className="space-y-8 max-w-4xl">
      <header>
        <h1 className="text-3xl font-semibold">Inquiries</h1>
        <p className="mt-2 text-sm text-stone-500">
          Contact form submissions from customers.
        </p>
      </header>

      {/* Summary counts */}
      <div className="flex gap-6 text-sm">
        <span className="text-stone-900 font-medium">{counts.new} new</span>
        <span className="text-stone-400">{counts.read} read</span>
        <span className="text-stone-400">{counts.resolved} resolved</span>
      </div>

      {submissions.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-sm text-stone-400">No submissions yet.</p>
          <p className="text-xs text-stone-300 mt-1">
            Submissions appear here once customers use the /contact form.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <div
              key={s.id}
              className="panel p-5 space-y-3"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-stone-900">{s.name}</p>
                  <p className="text-xs text-stone-400">{s.email}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-stone-400">
                    {TYPE_LABELS[s.inquiry_type] ?? s.inquiry_type}
                  </span>
                  <span
                    className={`text-[9px] uppercase tracking-[0.16em] px-2 py-1 ${STATUS_STYLES[s.status] ?? STATUS_STYLES.read}`}
                  >
                    {s.status}
                  </span>
                </div>
              </div>

              {/* Message */}
              <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">
                {s.message}
              </p>

              {/* Footer row */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-stone-300">
                  {new Date(s.created_at).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
                <StatusToggle id={s.id} current={s.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
