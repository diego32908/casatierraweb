"use client";

import { useState, useTransition } from "react";
import { resendSubscriberEmail } from "@/app/actions/admin-subscribers";

export function ResendButton({ subscriberId }: { subscriberId: string }) {
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setState("idle");
    startTransition(async () => {
      const result = await resendSubscriberEmail(subscriberId);
      setState(result.error ? "error" : "sent");
    });
  }

  if (state === "sent") {
    return <span className="text-[11px] text-green-700">Sent</span>;
  }
  if (state === "error") {
    return <span className="text-[11px] text-red-500">Failed</span>;
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-[11px] uppercase tracking-widest text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-40"
    >
      {isPending ? "…" : "Resend"}
    </button>
  );
}
