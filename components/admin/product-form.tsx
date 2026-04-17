"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import type { Product, Audience, FitStyle } from "@/types/store";
import { createProduct, updateProduct } from "@/app/actions/products";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "women",       label: "Women  →  Women's nav" },
  { value: "dress",       label: "Dress  →  Women's nav" },
  { value: "skirt",       label: "Skirt  →  Women's nav" },
  { value: "men",         label: "Men  →  Men's nav" },
  { value: "kids",        label: "Kids & Toddlers  →  Kids nav" },
  { value: "accessories", label: "Accessories  →  Accessories nav" },
  { value: "shoes",       label: "Shoes  →  Accessories nav" },
  { value: "home_decor",  label: "Home & Décor  →  Home nav" },
  { value: "pottery",     label: "Pottery / Ceramics  →  Home nav" },
];


const SIZE_MODES = [
  { value: "none", label: "No sizing (pottery, home decor…)" },
  { value: "one_size", label: "One size (stock tracked, no selector)" },
  { value: "alpha", label: "Alpha (XS / S / M / L / XL)" },
  { value: "numeric", label: "Numeric (0 / 2 / 4 / 6…)" },
  { value: "kids", label: "Kids (2T / 4T / 5 / 6 / 7…)" },
  { value: "shoes_us", label: "Shoes — US sizing" },
  { value: "custom", label: "Custom" },
] as const;

const AUDIENCES: { value: Audience; label: string }[] = [
  { value: "unisex", label: "Unisex / not specified" },
  { value: "mens", label: "Men's" },
  { value: "womens", label: "Women's" },
  { value: "kids", label: "Kids'" },
];

const VESSEL_TYPES = [
  { value: "",         label: "— Not set" },
  { value: "mug",      label: "Mug" },
  { value: "cup",      label: "Cup" },
  { value: "plate",    label: "Plate" },
  { value: "bowl",     label: "Bowl" },
  { value: "pot",      label: "Pot" },
  { value: "vase",     label: "Vase" },
  { value: "planter",  label: "Planter" },
  { value: "decor",    label: "Décor / other" },
] as const;

const FIT_STYLES: { value: FitStyle | ""; label: string }[] = [
  { value: "", label: "— Not set" },
  { value: "fitted", label: "Fitted" },
  { value: "relaxed", label: "Relaxed" },
  { value: "oversized", label: "Oversized" },
];

const inputCls =
  "w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-500";
const labelCls = "block text-sm font-medium text-stone-700 mb-1";

interface Props {
  product?: Product;
}

