"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteProduct, setProductActive, setProductArchived } from "@/app/actions/products";

interface Props {
  id: string;
  isActive: boolean;
  isArchived: boolean;
}

export function ProductRowActions({ id, isActive, isArchived }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggleActive(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    startTransition(async () => {
      const result = await setProductActive(id, !isActive);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleArchive(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    startTransition(async () => {
      const result = await setProductArchived(id, true);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleRestore(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    startTransition(async () => {
      const result = await setProductArchived(id, false);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Permanently delete this product? This cannot be undone.")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProduct(id);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div
      className="flex items-center gap-2"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {error && (
        <span className="max-w-[200px] text-[10px] text-red-600 leading-tight">{error}</span>
      )}

      {isArchived ? (
        // Archived view: Restore + Delete only
        <>
          <button
            type="button"
            onClick={handleRestore}
            disabled={isPending}
            className="rounded px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-40 bg-stone-100 text-stone-600 hover:bg-stone-200"
          >
            {isPending ? "…" : "Restore"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-40 bg-red-50 text-red-600 hover:bg-red-100"
          >
            Delete
          </button>
        </>
      ) : (
        // Normal view: Set Private/Public + Archive + Delete
        <>
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={isPending}
            title={isActive ? "Set private (hide from storefront)" : "Set public (show on storefront)"}
            className="rounded px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-40 bg-stone-100 text-stone-600 hover:bg-stone-200"
          >
            {isPending ? "…" : isActive ? "Set Private" : "Set Public"}
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={isPending}
            title="Archive this product (hide from inventory without deleting)"
            className="rounded px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-40 bg-stone-100 text-stone-500 hover:bg-stone-200"
          >
            Archive
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            title="Permanently delete product"
            className="rounded px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-40 bg-red-50 text-red-600 hover:bg-red-100"
          >
            Delete
          </button>
        </>
      )}
    </div>
  );
}
