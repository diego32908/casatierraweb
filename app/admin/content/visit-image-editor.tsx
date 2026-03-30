"use client";

import { useRef, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadSiteImage } from "@/app/actions/images";
import { patchSiteSetting } from "@/app/actions/site-settings";

interface Props {
  imageUrl: string | null;
}

export function VisitImageEditor({ imageUrl }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const result = await uploadSiteImage("visit_page", "image_url", fd);
      if (result.error) setError(result.error);
      else router.refresh();
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="panel p-6 space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Visit Page Image
      </h2>
      <p className="text-sm text-stone-500">
        Left-column image on the /visit page. If empty, a neutral placeholder is shown.
      </p>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {imageUrl ? (
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Visit page"
            className="h-28 w-20 rounded border border-stone-200 object-cover"
          />
          <div className="mt-1 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
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
                  const result = await patchSiteSetting("visit_page", "Visit Page", { image_url: null });
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
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="flex h-28 w-20 items-center justify-center rounded border-2 border-dashed border-stone-300 text-[11px] uppercase tracking-[0.18em] text-stone-400 transition-colors hover:border-stone-400 disabled:opacity-60"
        >
          {isPending ? "Uploading…" : "Upload"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
