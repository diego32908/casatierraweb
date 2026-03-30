"use client";

import { useRef, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadSiteImage } from "@/app/actions/images";
import { patchSiteSetting } from "@/app/actions/site-settings";

interface Props {
  imageUrl: string | null;
  heading: string;
  subheading: string;
  ctaLabel: string;
  ctaUrl: string;
}

const inputCls =
  "w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-500";
const labelCls = "block text-sm font-medium text-stone-700 mb-1";

export function HeroEditor({ imageUrl, heading, subheading, ctaLabel, ctaUrl }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSaved(false);
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const result = await uploadSiteImage("hero", "image_url", fd);
      if (result.error) setError(result.error);
      else router.refresh();
      if (imageInputRef.current) imageInputRef.current.value = "";
    });
  }

  function handleTextSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await patchSiteSetting("hero", "Homepage Hero", {
        heading: (fd.get("heading") as string)?.trim() || null,
        subheading: (fd.get("subheading") as string)?.trim() || null,
        cta_label: (fd.get("cta_label") as string)?.trim() || "Shop Now",
        cta_url: (fd.get("cta_url") as string)?.trim() || "/shop",
      });
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="panel p-6 space-y-6">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Homepage Hero
      </h2>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Hero image */}
      <div>
        <p className={labelCls}>Hero image</p>
        {imageUrl ? (
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Hero"
              className="h-24 w-36 rounded border border-stone-200 object-cover"
            />
            <div className="mt-1 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isPending}
                className="text-xs text-stone-600 underline underline-offset-2 hover:text-stone-900 disabled:opacity-60"
              >
                Replace
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await patchSiteSetting("hero", "Homepage Hero", { image_url: null });
                    if (result.error) setError(result.error);
                    else router.refresh();
                  });
                }}
                className="text-xs text-red-400 underline underline-offset-2 hover:text-red-600 disabled:opacity-60"
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={isPending}
            className="flex h-24 w-36 items-center justify-center rounded border-2 border-dashed border-stone-300 text-[11px] uppercase tracking-[0.18em] text-stone-400 transition-colors hover:border-stone-400 disabled:opacity-60"
          >
            {isPending ? "Uploading…" : "Upload"}
          </button>
        )}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
      </div>

      {/* Text fields */}
      <form onSubmit={handleTextSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Heading</label>
          <input
            name="heading"
            defaultValue={heading}
            placeholder="Artisan Made With Purpose"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Subheading</label>
          <input
            name="subheading"
            defaultValue={subheading}
            placeholder="Handcrafted clothing, shoes, and cultural pieces…"
            className={inputCls}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Button label</label>
            <input
              name="cta_label"
              defaultValue={ctaLabel}
              placeholder="Shop Now"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Button URL</label>
            <input
              name="cta_url"
              defaultValue={ctaUrl}
              placeholder="/shop"
              className={inputCls}
            />
          </div>
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
