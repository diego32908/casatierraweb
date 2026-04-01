"use client";

import { useRef, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadSiteImage } from "@/app/actions/images";
import { patchSiteSetting } from "@/app/actions/site-settings";

interface Props {
  imageUrl: string | null;
  enabled: boolean;
  heading: string;
  bodyCopy: string;
  discountText: string;
  promoCode: string;
  ctaLabel: string;
  finePrint: string;
  layout: "split" | "centered";
}

const inputCls =
  "w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-500";
const labelCls = "block text-sm font-medium text-stone-700 mb-1";

export function PopupEditor({
  imageUrl,
  enabled,
  heading,
  bodyCopy,
  discountText,
  promoCode,
  ctaLabel,
  finePrint,
  layout,
}: Props) {
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
        layout: fd.get("layout") === "split" ? "split" : "centered",
        heading: (fd.get("heading") as string)?.trim() || null,
        body_copy: (fd.get("body_copy") as string)?.trim() || null,
        discount_text: (fd.get("discount_text") as string)?.trim() || null,
        promo_code: (fd.get("promo_code") as string)?.trim() || null,
        cta_label: (fd.get("cta_label") as string)?.trim() || null,
        fine_print: (fd.get("fine_print") as string)?.trim() || null,
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
          Shown to first-time visitors after 7 seconds or 40% scroll depth.
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
        <p className="mb-2 text-xs text-stone-400">
          Split layout: fills left panel. Centered layout: appears at top.
        </p>
        {imageUrl ? (
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Popup"
              className="h-24 w-24 rounded border border-stone-200 object-cover"
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
                    const result = await patchSiteSetting("popup", "Popup / Signup Overlay", { image_url: null });
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

      {/* Settings form */}
      <form onSubmit={handleSettingsSubmit} className="space-y-5">
        {/* Layout */}
        <div>
          <p className={labelCls}>Layout</p>
          <div className="flex gap-6 mt-1">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="layout"
                value="centered"
                defaultChecked={layout !== "split"}
                className="h-4 w-4"
              />
              <span className="text-sm text-stone-700">
                Centered <span className="text-stone-400">(compact card)</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="layout"
                value="split"
                defaultChecked={layout === "split"}
                className="h-4 w-4"
              />
              <span className="text-sm text-stone-700">
                Split <span className="text-stone-400">(image + content)</span>
              </span>
            </label>
          </div>
        </div>

        {/* Discount text */}
        <div>
          <label className={labelCls}>Discount / offer text</label>
          <input
            name="discount_text"
            defaultValue={discountText}
            placeholder="e.g. 15% Off"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-stone-400">
            Displayed large as the main hook. Keep it short.
          </p>
        </div>

        {/* Promo code */}
        <div>
          <label className={labelCls}>Promo code</label>
          <input
            name="promo_code"
            defaultValue={promoCode}
            placeholder="e.g. WELCOME15"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-stone-400">
            Must match an active Stripe Promotion Code exactly (case-sensitive). After signup, the
            code is saved to the visitor&apos;s browser and <strong>auto-applied</strong> when they
            proceed to Stripe checkout — they don&apos;t need to type it. Leave blank to disable
            the offer.
          </p>
        </div>

        {/* Heading */}
        <div>
          <label className={labelCls}>Headline</label>
          <input
            name="heading"
            defaultValue={heading}
            placeholder="e.g. Join the community"
            className={inputCls}
          />
        </div>

        {/* Body copy */}
        <div>
          <label className={labelCls}>Supporting copy</label>
          <textarea
            name="body_copy"
            defaultValue={bodyCopy}
            placeholder="e.g. Be the first to know about new arrivals and exclusive offers."
            rows={2}
            className={inputCls}
          />
        </div>

        {/* CTA label */}
        <div>
          <label className={labelCls}>Button label</label>
          <input
            name="cta_label"
            defaultValue={ctaLabel}
            placeholder="e.g. Claim Offer"
            className={inputCls}
          />
        </div>

        {/* Fine print */}
        <div>
          <label className={labelCls}>Fine print</label>
          <input
            name="fine_print"
            defaultValue={finePrint}
            placeholder="e.g. No spam. Unsubscribe anytime."
            className={inputCls}
          />
        </div>

        {/* Enabled toggle */}
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={enabled}
            className="h-4 w-4"
          />
          <span className="text-sm text-stone-700">Popup enabled</span>
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
