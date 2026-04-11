"use client";

import { useState, useMemo } from "react";
import type { Product, ProductVariant } from "@/types/store";
import { getCanonicalSizes } from "@/lib/sizing";
import {
  getChartFamily,
  APPAREL_CHARTS,
  SHOE_CHARTS,
  formatValue,
  type ApparelChartData,
  type ShoeChartData,
} from "@/lib/size-chart-data";

interface Props {
  product: Product;
  variants: ProductVariant[];
}

// ── Heading ───────────────────────────────────────────────────────────────────

function chartHeading(product: Product): string {
  const { audience, size_mode, category } = product;
  if (size_mode === "shoes_us" || category === "shoes") {
    if (audience === "mens")   return "Men's Shoe Size Guide";
    if (audience === "womens") return "Women's Shoe Size Guide";
    if (audience === "kids")   return "Kids' Shoe Size Guide";
    return "Shoe Size Guide";
  }
  if (audience === "mens")   return "Men's Size Guide";
  if (audience === "womens") return "Women's Size Guide";
  if (audience === "kids")   return "Kids' Size Guide";
  return "Size Guide";
}

// ── Column helpers ────────────────────────────────────────────────────────────

/**
 * Returns the size columns to display in the apparel chart.
 * Base sizes (S M L XL) always appear.
 * Optional sizes (XS 2XL 3XL 4XL) only appear if admin created a variant.
 */
function getApparelColumns(product: Product, variants: ProductVariant[]): string[] {
  const canonicalSizes = getCanonicalSizes(product);
  const allLabels = new Set(variants.map((v) => v.size_label.trim()));

  if (!canonicalSizes) {
    const byLabel = new Map<string, number>();
    for (const v of variants) {
      if (!byLabel.has(v.size_label)) byLabel.set(v.size_label, v.size_sort);
    }
    return [...allLabels].sort(
      (a, b) => (byLabel.get(a) ?? 0) - (byLabel.get(b) ?? 0)
    );
  }

  return canonicalSizes
    .filter((cs) => !cs.optional || allLabels.has(cs.label))
    .map((cs) => cs.label);
}

/**
 * Returns the US shoe sizes this product actually carries (any color),
 * in canonical size order.
 */
function getShoeColumns(product: Product, variants: ProductVariant[]): string[] {
  const canonicalSizes = getCanonicalSizes(product);
  const allLabels = new Set(variants.map((v) => v.size_label.trim()));

  if (!canonicalSizes) {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const v of [...variants].sort((a, b) => a.size_sort - b.size_sort)) {
      if (!seen.has(v.size_label)) { seen.add(v.size_label); result.push(v.size_label); }
    }
    return result;
  }

  return canonicalSizes
    .filter((cs) => allLabels.has(cs.label))
    .map((cs) => cs.label);
}

// ── Apparel chart subcomponent ────────────────────────────────────────────────

