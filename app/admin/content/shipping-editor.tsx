"use client";

import { useTransition, useState } from "react";
import { patchSiteSetting } from "@/app/actions/site-settings";

interface Props {
  flatRateCents: number;
  priorityRateCents: number;
  freeThresholdCents: number;
}

const inputCls =
  "w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-500";
const labelCls = "block text-sm font-medium text-stone-700 mb-1";

/** Convert cents → dollars string for form display (e.g. 899 → "8.99") */
function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Parse a dollar string to cents, returning null if invalid */
function parseDollarsToCents(value: string): number | null {
  const n = parseFloat(value);
  if (isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function ShippingEditor({ flatRateCents, priorityRateCents, freeThresholdCents }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);

    const flatRate = parseDollarsToCents(fd.get("flat_rate") as string);
    const priorityRate = parseDollarsToCents(fd.get("priority_rate") as string);
    const freeThreshold = parseDollarsToCents(fd.get("free_threshold") as string);

    if (flatRate === null || priorityRate === null || freeThreshold === null) {
      setError("Enter valid dollar amounts (e.g. 8.99 or 150.00).");
      return;
    }

    startTransition(async () => {
      const result = await patchSiteSetting("shipping", "Shipping Settings", {
        flat_rate_cents: flatRate,
        priority_rate_cents: priorityRate,
        free_threshold_cents: freeThreshold,
      });
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="panel p-6 space-y-6">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Shipping
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Flat rate charged for standard shipping, and the order subtotal required
          to unlock free shipping. These values are used consistently in the
          checkout UI and the Stripe session — they cannot drift.
        </p>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={labelCls}>Flat shipping rate</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-stone-400">
              $
            </span>
            <input
              name="flat_rate"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={centsToDisplay(flatRateCents)}
              className={`${inputCls} pl-7`}
              placeholder="8.99"
            />
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Charged when the order subtotal is below the free shipping threshold.
          </p>
        </div>

        <div>
          <label className={labelCls}>Priority shipping rate</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-stone-400">
              $
            </span>
            <input
              name="priority_rate"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={centsToDisplay(priorityRateCents)}
              className={`${inputCls} pl-7`}
              placeholder="15.99"
            />
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Charged for priority / expedited shipping (2–3 business days). Free-shipping threshold does not apply to priority.
          </p>
        </div>

        <div>
          <label className={labelCls}>Free shipping threshold</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-stone-400">
              $
            </span>
            <input
              name="free_threshold"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={centsToDisplay(freeThresholdCents)}
              className={`${inputCls} pl-7`}
              placeholder="150.00"
            />
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Orders at or above this subtotal receive free shipping automatically.
            Set to a very high number (e.g. 99999) to effectively disable free shipping.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          {saved && <span className="text-sm text-stone-500">Saved.</span>}
        </div>
      </form>
    </div>
  );
}
