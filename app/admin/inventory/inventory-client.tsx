"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { getStockStatus } from "@/lib/stock";
import { ProductRowActions } from "./product-row-actions";

// ── Types ──────────────────────────────────────────────────────────────────────

type VariantStub = { stock: number; low_stock_threshold: number };

export type InventoryProduct = {
  id: string;
  name_en: string;
  slug: string;
  category: string;
  size_mode: string;
  base_price_cents: number;
  featured: boolean;
  is_active: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  variants: VariantStub[];
};

type CategoryTab =
  | "all" | "men" | "women" | "kids"
  | "pottery" | "home_decor" | "accessories" | "shoes";

type StatusFilter =
  | "all" | "active" | "private" | "low_stock" | "sold_out" | "featured";

type SortKey = "recently_updated" | "recently_created" | "price_asc" | "price_desc";

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORY_TABS: { value: CategoryTab; label: string }[] = [
  { value: "all",         label: "All" },
  { value: "men",         label: "Men" },
  { value: "women",       label: "Women" },
  { value: "kids",        label: "Kids" },
  { value: "pottery",     label: "Pottery" },
  { value: "home_decor",  label: "Home Decor" },
  { value: "accessories", label: "Accessories" },
  { value: "shoes",       label: "Shoes" },
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all",       label: "All" },
  { value: "active",    label: "Active" },
  { value: "private",   label: "Private" },
  { value: "low_stock", label: "Low Stock" },
  { value: "sold_out",  label: "Sold Out" },
  { value: "featured",  label: "Featured" },
];

const chip = "text-[11px] uppercase tracking-widest px-3 py-1.5 border transition-colors";
const chipOn = "border-stone-900 bg-stone-900 text-white";
const chipOff = "border-stone-200 text-stone-500 hover:border-stone-400";

// ── Stock helpers ──────────────────────────────────────────────────────────────

function productStockStatus(p: InventoryProduct) {
  if (p.size_mode === "none") return "untracked";
  if (!p.variants.length) return "sold_out";
  const statuses = p.variants.map((v) => getStockStatus(v.stock, v.low_stock_threshold));
  if (statuses.every((s) => s === "sold_out")) return "sold_out";
  if (statuses.some((s) => s === "low_stock")) return "low_stock";
  return "in_stock";
}

function StockChip({ product }: { product: InventoryProduct }) {
  const s = productStockStatus(product);
  if (s === "untracked")
    return <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-400">Not tracked</span>;
  if (!product.variants.length)
    return <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-400">No variants</span>;
  if (s === "sold_out")
    return <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">Sold out</span>;
  if (s === "low_stock")
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Low stock</span>;
  return <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">In stock</span>;
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  products: InventoryProduct[];
}

