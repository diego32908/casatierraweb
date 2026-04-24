"use client";

import { useRef, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  uploadProductImage,
  removeProductImage,
  promoteToMainImage,
  saveGalleryOrder,
} from "@/app/actions/images";

// ── Client-side image compression ──────────────────────────────────────────────

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_DIMENSION_PX = 2000;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function compressImage(file: File): Promise<{ file: File | null; error?: string }> {
  if (!file.type.startsWith("image/")) return { file };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // If the browser can't decode it, pass through and let the server reject it
    return { file };
  }

  let { width, height } = bitmap;
  if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
    const ratio = Math.min(MAX_DIMENSION_PX / width, MAX_DIMENSION_PX / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const baseName = file.name.replace(/\.[^.]+$/, ".jpg");

  for (const quality of [0.85, 0.72, 0.60]) {
    const blob = await canvasToBlob(canvas, quality);
    if (!blob) break;
    if (blob.size <= MAX_UPLOAD_BYTES) {
      return { file: new File([blob], baseName, { type: "image/jpeg" }) };
    }
  }

  return { file: null, error: "Image is too large to upload even after compression. Please use an image under 2 MB." };
}

interface Props {
  productId: string;
  primaryImageUrl: string | null;
  galleryUrls: string[];
}

export function ImageManager({ productId, primaryImageUrl, galleryUrls }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const primaryInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  function handleError(msg: string | undefined) {
    if (msg) setError(msg);
  }

  function refresh() {
    router.refresh();
  }

  // ── Primary image upload ────────────────────────────────────────────────────

  function handlePrimaryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const { file: compressed, error: compressError } = await compressImage(file);
      if (primaryInputRef.current) primaryInputRef.current.value = "";
      if (compressError || !compressed) { setError(compressError ?? "Compression failed."); return; }
      const fd = new FormData();
      fd.append("file", compressed);
      const result = await uploadProductImage(productId, "primary", fd);
      handleError(result.error);
      if (!result.error) refresh();
    });
  }

  function handleRemovePrimary() {
    if (!confirm("Remove the main image?")) return;
    setError(null);
    startTransition(async () => {
      const result = await removeProductImage(productId, primaryImageUrl!, "primary");
      handleError(result.error);
      if (!result.error) refresh();
    });
  }

  // ── Gallery upload ──────────────────────────────────────────────────────────

  function handleGalleryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);
    startTransition(async () => {
      for (const file of files) {
        const { file: compressed, error: compressError } = await compressImage(file);
        if (compressError || !compressed) { setError(compressError ?? "Compression failed."); break; }
        const fd = new FormData();
        fd.append("file", compressed);
        const result = await uploadProductImage(productId, "gallery", fd);
        if (result.error) { handleError(result.error); break; }
      }
      refresh();
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    });
  }

  // ── Gallery reorder ─────────────────────────────────────────────────────────

  function moveImage(index: number, direction: "up" | "down") {
    const next = [...galleryUrls];
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setError(null);
    startTransition(async () => {
      const result = await saveGalleryOrder(productId, next);
      handleError(result.error);
      if (!result.error) refresh();
    });
  }

  function handleRemoveGallery(url: string) {
    if (!confirm("Remove this image from the gallery?")) return;
    setError(null);
    startTransition(async () => {
      const result = await removeProductImage(productId, url, "gallery");
      handleError(result.error);
      if (!result.error) refresh();
    });
  }

  function handlePromote(url: string) {
    setError(null);
    startTransition(async () => {
      const result = await promoteToMainImage(productId, url);
      handleError(result.error);
      if (!result.error) refresh();
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="panel p-6 space-y-6">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Images
      </h2>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Primary image */}
      <div>
        <p className="mb-1 text-sm font-medium text-stone-700">Main image</p>
        <p className="mb-3 text-xs text-stone-400">Best results: white/neutral background, product centered, 3:4 or 4:5 portrait, JPG under 2 MB.</p>

        {primaryImageUrl ? (
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={primaryImageUrl}
              alt="Primary"
              className="h-28 w-28 rounded border border-stone-200 object-cover"
            />
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => primaryInputRef.current?.click()}
                disabled={isPending}
                className="text-xs text-stone-600 underline underline-offset-2 hover:text-stone-900 disabled:opacity-60"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleRemovePrimary}
                disabled={isPending}
                className="text-xs text-red-500 underline underline-offset-2 hover:text-red-700 disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => primaryInputRef.current?.click()}
            disabled={isPending}
            className="flex h-28 w-28 items-center justify-center rounded border-2 border-dashed border-stone-300 text-[11px] uppercase tracking-[0.18em] text-stone-400 transition-colors hover:border-stone-400 hover:text-stone-600 disabled:opacity-60"
          >
            {isPending ? "Uploading…" : "Upload"}
          </button>
        )}

        <input
          ref={primaryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePrimaryChange}
        />
      </div>

      {/* Gallery */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-stone-700">Gallery</p>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={isPending}
            className="text-sm text-stone-700 underline underline-offset-2 hover:text-stone-900 disabled:opacity-60"
          >
            + Add images
          </button>
        </div>

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleGalleryChange}
        />

        {galleryUrls.length === 0 ? (
          <p className="text-sm text-stone-400">No gallery images yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {galleryUrls.map((url, i) => (
              <div key={url} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Gallery ${i + 1}`}
                  className="aspect-square w-full rounded border border-stone-200 object-cover"
                />
                {/* Overlay actions */}
                <div className="absolute inset-0 flex flex-col justify-between rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => moveImage(i, "up")}
                      disabled={isPending || i === 0}
                      className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-stone-700 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(i, "down")}
                      disabled={isPending || i === galleryUrls.length - 1}
                      className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-stone-700 disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handlePromote(url)}
                      disabled={isPending}
                      className="flex-1 rounded bg-white/90 py-0.5 text-[10px] font-medium text-stone-700 disabled:opacity-30"
                    >
                      Set main
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveGallery(url)}
                      disabled={isPending}
                      className="flex-1 rounded bg-red-500/90 py-0.5 text-[10px] font-medium text-white disabled:opacity-30"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isPending && (
        <p className="text-xs text-stone-400">Working…</p>
      )}
    </div>
  );
}
