"use client";

import { useState, useTransition } from "react";
import { submitReturnRequest, type ReturnRequestItem } from "@/app/actions/returns";

const RETURN_REASONS = [
  "Doesn't fit",
  "Changed my mind",
  "Item arrived damaged",
  "Wrong item received",
  "Quality not as expected",
  "Other",
];

const EXCHANGE_REASONS = [
  "Need a different size",
  "Need a different color",
  "Item arrived damaged",
  "Wrong item received",
  "Other",
];

interface OrderItem {
  product_name_snapshot: string;
  variant_label_snapshot: string | null;
  quantity: number;
  image_url_snapshot: string | null;
}

interface Props {
  orderId: string;
  orderRef: string;
  email: string;
  formType: "return" | "exchange";
  orderItems: OrderItem[];
}

const inputCls =
  "w-full text-[13px] text-stone-800 border border-stone-200 px-3 py-2.5 bg-white placeholder-stone-400 focus:outline-none focus:border-stone-500 transition-colors duration-150";
const labelCls = "block text-[11px] uppercase tracking-[0.16em] text-stone-500 mb-2";

export function ReturnForm({ orderId, orderRef, email, formType, orderItems }: Props) {
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [replacementSize, setReplacementSize] = useState("");
  const [labelOption, setLabelOption] = useState<"prepaid" | "own_label" | "">("");
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const reasons = formType === "exchange" ? EXCHANGE_REASONS : RETURN_REASONS;

  function toggleItem(i: number, maxQty: number) {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[i]) {
        delete next[i];
      } else {
        next[i] = 1;
      }
      return next;
    });
  }

  function setItemQty(i: number, qty: number) {
    setSelectedItems((prev) => ({ ...prev, [i]: qty }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrMsg("");

    const items: ReturnRequestItem[] = Object.entries(selectedItems)
      .filter(([, qty]) => qty > 0)
      .map(([idxStr, qty]) => {
        const item = orderItems[Number(idxStr)];
        return {
          name: item.product_name_snapshot,
          variant: item.variant_label_snapshot,
          quantity: qty,
        };
      });

    if (!items.length) {
      setErrMsg("Please select at least one item.");
      return;
    }
    if (!reason) {
      setErrMsg("Please select a reason.");
      return;
    }
    if (!labelOption) {
      setErrMsg("Please choose a label option.");
      return;
    }

    startTransition(async () => {
      const result = await submitReturnRequest({
        orderId,
        orderRef,
        email,
        requestType: formType,
        items,
        reason,
        notes,
        replacementSize: formType === "exchange" ? (replacementSize || null) : null,
        labelOption,
      });
      if (result.error) {
        setErrMsg(result.error);
      } else {
        setDone(true);
      }
    });
  }

  if (done) {
    return (
      <div className="panel p-8 text-center space-y-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-stone-200 mx-auto mb-4">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14, color: "#78716c" }}>
            <path d="M2.5 8.5l4 4 7-8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-[15px] text-stone-900 font-medium">Request received.</p>
        <p className="text-[13px] text-stone-500 leading-relaxed max-w-sm mx-auto">
          Your {formType} request has been submitted. We&rsquo;ll email you next steps within 1–2 business days.
        </p>
        <p className="text-[12px] text-stone-400 mt-2">
          Order #{orderRef}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">

      {/* Step 1: Select items */}
      <div>
        <p className={labelCls}>
          {formType === "exchange" ? "Which item do you want to exchange?" : "Select item(s) to return"}
        </p>
        <div className="space-y-2">
          {orderItems.map((item, i) => {
            const isSelected = !!selectedItems[i];
            return (
              <div
                key={i}
                className={`panel p-4 cursor-pointer transition-colors duration-150 ${
                  isSelected ? "border-stone-500" : "hover:border-stone-300"
                }`}
                onClick={() => toggleItem(i, item.quantity)}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div
                    className={`mt-0.5 shrink-0 w-4 h-4 border flex items-center justify-center transition-colors ${
                      isSelected ? "bg-stone-900 border-stone-900" : "border-stone-300"
                    }`}
                  >
                    {isSelected && (
                      <svg viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.5" style={{ width: 10, height: 10 }}>
                        <path d="M1.5 5.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  {/* Image */}
                  {item.image_url_snapshot && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url_snapshot}
                      alt={item.product_name_snapshot}
                      className="shrink-0 object-cover bg-stone-100"
                      style={{ width: 40, height: 50 }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-stone-800">{item.product_name_snapshot}</p>
                    {item.variant_label_snapshot && (
                      <p className="text-[12px] text-stone-400 mt-0.5">{item.variant_label_snapshot}</p>
                    )}
                  </div>
                  {/* Qty selector (when selected + multi-qty) */}
                  {isSelected && item.quantity > 1 && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <select
                        value={selectedItems[i]}
                        onChange={(e) => setItemQty(i, Number(e.target.value))}
                        className="text-[12px] border border-stone-200 px-2 py-1 bg-white text-stone-700 focus:outline-none"
                      >
                        {Array.from({ length: item.quantity }, (_, n) => n + 1).map((n) => (
                          <option key={n} value={n}>Qty: {n}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exchange only: replacement info */}
      {formType === "exchange" && (
        <div>
          <p className="text-[12px] text-stone-500 leading-relaxed mb-4 italic">
            Need a different size? Exchanges are often faster than returns.
          </p>
          <label className={labelCls}>Desired size or replacement (optional)</label>
          <input
            type="text"
            value={replacementSize}
            onChange={(e) => setReplacementSize(e.target.value)}
            placeholder="e.g. Large, XL, or describe what you need"
            className={inputCls}
          />
          <p className="mt-1.5 text-[11px] text-stone-400">
            Leave blank if you prefer to explain in the notes below.
          </p>
        </div>
      )}

      {/* Reason */}
      <div>
        <label className={labelCls}>Reason</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={inputCls}
        >
          <option value="">Select a reason…</option>
          {reasons.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className={labelCls}>Additional notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any details that might help us process your request…"
          className={inputCls}
          style={{ resize: "vertical" }}
        />
      </div>

      {/* Label option */}
      <div>
        <p className={labelCls}>Return shipping label</p>
        <div className="space-y-3">
          <label
            className={`flex items-start gap-3 panel p-4 cursor-pointer transition-colors duration-150 ${
              labelOption === "prepaid" ? "border-stone-500" : "hover:border-stone-300"
            }`}
          >
            <input
              type="radio"
              name="label_option"
              value="prepaid"
              checked={labelOption === "prepaid"}
              onChange={() => setLabelOption("prepaid")}
              className="mt-0.5 shrink-0"
            />
            <div>
              <p className="text-[13px] text-stone-800 font-medium">
                {formType === "exchange"
                  ? "Prepaid exchange label + reship — $15.99"
                  : "Prepaid return label — $8.99"}
              </p>
              <p className="text-[12px] text-stone-400 mt-0.5">
                {formType === "exchange"
                  ? "We send you a return label and ship your replacement."
                  : "We send you a prepaid return label via email."}
                {" "}Fee deducted from refund.
              </p>
            </div>
          </label>
          <label
            className={`flex items-start gap-3 panel p-4 cursor-pointer transition-colors duration-150 ${
              labelOption === "own_label" ? "border-stone-500" : "hover:border-stone-300"
            }`}
          >
            <input
              type="radio"
              name="label_option"
              value="own_label"
              checked={labelOption === "own_label"}
              onChange={() => setLabelOption("own_label")}
              className="mt-0.5 shrink-0"
            />
            <div>
              <p className="text-[13px] text-stone-800 font-medium">
                Use my own label — free
              </p>
              <p className="text-[12px] text-stone-400 mt-0.5">
                You arrange and pay for return shipping. We&rsquo;ll send you the return address.
              </p>
            </div>
          </label>
        </div>
      </div>

      {errMsg && (
        <p className="text-[12px] text-red-600">{errMsg}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="text-[11px] uppercase tracking-[0.16em] px-8 py-3.5 bg-stone-900 text-white hover:bg-stone-700 transition-colors duration-150 disabled:opacity-50"
      >
        {isPending ? "Submitting…" : `Submit ${formType === "exchange" ? "Exchange" : "Return"} Request`}
      </button>

    </form>
  );
}
