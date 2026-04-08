"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

const SOURCES = [
  { value: "", label: "All sources" },
  { value: "footer", label: "Footer" },
  { value: "popup", label: "Popup" },
  { value: "checkout", label: "Checkout" },
];

const PROMO_FILTERS = [
  { value: "", label: "All" },
  { value: "yes", label: "Promo sent" },
  { value: "no", label: "Not sent" },
];

interface Props {
  csvHref: string;
}

export function SubscriberControls({ csvHref }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const source = searchParams.get("source") ?? "";
  const promoSent = searchParams.get("promo_sent") ?? "";

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
    <div className="flex gap-3 flex-wrap items-center">
      <select
        value={source}
        onChange={(e) => update("source", e.target.value)}
        className="text-[13px] text-stone-700 border border-stone-200 px-2 py-1.5 bg-white focus:outline-none focus:border-stone-400"
      >
        {SOURCES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <select
        value={promoSent}
        onChange={(e) => update("promo_sent", e.target.value)}
        className="text-[13px] text-stone-700 border border-stone-200 px-2 py-1.5 bg-white focus:outline-none focus:border-stone-400"
      >
        {PROMO_FILTERS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>
      {(source || promoSent) && (
        <button
          onClick={() => startTransition(() => router.push(pathname))}
          className="text-[11px] uppercase tracking-widest text-stone-400 hover:text-stone-700 transition-colors"
        >
          Clear
        </button>
      )}
      <a
        href={csvHref}
        download="subscribers.csv"
        className="ml-auto text-[11px] uppercase tracking-widest px-3 py-1.5 border border-stone-200 text-stone-500 hover:border-stone-400 hover:text-stone-700 transition-colors"
      >
        Export CSV
      </a>
    </div>
  );
}
