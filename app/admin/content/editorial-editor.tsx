"use client";

import { useRef, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadSiteImage } from "@/app/actions/images";

interface Props {
  imageUrl: string | null;
}

export function EditorialEditor({ imageUrl }: Props) {
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
      const result = await uploadSiteImage("editorial_break", "image_url", fd);
      if (result.error) setError(result.error);
      else router.refresh();
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="panel p-6 space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Editorial Break Image
      </h2>
      <p className="text-sm text-stone-500">
        Full-width lifestyle image shown between Best Sellers and New Arrivals.
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
            alt="Editorial break"
            className="h-20 w-36 rounded border border-stone-200 object-cover"
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
          className="flex h-20 w-36 items-center justify-center rounded border-2 border-dashed border-stone-300 text-[11px] uppercase tracking-[0.18em] text-stone-400 transition-colors hover:border-stone-400 disabled:opacity-60"
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
