"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "PAID", label: "Paid" },
  { value: "PREPARING", label: "Preparing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "READY_FOR_PICKUP", label: "Ready for pickup" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "STOCK_CONFLICT", label: "Stock conflict" },
];

const FULFILLMENTS = [
  { value: "", label: "All types" },
  { value: "shipping", label: "Shipping" },
  { value: "pickup", label: "Pickup" },
];

export function OrderFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const fulfillment = searchParams.get("fulfillment") ?? "";

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset to page 1 on filter change
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex gap-3 flex-wrap items-center">
      <input
        type="search"
        value={q}
        onChange={(e) => update("q", e.target.value)}
        placeholder="Search name or email…"
        className="text-[13px] text-stone-700 border border-stone-200 px-3 py-1.5 placeholder-stone-400 focus:outline-none focus:border-stone-400 min-w-[220px]"
      />
      <select
        value={status}
        onChange={(e) => update("status", e.target.value)}
        className="text-[13px] text-stone-700 border border-stone-200 px-2 py-1.5 bg-white focus:outline-none focus:border-stone-400"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <select
        value={fulfillment}
        onChange={(e) => update("fulfillment", e.target.value)}
        className="text-[13px] text-stone-700 border border-stone-200 px-2 py-1.5 bg-white focus:outline-none focus:border-stone-400"
      >
        {FULFILLMENTS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>
      {(q || status || fulfillment) && (
        <button
          onClick={() => {
            startTransition(() => router.push(pathname));
          }}
          className="text-[11px] uppercase tracking-widest text-stone-400 hover:text-stone-700 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
