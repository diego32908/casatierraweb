"use client";

import { useState, useTransition } from "react";
import { subscribeEmail } from "@/app/actions/subscribe";
import { loadPromo, savePromo, markSubscribed } from "@/lib/promo";

type State = "idle" | "success" | "duplicate" | "error";

export function FooterNewsletter() {
  const [email, setEmail]   = useState("");
  const [state, setState]   = useState<State>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("idle");
    startTransition(async () => {
      const result = await subscribeEmail(email, "footer");
      if (result.duplicate) {
        // Already subscribed — suppress popup/checkout promo for this browser session
        savePromo(markSubscribed(loadPromo(), null));
        setState("duplicate");
      } else if (result.error) {
        setErrMsg(result.error);
        setState("error");
      } else {
        // Successfully subscribed — suppress popup and checkout promo going forward
        savePromo(markSubscribed(loadPromo(), null));
        setState("success");
      }
    });
  }

  if (state === "success") {
    return (
      <div>
        <p className="text-[11px] uppercase tracking-widest text-stone-500 mb-6">
          Stay Connected
        </p>
        <p className="text-[13px] text-stone-500 leading-[1.9]">
          You&rsquo;re on the list.
        </p>
      </div>
    );
  }

  if (state === "duplicate") {
    return (
      <div>
        <p className="text-[11px] uppercase tracking-widest text-stone-500 mb-6">
          Stay Connected
        </p>
        <p className="text-[13px] text-stone-500 leading-[1.9]">
          This email is already subscribed.
        </p>
        <p className="text-[13px] text-stone-400 leading-[1.9]">
          Check your inbox for your offer.
        </p>
        <p className="text-[11px] text-stone-300 leading-[1.9] mt-1">
          First-order offer sent at signup.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-stone-500 mb-6">
        Stay Connected
      </p>

      <p className="text-[13px] text-stone-400 leading-[1.9] mb-6">
        Early access, new arrivals, and updates from Oaxaca.
      </p>

      {state === "error" && (
        <p className="text-[12px] text-red-500 mb-3">{errMsg}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 max-w-md">
        <div
          className="flex items-center gap-2"
          style={{
            background: "#F1EFE9",
            padding: "10px 14px",
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            disabled={isPending}
            style={{ height: 24 }}
            className="flex-1 bg-transparent text-[13px] text-stone-700 placeholder-stone-400 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isPending}
            aria-label="Subscribe"
            className="text-stone-400 hover:text-stone-700 transition-colors duration-150 text-[16px] leading-none shrink-0 disabled:opacity-40"
          >
            {isPending ? "…" : "→"}
          </button>
        </div>
      </form>
    </div>
  );
}
