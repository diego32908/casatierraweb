"use client";

import { useState, useTransition } from "react";
import { updateReturnStatus } from "@/app/actions/returns";

const STATUSES = ["pending", "approved", "paid", "label_sent", "completed", "rejected"] as const;
type Status = typeof STATUSES[number];

const STATUS_LABEL: Record<Status, string> = {
  pending:    "Pending",
  approved:   "Approved",
  paid:       "Paid",
  label_sent: "Label Sent",
  completed:  "Completed",
  rejected:   "Rejected",
};

const STATUS_CLS: Record<Status, string> = {
  pending:    "bg-amber-50 text-amber-700 border-amber-200",
  approved:   "bg-green-50 text-green-700 border-green-200",
  paid:       "bg-blue-50 text-blue-700 border-blue-200",
  label_sent: "bg-indigo-50 text-indigo-700 border-indigo-200",
  completed:  "bg-stone-100 text-stone-500 border-stone-200",
  rejected:   "bg-red-50 text-red-600 border-red-200",
};

interface Props {
  id: string;
  currentStatus: Status;
}

export function ReturnsStatusSelect({ id, currentStatus }: Props) {
  const [status, setStatus] = useState<Status>(currentStatus);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Status;
    const prev = status;
    setStatus(next);
    setErr(null);
    startTransition(async () => {
      const result = await updateReturnStatus(id, next);
      if (result?.error) {
        setStatus(prev);
        setErr("Failed to update status");
        console.error("[returns-status-select] update failed:", result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={status}
        onChange={handleChange}
        disabled={isPending}
        className={`text-[11px] uppercase tracking-[0.12em] border px-2.5 py-1.5 focus:outline-none transition-colors duration-150 disabled:opacity-50 ${STATUS_CLS[status]}`}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      {err && (
        <p className="text-[10px] text-red-600">{err}</p>
      )}
    </div>
  );
}