export function ProductForm({ product }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      if (product) {
        const result = await updateProduct(product.id, formData);
        if (result.error) {
          setError(result.error);
        } else {
          router.push("/admin/inventory");
        }
      } else {
        const result = await createProduct(formData);
        if (result.error) {
          setError(result.error);
        } else {
          // Go to edit page so variants can be added immediately
          router.push(result.id ? `/admin/inventory/${result.id}` : "/admin/inventory");
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Core fields */}
      <div className="panel p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Core
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Name (EN) *</label>
            <input
              name="name_en"
              required
              defaultValue={product?.name_en}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Name (ES)</label>
            <input
              name="name_es"
              defaultValue={product?.name_es}
              placeholder="Falls back to EN name if blank"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Slug *</label>
            <input
              name="slug"
              required
              defaultValue={product?.slug}
              placeholder="e.g. clay-bowl-terracotta"
              className={inputCls}
            />
          </div>
          <div className="grid gap-3 grid-cols-2">
            <div>
              <label className={labelCls}>Price (USD) *</label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={
                  product ? (product.base_price_cents / 100).toFixed(2) : ""
                }
                placeholder="0.00"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Compare-at price</label>
              <input
                name="compare_at_price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={
                  product?.compare_at_price_cents
                    ? (product.compare_at_price_cents / 100).toFixed(2)
                    : ""
                }
                placeholder="Was price"
                className={inputCls}
              />
              <p className="mt-1 text-[11px] text-stone-400">
                Original price — shown crossed out when set
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Category *</label>
            <select
              name="category"
              required
              defaultValue={product?.category ?? "accessories"}
              className={inputCls}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Audience *</label>
            <select
              name="audience"
              required
              defaultValue={product?.audience ?? "unisex"}
              className={inputCls}
            >
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Size mode *</label>
            <select
              name="size_mode"
              required
              defaultValue={product?.size_mode ?? "none"}
              className={inputCls}
            >
              {SIZE_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Fit style</label>
            <select
              name="fit_style"
              defaultValue={product?.fit_style ?? ""}
              className={inputCls}
            >
              {FIT_STYLES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 pt-1">
          <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={product?.is_active ?? true}
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={product?.featured ?? false}
            />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              name="show_measurements"
              defaultChecked={product?.show_measurements ?? true}
            />
            Show measurements
          </label>
        </div>
      </div>

      {/* Content fields */}
      <div className="panel p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Content
        </h2>

        <div>
          <label className={labelCls}>Description (EN)</label>
          <textarea
            name="description_en"
            rows={3}
            defaultValue={product?.description_en ?? ""}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Description (ES)</label>
          <textarea
            name="description_es"
            rows={3}
            defaultValue={product?.description_es ?? ""}
            className={inputCls}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Fit note</label>
            <input
              name="fit_note"
              defaultValue={product?.fit_note ?? ""}
              placeholder="e.g. Runs small. Size up."
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Material</label>
            <input
              name="material"
              defaultValue={product?.material ?? ""}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Care notes</label>
          <textarea
            name="care_notes"
            rows={2}
            defaultValue={product?.care_notes ?? ""}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Search keywords <span className="text-stone-400 font-normal">(internal — not shown to customers)</span></label>
          <input
            name="search_keywords"
            defaultValue={product?.search_keywords ?? ""}
            placeholder="e.g. linen, clay, handmade, barro, dress, oaxaca"
            className={inputCls}
          />
          <p className="mt-1 text-[11px] text-stone-400">
            Comma-separated. Helps customers find this product when searching terms not in the title.
          </p>
        </div>
      </div>

      {/* Shipping */}
      <div className="panel p-6 space-y-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Shipping <span className="font-normal normal-case tracking-normal text-stone-400">— optional</span>
          </h2>
          <p className="mt-1 text-[11px] text-stone-400">
            Leave blank for small apparel items. Recommended for fragile, heavy, or oversized items (pottery, barro, home décor).
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Weight <span className="text-stone-400 font-normal">(optional)</span></label>
            <div className="flex gap-2">
              <input
                name="weight_value"
                type="number"
                step="0.01"
                min="0"
                defaultValue={(() => {
                  if (!product?.weight_oz) return "";
                  // Display in lb if >= 16 oz, otherwise oz
                  return product.weight_oz >= 16
                    ? (product.weight_oz / 16).toFixed(2).replace(/\.?0+$/, "")
                    : product.weight_oz.toString();
                })()}
                placeholder="e.g. 2.5"
                className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-500"
              />
              <select
                name="weight_unit"
                defaultValue={product?.weight_oz && product.weight_oz >= 16 ? "lb" : "oz"}
                className="rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-500"
              >
                <option value="oz">oz</option>
                <option value="lb">lb</option>
              </select>
            </div>
            <p className="mt-1 text-[11px] text-stone-400">16 oz = 1 lb</p>
          </div>
        </div>

        <div>
          <label className={labelCls}>Dimensions in inches <span className="text-stone-400 font-normal">(optional)</span></label>
          <div className="grid gap-3 grid-cols-3">
            <div>
              <p className="text-[11px] text-stone-400 mb-1">Length</p>
              <input
                name="length_in"
                type="number"
                step="0.1"
                min="0"
                defaultValue={product?.length_in ?? ""}
                placeholder="0.0"
                className={inputCls}
              />
            </div>
            <div>
              <p className="text-[11px] text-stone-400 mb-1">Width</p>
              <input
                name="width_in"
                type="number"
                step="0.1"
                min="0"
                defaultValue={product?.width_in ?? ""}
                placeholder="0.0"
                className={inputCls}
              />
            </div>
            <div>
              <p className="text-[11px] text-stone-400 mb-1">Height</p>
              <input
                name="height_in"
                type="number"
                step="0.1"
                min="0"
                defaultValue={product?.height_in ?? ""}
                placeholder="0.0"
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pottery & Home Display */}
      <div className="panel p-6 space-y-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Pottery &amp; Home Display
          </h2>
          <p className="mt-1 text-[11px] text-stone-400">
            For barro, ceramics, and home décor items. Leave blank for apparel.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Vessel / product type</label>
            <select
              name="vessel_type"
              defaultValue={product?.vessel_type ?? ""}
              className={inputCls}
            >
              {VESSEL_TYPES.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Size label (display)</label>
            <input
              name="size_label_display"
              defaultValue={product?.size_label_display ?? ""}
              placeholder="e.g. Large serving bowl"
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-stone-400">
              Shown on the product page instead of a size selector
            </p>
          </div>
        </div>

        <div>
          <label className={labelCls}>Dimensions display</label>
          <input
            name="dimensions_display"
            defaultValue={product?.dimensions_display ?? ""}
            placeholder="e.g. 12 in diameter · 4 in tall"
            className={inputCls}
          />
          <p className="mt-1 text-[11px] text-stone-400">
            Free-form text shown on the product page (e.g. "16 oz · 4 in tall")
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {isPending ? "Saving…" : product ? "Save changes" : "Create product"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/inventory")}
          className="rounded border border-stone-300 px-5 py-2 text-sm text-stone-700 hover:bg-stone-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
