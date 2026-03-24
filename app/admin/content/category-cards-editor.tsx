"use client";

import { useRef, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadCategoryCardImage } from "@/app/actions/images";

interface CardData {
  key: string;
  label: string;
  hint: string;
  image_url: string | null;
}

// Isolated per-card uploader — defined at module level to avoid remount issues
function CardUploader({
  card,
  isPending,
  onUpload,
}: {
  card: CardData;
  isPending: boolean;
  onUpload: (cardKey: string, fd: FormData) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    onUpload(card.key, fd);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-stone-800">{card.label}</p>
        <p className="text-xs text-stone-500">{card.hint}</p>
      </div>

      {card.image_url ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.image_url}
            alt={card.label}
            className="aspect-[3/4] w-full rounded border border-stone-200 object-cover"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isPending}
            className="absolute bottom-2 right-2 rounded bg-white/90 px-2 py-1 text-[10px] font-medium text-stone-700 shadow-sm hover:bg-white disabled:opacity-60"
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="flex aspect-[3/4] w-full items-center justify-center rounded border-2 border-dashed border-stone-300 text-[10px] uppercase tracking-[0.18em] text-stone-400 transition-colors hover:border-stone-400 hover:text-stone-500 disabled:opacity-60"
        >
          {isPending ? "…" : "Upload"}
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

interface Props {
  cards: CardData[];
}

export function CategoryCardsEditor({ cards }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleUpload(cardKey: string, fd: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await uploadCategoryCardImage(cardKey, fd);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="panel p-6 space-y-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Category Cards
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          One image per card. Shown at 3:4 ratio on the homepage.
        </p>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-4">
        {cards.map((card) => (
          <CardUploader
            key={card.key}
            card={card}
            isPending={isPending}
            onUpload={handleUpload}
          />
        ))}
      </div>
    </div>
  );
}