export function InventoryClient({ products }: Props) {
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState<CategoryTab>("all");
  const [status, setStatus]       = useState<StatusFilter>("active");
  const [showArchived, setShowArchived] = useState(false);
  const [sort, setSort]           = useState<SortKey>("recently_updated");

  // Debounce search input (200 ms)
  useEffect(() => {
    const t = setTimeout(() => setSearch(rawSearch.trim()), 200);
    return () => clearTimeout(t);
  }, [rawSearch]);

  // Non-archived pool (base for all normal-view counts)
  const nonArchived = useMemo(() => products.filter((p) => !p.is_archived), [products]);
  const archivedCount = products.length - nonArchived.length;

  // Status-filtered pool (used for category counts in normal view)
  const statusPool = useMemo(() => {
    if (showArchived) return products.filter((p) => p.is_archived);
    return nonArchived.filter((p) => {
      if (status === "active")    return p.is_active;
      if (status === "private")   return !p.is_active;
      if (status === "low_stock") return productStockStatus(p) === "low_stock";
      if (status === "sold_out")  return productStockStatus(p) === "sold_out";
      if (status === "featured")  return p.featured;
      return true;
    });
  }, [products, nonArchived, showArchived, status]);

  // Counts shown on status chips — always over all non-archived, all categories
  const statusCounts = useMemo(() => ({
    all:       nonArchived.length,
    active:    nonArchived.filter((p) => p.is_active).length,
    private:   nonArchived.filter((p) => !p.is_active).length,
    low_stock: nonArchived.filter((p) => productStockStatus(p) === "low_stock").length,
    sold_out:  nonArchived.filter((p) => productStockStatus(p) === "sold_out").length,
    featured:  nonArchived.filter((p) => p.featured).length,
  }), [nonArchived]);

  // Counts shown on category tabs — reflect current status filter
  const categoryCounts = useMemo(() => {
    const c: Record<string, number> = { all: statusPool.length };
    for (const cat of ["men", "women", "kids", "pottery", "home_decor", "accessories", "shoes"]) {
      c[cat] = statusPool.filter((p) => p.category === cat).length;
    }
    return c;
  }, [statusPool]);

  // Final filtered + sorted list for the product table
  const filtered = useMemo(() => {
    let result = statusPool;

    if (category !== "all") {
      result = result.filter((p) => p.category === category);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name_en.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    return [...result].sort((a, b) => {
      if (sort === "recently_updated")
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sort === "recently_created")
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "price_asc")
        return a.base_price_cents - b.base_price_cents;
      if (sort === "price_desc")
        return b.base_price_cents - a.base_price_cents;
      return 0;
    });
  }, [statusPool, category, search, sort]);

  return (
    <div className="space-y-4">
      {/* ── Search + Sort ── */}
      <div className="flex items-center gap-3">
        <input
          type="search"
          placeholder="Search by name, slug, or category…"
          value={rawSearch}
          onChange={(e) => setRawSearch(e.target.value)}
          className="w-full max-w-sm rounded border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-500"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded border border-stone-300 px-2 py-2 text-sm text-stone-600 focus:outline-none focus:ring-1 focus:ring-stone-500"
        >
          <option value="recently_updated">Recently Updated</option>
          <option value="recently_created">Recently Created</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
        </select>
      </div>

      {/* ── Category tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setCategory(tab.value)}
            className={`${chip} ${category === tab.value ? chipOn : chipOff}`}
          >
            {tab.label} ({categoryCounts[tab.value] ?? 0})
          </button>
        ))}
      </div>

      {/* ── Status chips + Archived toggle ── */}
      <div className="flex gap-2 flex-wrap items-center">
        {!showArchived &&
          STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={`${chip} ${status === f.value ? chipOn : chipOff}`}
            >
              {f.label} ({statusCounts[f.value]})
            </button>
          ))}
        {!showArchived && <span className="self-center text-stone-200">|</span>}
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className={`${chip} ${
            showArchived
              ? "border-amber-400 bg-amber-50 text-amber-700"
              : "border-stone-200 text-stone-400 hover:border-stone-400"
          }`}
        >
          Archived ({archivedCount})
        </button>
      </div>

      {/* ── Product list ── */}
      <div className="panel">
        {filtered.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-stone-500">
              {products.length === 0 ? (
                <>
                  No products yet.{" "}
                  <Link href="/admin/inventory/new" className="underline underline-offset-2">
                    Add your first product.
                  </Link>
                </>
              ) : (
                "No products match these filters."
              )}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-200">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors"
              >
                <Link
                  href={`/admin/inventory/${product.id}`}
                  className="min-w-0 flex-1 space-y-0.5"
                >
                  <p className="truncate text-sm font-medium text-stone-900">
                    {product.name_en}
                  </p>
                  <p className="text-xs text-stone-400">{product.slug}</p>
                </Link>

                <div className="flex shrink-0 items-center gap-4 pl-4">
                  <div className="hidden text-right sm:block">
                    <p className="text-xs capitalize text-stone-500">
                      {product.category.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-stone-400">{product.size_mode}</p>
                  </div>

                  <p className="w-16 text-right text-sm text-stone-700">
                    {formatPrice(product.base_price_cents)}
                  </p>

                  <div className="flex items-center gap-2">
                    <StockChip product={product} />
                    {product.featured && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        Featured
                      </span>
                    )}
                    {product.is_archived ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                        Archived
                      </span>
                    ) : (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          product.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {product.is_active ? "Active" : "Private"}
                      </span>
                    )}
                  </div>

                  <ProductRowActions
                    id={product.id}
                    isActive={product.is_active}
                    isArchived={product.is_archived}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
