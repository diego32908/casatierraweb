"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

interface Counts {
  all: number;
  inStock: number;
  lowStock: number;
  soldOut: number;
  active: number;
  inactive: number;
}

interface Props {
  counts: Counts;
}

const CHIPS: Array<{ key: string; value: string; label: (c: Counts) => string }> = [
  { key: "stock", value: "",         label: (c) => `All (${c.all})` },
  { key: "stock", value: "in_stock", label: (c) => `In stock (${c.inStock})` },
  { key: "stock", value: "low",      label: (c) => `Low stock (${c.lowStock})` },
  { key: "stock", value: "out",      label: (c) => `Sold out (${c.soldOut})` },
];

const STATUS_CHIPS: Array<{ key: string; value: string; label: (c: Counts) => string }> = [
  { key: "active", value: "",     label: (c) => `All (${c.all})` },
  { key: "active", value: "yes",  label: (c) => `Active (${c.active})` },
  { key: "active", value: "no",   label: (c) => `Inactive (${c.inactive})` },
];

export function InventoryFilters({ counts }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const stock = searchParams.get("stock") ?? "";
  const active = searchParams.get("active") ?? "";

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {CHIPS.map((chip) => {
          const active_chip = stock === chip.value;
          return (
            <button
              key={chip.value}
              onClick={() => update(chip.key, chip.value)}
              className={`text-[11px] uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                active_chip
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 text-stone-500 hover:border-stone-400"
              }`}
            >
              {chip.label(counts)}
            </button>
          );
        })}
        <span className="text-stone-200 self-center">|</span>
        {STATUS_CHIPS.map((chip) => {
          const isActive = active === chip.value;
          return (
            <button
              key={chip.value}
              onClick={() => update(chip.key, chip.value)}
              className={`text-[11px] uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                isActive
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 text-stone-500 hover:border-stone-400"
              }`}
            >
              {chip.label(counts)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
