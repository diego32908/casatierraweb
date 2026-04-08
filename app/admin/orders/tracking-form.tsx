"use client";

import { useState, useTransition } from "react";
import { updateOrderTracking } from "@/app/actions/orders";

const CARRIERS = ["USPS", "UPS", "FedEx", "DHL", "Other"];

interface Props {
  orderId: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
}

export function TrackingForm({ orderId, carrier, trackingNumber, trackingUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [carrierVal, setCarrierVal] = useState(carrier ?? "");
  const [numberVal, setNumberVal] = useState(trackingNumber ?? "");
  const [urlVal, setUrlVal] = useState(trackingUrl ?? "");
  const [saved, setSaved] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] uppercase tracking-widest text-stone-400 hover:text-stone-700 transition-colors"
      >
        {trackingNumber ? "Edit tracking" : "Add tracking"}
      </button>
    );
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setErrMsg("");
    startTransition(async () => {
      const result = await updateOrderTracking(orderId, {
        carrier: carrierVal || null,
        tracking_number: numberVal || null,
        tracking_url: urlVal || null,
      });
      if (result.error) {
        setErrMsg(result.error);
      } else {
        setSaved(true);
        setOpen(false);
      }
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-2 pt-1">
      <div className="flex gap-2 flex-wrap items-end">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-stone-400 mb-1">Carrier</label>
          <select
            value={carrierVal}
            onChange={(e) => setCarrierVal(e.target.value)}
            disabled={isPending}
            className="text-[12px] text-stone-700 border border-stone-200 px-2 py-1.5 bg-white focus:outline-none focus:border-stone-400 disabled:opacity-50"
          >
            <option value="">Select</option>
            {CARRIERS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[10px] uppercase tracking-widest text-stone-400 mb-1">Tracking #</label>
          <input
            type="text"
            value={numberVal}
            onChange={(e) => setNumberVal(e.target.value)}
            placeholder="e.g. 9400111899223397450254"
            disabled={isPending}
            className="w-full text-[12px] font-mono text-stone-700 border border-stone-200 px-2 py-1.5 placeholder-stone-300 focus:outline-none focus:border-stone-400 disabled:opacity-50"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[10px] uppercase tracking-widest text-stone-400 mb-1">Tracking URL</label>
          <input
            type="url"
            value={urlVal}
            onChange={(e) => setUrlVal(e.target.value)}
            placeholder="https://..."
            disabled={isPending}
            className="w-full text-[12px] text-stone-700 border border-stone-200 px-2 py-1.5 placeholder-stone-300 focus:outline-none focus:border-stone-400 disabled:opacity-50"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="text-[11px] uppercase tracking-widest px-3 py-1.5 bg-stone-900 text-white hover:bg-stone-700 transition-colors disabled:opacity-40"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="text-[11px] uppercase tracking-widest px-3 py-1.5 border border-stone-200 text-stone-500 hover:border-stone-400 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </div>
      {errMsg && <p className="text-[11px] text-red-500">{errMsg}</p>}
      {saved && <p className="text-[11px] text-green-700">Saved.</p>}
    </form>
  );
}
