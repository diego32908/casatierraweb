"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { patchSiteSetting } from "@/app/actions/site-settings";

const inputCls =
  "w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-500";
const labelCls = "block text-sm font-medium text-stone-700 mb-1";

interface Props {
  enabled: boolean;
  text: string;
  url: string | null;
}

export function AnnouncementEditor({ enabled, text, url }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await patchSiteSetting("announcement_bar", "Announcement Bar", {
        enabled: fd.get("enabled") === "on",
        text: (fd.get("text") as string).trim(),
        url: (fd.get("url") as string).trim() || null,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="panel p-6 space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Announcement Bar
      </h2>
      <p className="text-sm text-stone-500">
        Slim banner shown above the logo when enabled. Leave URL blank for a plain message.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
          <input type="checkbox" name="enabled" defaultChecked={enabled} />
          Show announcement bar
        </label>

        <div>
          <label className={labelCls}>Message *</label>
          <input
            name="text"
            required
            defaultValue={text}
            placeholder="Free shipping on orders over $75"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Link URL (optional)</label>
          <input
            name="url"
            type="url"
            defaultValue={url ?? ""}
            placeholder="https://..."
            className={inputCls}
          />
        </div>

        {error && (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {saved && (
          <p className="text-sm text-green-700">Saved.</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