function ApparelChart({
  chartData,
  sizeColumns,
}: {
  chartData: ApparelChartData;
  sizeColumns: string[];
}) {
  const [unit, setUnit] = useState<"in" | "cm">("in");

  if (sizeColumns.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Inches / Centimeters segmented toggle */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-stone-400">Units</span>
        <div className="inline-flex rounded-full border border-stone-200 p-0.5">
          {(["in", "cm"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              className={`rounded-full px-4 py-1 text-xs transition-colors ${
                unit === u
                  ? "bg-stone-900 text-white"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              {u === "in" ? "Inches" : "Centimeters"}
            </button>
          ))}
        </div>
      </div>

      {/* Measurement table — rows: measurements, columns: sizes */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-28 border-b border-stone-200 pb-3 pr-5 text-left text-xs font-medium text-stone-400" />
              {sizeColumns.map((size) => (
                <th
                  key={size}
                  className="border-b border-stone-200 pb-3 px-4 text-center text-xs font-semibold uppercase tracking-[0.1em] text-stone-700"
                >
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chartData.rows.map((row) => (
              <tr key={row.label} className="border-b border-stone-100 last:border-b-0">
                <td className="py-3 pr-5 text-xs text-stone-400">{row.label}</td>
                {sizeColumns.map((size) => {
                  const raw = row.valuesIn[size];
                  return (
                    <td
                      key={size}
                      className="py-3 px-4 text-center text-sm text-stone-700"
                    >
                      {raw !== undefined ? formatValue(raw, unit) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {chartData.note && (
        <p className="text-[11px] leading-5 text-stone-400">{chartData.note}</p>
      )}
    </div>
  );
}

// ── Shoe chart subcomponent ───────────────────────────────────────────────────

function ShoeChart({
  chartData,
  sizeColumns,
}: {
  chartData: ShoeChartData;
  sizeColumns: string[];
}) {
  // Show only the rows for sizes this product carries
  const rows = chartData.entries.filter((e) => sizeColumns.includes(e.us));

  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-stone-200 pb-3 pr-6 text-left text-xs font-semibold uppercase tracking-[0.1em] text-stone-700">
              US
            </th>
            <th className="border-b border-stone-200 pb-3 px-4 text-left text-xs font-medium uppercase tracking-[0.1em] text-stone-400">
              EU
            </th>
            <th className="border-b border-stone-200 pb-3 px-4 text-left text-xs font-medium uppercase tracking-[0.1em] text-stone-400">
              MX
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => (
            <tr key={entry.us} className="border-b border-stone-100 last:border-b-0">
              <td className="py-3 pr-6 text-sm font-medium text-stone-900">{entry.us}</td>
              <td className="py-3 px-4 text-sm text-stone-600">{entry.eu}</td>
              <td className="py-3 px-4 text-sm text-stone-600">{entry.mx}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Fit style labels ──────────────────────────────────────────────────────────

const FIT_STYLE_LABELS: Record<string, string> = {
  fitted:    "Fitted",
  relaxed:   "Relaxed",
  oversized: "Oversized",
};

// ── Main export ───────────────────────────────────────────────────────────────

export function SizeChartSection({ product, variants }: Props) {
  const chartFamily = getChartFamily(product);
  const hasFitInfo  = !!product.fit_note || !!product.fit_style;
  const isApparel   = product.size_mode === "alpha" || product.size_mode === "kids";
  const isShoes     = product.size_mode === "shoes_us" || product.category === "shoes";

  // Compute columns unconditionally (hook rules — no early return before hooks)
  const apparelColumns = useMemo(
    () => getApparelColumns(product, variants),
    [product, variants]
  );
  const shoeColumns = useMemo(
    () => getShoeColumns(product, variants),
    [product, variants]
  );

  if (!chartFamily && !hasFitInfo && !product.size_chart_override) return null;

  // Use per-product override when present
  const override = product.size_chart_override;
  const overrideApparelChart: ApparelChartData | null =
    override?.type === "apparel" ? { rows: override.rows, note: override.note } : null;
  const overrideShoeChart: ShoeChartData | null =
    override?.type === "shoes" ? { entries: override.entries } : null;

  const apparelChart = overrideApparelChart
    ?? (isApparel && chartFamily ? APPAREL_CHARTS[chartFamily as keyof typeof APPAREL_CHARTS] ?? null : null);
  const shoeChart = overrideShoeChart
    ?? (isShoes && chartFamily ? SHOE_CHARTS[chartFamily as keyof typeof SHOE_CHARTS] ?? null : null);

  return (
    <div className="space-y-7">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
        {chartHeading(product)}
      </h2>

      {hasFitInfo && (
        <div className="flex flex-wrap items-center gap-3">
          {product.fit_style && (
            <span className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-600">
              {FIT_STYLE_LABELS[product.fit_style]}
            </span>
          )}
          {product.fit_note && (
            <p className="text-sm text-stone-600">{product.fit_note}</p>
          )}
        </div>
      )}

      {(isApparel || overrideApparelChart) && apparelChart && (
        <ApparelChart
          chartData={apparelChart}
          sizeColumns={overrideApparelChart ? Object.keys(overrideApparelChart.rows[0]?.valuesIn ?? {}) : apparelColumns}
        />
      )}

      {(isShoes || overrideShoeChart) && shoeChart && (
        <ShoeChart
          chartData={shoeChart}
          sizeColumns={overrideShoeChart ? shoeChart.entries.map((e) => e.us) : shoeColumns}
        />
      )}
    </div>
  );
}
