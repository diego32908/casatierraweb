"use client";

import { useState, useTransition } from "react";
import { patchSiteSetting } from "@/app/actions/site-settings";
import { useRouter } from "next/navigation";

interface Props {
  instagramUrl: string;
  tiktokUrl: string;
  etsyUrl: string;
}

const inputCls =
  "w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-500";
const labelCls = "block text-sm font-medium text-stone-700 mb-1";

export function SocialLinksEditor({ instagramUrl, tiktokUrl, etsyUrl }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await patchSiteSetting("social_links", "Social Links", {
        instagram_url: (fd.get("instagram_url") as string)?.trim() || null,
        tiktok_url:    (fd.get("tiktok_url")    as string)?.trim() || null,
        etsy_url:      (fd.get("etsy_url")       as string)?.trim() || null,
      });
      if (result.error) setError(result.error);
      else { setSaved(true); router.refresh(); }
    });
  }

  return (
    <div className="panel p-6 space-y-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Social Links
      </h2>
      <p className="text-sm text-stone-500">
        Update social URLs here. Icons in the footer stay fixed — only the destinations change.
      </p>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Instagram URL</label>
          <input
            name="instagram_url"
            defaultValue={instagramUrl}
            placeholder="https://www.instagram.com/..."
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>TikTok URL</label>
          <input
            name="tiktok_url"
            defaultValue={tiktokUrl}
            placeholder="https://www.tiktok.com/@..."
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Etsy URL</label>
          <input
            name="etsy_url"
            defaultValue={etsyUrl}
            placeholder="https://www.etsy.com/shop/..."
            className={inputCls}
          />
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
