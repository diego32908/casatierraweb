"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ProductCard } from "@/components/product/product-card";
import type { ProductCardData } from "@/components/product/product-card";

export interface FilterableProduct extends Omit<ProductCardData, "variants"> {
  created_at: string;
  category?: string;
  variants?: Array<{
    color_name: string | null;
    color_hex: string | null;
    size_label: string | null;
  }>;
}

type SortKey    = "featured" | "newest" | "price_asc" | "price_desc";
type PriceKey   = "under50" | "50to100" | "over100";
type SubcatTab  = "all" | "apparel" | "shoes" | "accessories";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured",   label: "Featured" },
  { value: "newest",     label: "Newest first" },
  { value: "price_asc",  label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

const PRICE_OPTIONS: { key: PriceKey; label: string }[] = [
  { key: "under50", label: "Under $50" },
  { key: "50to100", label: "$50 – $100" },
  { key: "over100", label: "$100+" },
];

const SUBCAT_TABS: { value: SubcatTab; label: string }[] = [
  { value: "all",         label: "All" },
  { value: "apparel",     label: "Apparel" },
  { value: "shoes",       label: "Shoes" },
  { value: "accessories", label: "Accessories" },
];

const SHOES_CATS     = new Set(["shoes"]);
const ACCESSOR_CATS  = new Set(["accessories", "home_decor", "pottery"]);
const ALPHA_SIZES    = ["XS", "S", "M", "L", "XL", "XXL"];
const LIGHT_COLORS   = new Set(["#f5f5f5", "#f5f0e8", "#ede8d8", "#d4c5a9"]);

function toSubcat(category?: string): Exclude<SubcatTab, "all"> {
  if (!category)                  return "apparel";
  if (SHOES_CATS.has(category))   return "shoes";
  if (ACCESSOR_CATS.has(category)) return "accessories";
  return "apparel";
}

function inPriceRange(cents: number, key: PriceKey) {
  if (key === "under50")  return cents < 5000;
  if (key === "50to100")  return cents >= 5000 && cents <= 10000;
  return cents > 10000;
}

interface Props {
  initialProducts: FilterableProduct[];
  showSizeFilter?:  boolean;
  showSubcatTabs?:  boolean;
}

export function CategoryFilterSort({
  initialProducts,
  showSizeFilter  = true,
  showSubcatTabs  = false,
}: Props) {
  const [sort, setSort]                 = useState<SortKey>("featured");
  const [sortOpen, setSortOpen]         = useState(false);
  const [subcatTab, setSubcatTab]       = useState<SubcatTab>("all");
  const [priceFilter, setPriceFilter]   = useState<PriceKey | null>(null);
  const [colorFilters, setColorFilters] = useState<Set<string>>(new Set());
  const [sizeFilters, setSizeFilters]   = useState<Set<string>>(new Set());
  const [panelOpen, setPanelOpen]       = useState(false);

  const sortRef = useRef<HTMLDivElement>(null);

  // ── Subcategory counts (off the full list, for tab visibility) ────────────
  const subcatCounts = useMemo(() => {
    const c = { all: initialProducts.length, apparel: 0, shoes: 0, accessories: 0 };
    for (const p of initialProducts) c[toSubcat(p.category)]++;
    return c;
  }, [initialProducts]);

  const visibleTabs = SUBCAT_TABS.filter(
    t => t.value === "all" || subcatCounts[t.value] > 0
  );

  // ── Tab-scoped product list (feeds color/size option derivation) ──────────
  const tabFiltered = useMemo(
    () => subcatTab === "all"
      ? initialProducts
      : initialProducts.filter(p => toSubcat(p.category) === subcatTab),
    [initialProducts, subcatTab]
  );

  // ── Derived color / size option lists ─────────────────────────────────────
  const allColors = useMemo(() => {
    const seen = new Set<string>();
    const list: { name: string; hex: string | null }[] = [];
    for (const p of tabFiltered) {
      for (const v of p.variants ?? []) {
        if (v.color_name && !seen.has(v.color_name)) {
          seen.add(v.color_name);
          list.push({ name: v.color_name, hex: v.color_hex ?? null });
        }
      }
    }
    return list;
  }, [tabFiltered]);

  const allSizes = useMemo(() => {
    if (!showSizeFilter) return [];
    const present = new Set<string>();
    for (const p of tabFiltered) {
      for (const v of p.variants ?? []) {
        if (v.size_label) present.add(v.size_label);
      }
    }
    const ordered = ALPHA_SIZES.filter(s => present.has(s));
    const extras  = [...present].filter(s => !ALPHA_SIZES.includes(s)).sort();
    return [...ordered, ...extras];
  }, [tabFiltered, showSizeFilter]);

  const hasActiveFilters  = priceFilter !== null || colorFilters.size > 0 || sizeFilters.size > 0;
  const activeFilterCount = (priceFilter ? 1 : 0) + colorFilters.size + sizeFilters.size;

  // ── Active tag strip ──────────────────────────────────────────────────────
  const activeTags = useMemo(() => {
    const tags: { id: string; label: string; remove: () => void }[] = [];
    if (priceFilter) {
      const label = PRICE_OPTIONS.find(o => o.key === priceFilter)?.label ?? priceFilter;
      tags.push({ id: `p:${priceFilter}`, label, remove: () => setPriceFilter(null) });
    }
    for (const name of colorFilters) {
      tags.push({
        id: `c:${name}`,
        label: name,
        remove: () => setColorFilters(prev => { const n = new Set(prev); n.delete(name); return n; }),
      });
    }
    for (const size of sizeFilters) {
      tags.push({
        id: `s:${size}`,
        label: size,
        remove: () => setSizeFilters(prev => { const n = new Set(prev); n.delete(size); return n; }),
      });
    }
    return tags;
  }, [priceFilter, colorFilters, sizeFilters]);

  // ── Fully filtered + sorted list ──────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...tabFiltered];

    if (priceFilter)        result = result.filter(p => inPriceRange(p.base_price_cents, priceFilter));
    if (colorFilters.size > 0) result = result.filter(p => p.variants?.some(v => v.color_name && colorFilters.has(v.color_name)));
    if (sizeFilters.size > 0)  result = result.filter(p => p.variants?.some(v => v.size_label  && sizeFilters.has(v.size_label)));

    if (sort === "price_asc")  result.sort((a, b) => a.base_price_cents - b.base_price_cents);
    if (sort === "price_desc") result.sort((a, b) => b.base_price_cents - a.base_price_cents);
    if (sort === "newest")     result.sort((a, b) => b.created_at.localeCompare(a.created_at));

    return result;
  }, [tabFiltered, priceFilter, colorFilters, sizeFilters, sort]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    setPriceFilter(null);
    setColorFilters(new Set());
    setSizeFilters(new Set());
  }, []);

  const toggleColor = (name: string) =>
    setColorFilters(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });

  const toggleSize = (size: string) =>
    setSizeFilters(prev => { const n = new Set(prev); n.has(size) ? n.delete(size) : n.add(size); return n; });

  // ── Side-effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sortOpen) return;
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sortOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSortOpen(false); setPanelOpen(false); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = panelOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [panelOpen]);

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label ?? "Featured";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Subcategory tab strip ─────────────────────────────────────────── */}
      {showSubcatTabs && visibleTabs.length > 1 && (
        <div className="mb-8 flex items-center gap-1" role="tablist" aria-label="Product type">
          {visibleTabs.map(tab => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={subcatTab === tab.value}
              onClick={() => setSubcatTab(tab.value)}
              className={`px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] border transition-colors duration-200 ${
                subcatTab === tab.value
                  ? "border-stone-300 text-stone-900"
                  : "border-transparent text-stone-400 hover:text-stone-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Controls bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
          {filtered.length}
          {filtered.length !== initialProducts.length && ` / ${initialProducts.length}`}
          {" "}{filtered.length === 1 ? "item" : "items"}
        </p>

        <div className="flex items-center gap-6">
          {/* Filter button */}
          <button
            onClick={() => { setPanelOpen(true); setSortOpen(false); }}
            className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500 hover:text-stone-900 transition-colors duration-200"
          >
            Filter
            {activeFilterCount > 0 && (
              <span className="tabular-nums text-[9px] font-medium text-stone-900">
                ({activeFilterCount})
              </span>
            )}
          </button>

          <span className="h-3 w-px bg-stone-200" />

          {/* Custom sort dropdown */}
          <div ref={sortRef} className="relative">
            <button
              onClick={() => setSortOpen(v => !v)}
              aria-expanded={sortOpen}
              aria-haspopup="listbox"
              className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500 hover:text-stone-900 transition-colors duration-200"
            >
              {currentSortLabel}
              <svg
                className={`h-2.5 w-2.5 text-stone-400 transition-transform duration-200 ${sortOpen ? "-rotate-180" : ""}`}
                viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"
              >
                <path d="M1.5 3.5l3.5 3.5 3.5-3.5" />
              </svg>
            </button>

            <div
              role="listbox"
              className={`absolute right-0 top-full z-30 mt-3 min-w-[188px] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.07)] transition-all duration-150 origin-top-right ${
                sortOpen
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-[0.97] pointer-events-none"
              }`}
            >
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  role="option"
                  aria-selected={sort === opt.value}
                  onClick={() => { setSort(opt.value); setSortOpen(false); }}
                  className={`flex w-full items-center justify-between px-5 py-3.5 text-left text-[11px] uppercase tracking-[0.18em] transition-colors duration-100 ${
                    sort === opt.value
                      ? "text-stone-900 bg-stone-50/70"
                      : "text-stone-500 hover:text-stone-900 hover:bg-stone-50/60"
                  }`}
                >
                  {opt.label}
                  {sort === opt.value && (
                    <svg className="ml-4 h-2.5 w-2.5 flex-none text-stone-600" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Active filter tag strip ───────────────────────────────────────── */}
      {activeTags.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {activeTags.map(tag => (
            <button
              key={tag.id}
              onClick={tag.remove}
              className="group flex items-center gap-1.5 border border-stone-200 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-stone-600 transition-colors duration-150 hover:border-stone-400 hover:text-stone-900"
            >
              {tag.label}
              <svg
                className="h-2 w-2 text-stone-400 transition-colors duration-150 group-hover:text-stone-700"
                viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5"
              >
                <path d="M1 1l6 6M7 1L1 7" />
              </svg>
            </button>
          ))}
          <button
            onClick={clearAll}
            className="ml-1 text-[10px] uppercase tracking-[0.16em] text-stone-400 underline underline-offset-2 transition-colors duration-150 hover:text-stone-900"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Product grid ─────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <p className="py-24 text-center text-sm text-stone-400">No products match your filters.</p>
      ) : (
        <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6 md:gap-y-14">
          {filtered.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {/* ── Filter panel ─────────────────────────────────────────────────── */}
      {panelOpen && (
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-40 bg-stone-900/15 backdrop-blur-[2px]"
            onClick={() => setPanelOpen(false)}
          />

          <div
            role="dialog"
            aria-label="Filter products"
            className="fixed inset-x-0 bottom-0 z-50 bg-white shadow-2xl md:inset-x-auto md:bottom-auto md:right-8 md:top-36 md:w-72"
          >
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
              <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-stone-900">
                Filters
              </span>
              <div className="flex items-center gap-5">
                {hasActiveFilters && (
                  <button
                    onClick={clearAll}
                    className="text-[10px] uppercase tracking-[0.18em] text-stone-400 underline underline-offset-2 transition-colors duration-150 hover:text-stone-900"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setPanelOpen(false)}
                  aria-label="Close filters"
                  className="text-stone-400 transition-colors duration-150 hover:text-stone-900"
                >
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 3l10 10M13 3L3 13" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-6 py-7 space-y-9 md:max-h-[65vh]">

              <section>
                <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.28em] text-stone-400">
                  Price
                </p>
                <div className="space-y-4">
                  {PRICE_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setPriceFilter(priceFilter === opt.key ? null : opt.key)}
                      className={`w-full text-left text-[13px] tracking-wide transition-colors duration-150 ${
                        priceFilter === opt.key
                          ? "text-stone-900"
                          : "text-stone-400 hover:text-stone-700"
                      }`}
                    >
                      <span className={priceFilter === opt.key ? "border-b border-stone-800 pb-px" : ""}>
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {allColors.length > 0 && (
                <section>
                  <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.28em] text-stone-400">
                    Color
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {allColors.map(c => (
                      <button
                        key={c.name}
                        title={c.name}
                        aria-label={c.name}
                        aria-pressed={colorFilters.has(c.name)}
                        onClick={() => toggleColor(c.name)}
                        className="h-6 w-6 rounded-full transition-transform duration-150 hover:scale-110 focus:outline-none"
                        style={{
                          backgroundColor: c.hex ?? "#d6d3d1",
                          outline: colorFilters.has(c.name)
                            ? "1.5px solid #1c1917"
                            : c.hex && LIGHT_COLORS.has(c.hex.toLowerCase())
                            ? "1px solid #d6d3d1"
                            : "1px solid transparent",
                          outlineOffset: colorFilters.has(c.name) ? "2.5px" : "0",
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}

              {showSizeFilter && allSizes.length > 0 && (
                <section>
                  <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.28em] text-stone-400">
                    Size
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allSizes.map(size => (
                      <button
                        key={size}
                        aria-pressed={sizeFilters.has(size)}
                        onClick={() => toggleSize(size)}
                        className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] border transition-all duration-150 ${
                          sizeFilters.has(size)
                            ? "border-stone-800 text-stone-900"
                            : "border-stone-200 text-stone-400 hover:border-stone-400 hover:text-stone-700"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </section>
              )}

            </div>
          </div>
        </>
      )}
    </>
  );
}
