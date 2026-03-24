"use client";

import { useRef, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadSiteImage } from "@/app/actions/images";
import { patchSiteSetting } from "@/app/actions/site-settings";

interface Props {
  imageUrl: string | null;
  enabled: boolean;
  heading: string;
}

const inputCls =
  "w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-500";
const labelCls = "block text-sm font-medium text-stone-700 mb-1";

export function PopupEditor({ imageUrl, enabled, heading }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const result = await uploadSiteImage("popup", "image_url", fd);
      if (result.error) setError(result.error);
      else router.refresh();
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function handleSettingsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await patchSiteSetting("popup", "Popup / Signup Overlay", {
        enabled: fd.get("enabled") === "on",
        heading: (fd.get("heading") as string)?.trim() || null,
      });
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="panel p-6 space-y-6">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Popup / Signup Overlay
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Shown to first-time visitors. The popup component itself is implemented in Phase 3.
        </p>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Image */}
      <div>
        <p className={labelCls}>Popup image</p>
        {imageUrl ? (
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Popup"
              className="h-24 w-24 rounded border border-stone-200 object-cover"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isPending}
              className="mt-1 text-xs text-stone-600 underline underline-offset-2 hover:text-stone-900 disabled:opacity-60"
            >
              Replace
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isPending}
            className="flex h-24 w-24 items-center justify-center rounded border-2 border-dashed border-stone-300 text-[10px] uppercase tracking-[0.18em] text-stone-400 hover:border-stone-400 disabled:opacity-60"
          >
            {isPending ? "…" : "Upload"}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
      </div>

      {/* Settings */}
      <form onSubmit={handleSettingsSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Popup heading</label>
          <input
            name="heading"
            defaultValue={heading}
            placeholder="e.g. Join the community"
            className={inputCls}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={enabled}
            className="h-4 w-4"
          />
          <span className="text-sm text-stone-700">
            Popup enabled
            <span className="ml-2 text-stone-400">(takes effect when the popup component is live)</span>
          </span>
        </label>

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
