"use client";

import { useState, useTransition } from "react";
import { updateReturnStatus } from "@/app/actions/returns";

const STATUSES = ["pending", "approved", "rejected", "completed"] as const;
type Status = typeof STATUSES[number];

const STATUS_CLS: Record<Status, string> = {
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  approved:  "bg-green-50 text-green-700 border-green-200",
  rejected:  "bg-red-50 text-red-600 border-red-200",
  completed: "bg-stone-100 text-stone-500 border-stone-200",
};

interface Props {
  id: string;
  currentStatus: Status;
}

export function ReturnsStatusSelect({ id, currentStatus }: Props) {
  const [status, setStatus] = useState<Status>(currentStatus);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Status;
    setStatus(next);
    startTransition(async () => {
      await updateReturnStatus(id, next);
    });
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={isPending}
      className={`text-[11px] uppercase tracking-[0.12em] border px-2.5 py-1.5 focus:outline-none transition-colors duration-150 disabled:opacity-50 ${STATUS_CLS[status]}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </option>
      ))}
    </select>
  );
}
