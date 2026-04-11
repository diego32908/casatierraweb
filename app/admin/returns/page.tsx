export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/server-auth";
import { ReturnsStatusSelect } from "./returns-status-select";
import { ReturnsFilters } from "./returns-filters";

type ReturnRequest = {
  id: string;
  order_ref: string;
  email: string;
  request_type: "return" | "exchange";
  status: "pending" | "approved" | "paid" | "label_sent" | "completed" | "rejected";
  items_json: Array<{ name: string; variant: string | null; quantity: number }>;
  reason: string;
  notes: string | null;
  replacement_size: string | null;
  label_option: "prepaid" | "in_store";
  fee_cents: number | null;
  created_at: string;
};

const LABEL_OPTION_LABEL: Record<string, string> = {
  prepaid:  "Prepaid label",
  in_store: "In-store (free)",
};


interface PageProps {
  searchParams: Promise<{ status?: string; type?: string }>;
}

export default async function AdminReturnsPage({ searchParams }: PageProps) {
  await requireAdmin();

  const { status: statusFilter, type: typeFilter } = await searchParams;

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("return_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") query = query.eq("status", statusFilter);
  if (typeFilter && typeFilter !== "all") query = query.eq("request_type", typeFilter);

  const { data, error } = await query;

  if (error) {
    console.error("[admin/returns] query error:", error.message);
  }

  const requests = (data ?? []) as ReturnRequest[];

  const counts = {
    pending:    requests.filter((r) => r.status === "pending").length,
    approved:   requests.filter((r) => r.status === "approved").length,
    paid:       requests.filter((r) => r.status === "paid").length,
    label_sent: requests.filter((r) => r.status === "label_sent").length,
    rejected:   requests.filter((r) => r.status === "rejected").length,
    completed:  requests.filter((r) => r.status === "completed").length,
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-1">Admin</p>
          <h1 className="text-2xl font-serif font-normal text-stone-900">
            Returns &amp; Exchanges
          </h1>
        </div>
        <div className="flex gap-2 text-[12px] text-stone-500">
          {counts.pending > 0 && (
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] uppercase tracking-[0.12em]">
              {counts.pending} pending
            </span>
          )}
          {counts.paid > 0 && (
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-[11px] uppercase tracking-[0.12em]">
              {counts.paid} paid
            </span>
          )}
          {counts.label_sent > 0 && (
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] uppercase tracking-[0.12em]">
              {counts.label_sent} label sent
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <ReturnsFilters statusFilter={statusFilter} typeFilter={typeFilter} />

      {/* Table */}
      {requests.length === 0 ? (
        <div className="border border-stone-200 p-10 text-center">
          <p className="text-[13px] text-stone-400">No requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="border border-stone-200 bg-white p-5">
              {/* Header row */}
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-[12px] text-stone-500">#{req.order_ref}</span>
                  <span
                    className={`text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 border ${
                      req.request_type === "exchange"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-stone-100 text-stone-500 border-stone-200"
                    }`}
                  >
                    {req.request_type}
                  </span>
                  <span className="text-[12px] text-stone-400">{req.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-stone-400">
                    {new Date(req.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <ReturnsStatusSelect id={req.id} currentStatus={req.status} />
                </div>
              </div>

              {/* Items */}
              <div className="mb-4 space-y-1">
                {req.items_json.map((item, i) => (
                  <p key={i} className="text-[13px] text-stone-700">
                    {item.name}
                    {item.variant ? <span className="text-stone-400"> · {item.variant}</span> : null}
                    {item.quantity > 1 ? <span className="text-stone-400"> ×{item.quantity}</span> : null}
                  </p>
                ))}
              </div>

              {/* Details */}
              <div className="flex flex-wrap gap-x-8 gap-y-2 text-[12px] text-stone-500 border-t border-stone-100 pt-4">
                <span>
                  <span className="text-stone-400 uppercase tracking-[0.1em] text-[10px] mr-1.5">Reason</span>
                  {req.reason}
                </span>
                <span>
                  <span className="text-stone-400 uppercase tracking-[0.1em] text-[10px] mr-1.5">Method</span>
                  {req.label_option === "prepaid"
                    ? `${LABEL_OPTION_LABEL.prepaid} (${req.fee_cents != null ? `$${(req.fee_cents / 100).toFixed(2)}` : "—"})`
                    : (LABEL_OPTION_LABEL[req.label_option] ?? req.label_option)}
                </span>
                {req.replacement_size && (
                  <span>
                    <span className="text-stone-400 uppercase tracking-[0.1em] text-[10px] mr-1.5">Replacement</span>
                    {req.replacement_size}
                  </span>
                )}
              </div>

              {req.notes && (
                <p className="mt-3 text-[12px] text-stone-500 italic leading-relaxed border-t border-stone-100 pt-3">
                  &ldquo;{req.notes}&rdquo;
                </p>
              )}

              {/* Shipping source guidance for label generation */}
              {req.label_option === "prepaid" && (
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-stone-400 mb-1">
                    Shipping source
                  </p>
                  <p className="text-[12px] text-stone-400 italic">
                    Use shipping address from original order #{req.order_ref} in /admin/orders
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
