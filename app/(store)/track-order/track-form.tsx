"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  initialQ?: string;
  initialZip?: string;
}

const inputCls =
  "w-full bg-transparent text-[14px] text-stone-800 placeholder-stone-400 outline-none py-3 border-b border-stone-200 focus:border-stone-700 transition-colors duration-150";

export function TrackOrderForm({ initialQ = "", initialZip = "" }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [zip, setZip] = useState(initialZip);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimQ = q.trim().toUpperCase();
    const trimZip = zip.trim();
    if (!trimQ || !trimZip) return;
    const params = new URLSearchParams({ q: trimQ, zip: trimZip });
    router.push(`/track-order?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-sm">
      <div>
        <label
          htmlFor="order-number"
          className="block text-[11px] uppercase tracking-widest text-stone-500 mb-3"
        >
          Order Number
        </label>
        <input
          id="order-number"
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. A1B2C3D4"
          required
          maxLength={36}
          autoComplete="off"
          className={inputCls}
        />
        <p className="mt-1.5 text-[11px] text-stone-400">
          Found in your order confirmation email.
        </p>
      </div>

      <div>
        <label
          htmlFor="zip-code"
          className="block text-[11px] uppercase tracking-widest text-stone-500 mb-3"
        >
          Shipping ZIP Code
        </label>
        <input
          id="zip-code"
          type="text"
          inputMode="numeric"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="e.g. 90210"
          required
          maxLength={10}
          className={inputCls}
        />
      </div>

      <button
        type="submit"
        className="text-[11px] uppercase tracking-widest px-8 py-3 bg-stone-900 text-white hover:bg-stone-700 transition-colors duration-150"
      >
        Find Order
      </button>
    </form>
  );
}
