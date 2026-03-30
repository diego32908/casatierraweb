"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSubmissionStatus } from "@/app/actions/contact";

const NEXT_STATUS: Record<string, "new" | "read" | "resolved"> = {
  new:      "read",
  read:     "resolved",
  resolved: "new",
};

const LABELS: Record<string, string> = {
  new:      "Mark read",
  read:     "Mark resolved",
  resolved: "Reopen",
};

interface Props {
  id: string;
  current: "new" | "read" | "resolved";
}

export function StatusToggle({ id, current }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const next = NEXT_STATUS[current];
    startTransition(async () => {
      await updateSubmissionStatus(id, next);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-[11px] uppercase tracking-[0.14em] text-stone-400 hover:text-stone-800 transition-colors duration-150 disabled:opacity-50"
    >
      {isPending ? "Saving…" : LABELS[current]}
    </button>
  );
}
