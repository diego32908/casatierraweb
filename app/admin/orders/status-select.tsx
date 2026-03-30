"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatus } from "@/app/actions/orders";
import type { OrderStatus } from "@/types/store";

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "STOCK_CONFLICT",   label: "⚠ Stock Conflict" },
  { value: "PAID",              label: "Paid" },
  { value: "PREPARING",        label: "Preparing" },
  { value: "SHIPPED",          label: "Shipped" },
  { value: "READY_FOR_PICKUP", label: "Ready for Pickup" },
  { value: "COMPLETED",        label: "Completed" },
  { value: "CANCELLED",        label: "Cancelled" },
];

export function StatusSelect({ orderId, current }: { orderId: string; current: OrderStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(current);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as OrderStatus;
    setValue(next);
    startTransition(async () => {
      await updateOrderStatus(orderId, next);
      router.refresh();
    });
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={isPending}
      className="border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700 outline-none focus:border-stone-400 disabled:opacity-50"
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
