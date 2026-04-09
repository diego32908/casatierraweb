"use client";

const STATUS_FILTER_OPTS = [
  { value: "",           label: "All statuses" },
  { value: "pending",    label: "Pending" },
  { value: "approved",   label: "Approved" },
  { value: "paid",       label: "Paid" },
  { value: "label_sent", label: "Label Sent" },
  { value: "completed",  label: "Completed" },
  { value: "rejected",   label: "Rejected" },
];

const TYPE_FILTER_OPTS = [
  { value: "", label: "All types" },
  { value: "return", label: "Returns" },
  { value: "exchange", label: "Exchanges" },
];

interface Props {
  statusFilter: string | undefined;
  typeFilter: string | undefined;
}

export function ReturnsFilters({ statusFilter, typeFilter }: Props) {
  return (
    <div className="flex flex-wrap gap-3 mb-8">
      <form method="get">
        {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
        <select
          name="status"
          defaultValue={statusFilter ?? ""}
          onChange={(e) => (e.target.form as HTMLFormElement).submit()}
          className="text-[12px] border border-stone-200 px-3 py-2 bg-white text-stone-700 focus:outline-none"
        >
          {STATUS_FILTER_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </form>
      <form method="get">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <select
          name="type"
          defaultValue={typeFilter ?? ""}
          onChange={(e) => (e.target.form as HTMLFormElement).submit()}
          className="text-[12px] border border-stone-200 px-3 py-2 bg-white text-stone-700 focus:outline-none"
        >
          {TYPE_FILTER_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </form>
      {(statusFilter || typeFilter) && (
        <a
          href="/admin/returns"
          className="text-[12px] text-stone-400 hover:text-stone-700 underline underline-offset-2 self-center"
        >
          Clear filters
        </a>
      )}
    </div>
  );
}
