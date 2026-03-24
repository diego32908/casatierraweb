"use client";

import { useState } from "react";
import type { Product, ProductVariant } from "@/types/store";

function hasShoeData(v: ProductVariant): boolean {
  return !!(v.us_size || v.eu_size || v.uk_size || v.mx_size || v.jp_size);
}

function hasApparelData(v: ProductVariant): boolean {
  return !!(v.measurements_cm || v.measurements_in);
}

// Shoe sizing is determined solely by size_mode — audience handles men's/women's/kids'
function isShoeSizing(product: Product): boolean {
  return product.size_mode === "shoes_us";
}

const FIT_STYLE_LABELS: Record<string, string> = {
  fitted: "Fitted",
  relaxed: "Relaxed",
  oversized: "Oversized",
};

interface Props {
  product: Product;
  selectedVariant: ProductVariant | null;
}

export function SizeFitBox({ product, selectedVariant }: Props) {
  const [unit, setUnit] = useState<"cm" | "in">("cm");

  const isShoes = isShoeSizing(product);
  const showShoeChart = isShoes && selectedVariant && hasShoeData(selectedVariant);
  const showApparelChart = !isShoes && selectedVariant && hasApparelData(selectedVariant);
  const showFitStyle = !!product.fit_style;
  const showFitNote = !!product.fit_note;

  if (!showShoeChart && !showApparelChart && !showFitStyle && !showFitNote) {
    return null;
  }

  const mdata =
    selectedVariant && !isShoes
      ? unit === "cm"
        ? selectedVariant.measurements_cm
        : selectedVariant.measurements_in
      : null;

  return (
    <section className="panel">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-300 px-5 py-4">
        <h2 className="text-lg font-semibold">Size &amp; Fit</h2>

        {/* cm/in toggle — only for apparel measurement chart */}
        {showApparelChart && (
          <div className="inline-flex rounded-full border border-stone-300 p-1 text-sm">
            <button
              onClick={() => setUnit("cm")}
              className={`rounded-full px-4 py-1 transition-colors ${
                unit === "cm" ? "bg-stone-900 text-white" : "text-stone-600"
              }`}
            >
              cm
            </button>
            <button
              onClick={() => setUnit("in")}
              className={`rounded-full px-4 py-1 transition-colors ${
                unit === "in" ? "bg-stone-900 text-white" : "text-stone-600"
              }`}
            >
              in
            </button>
          </div>
        )}
      </div>

      {/* Fit style badge */}
      {showFitStyle && (
        <div className="flex items-center gap-3 border-b border-stone-200 px-5 py-4">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Fit
          </span>
          <span className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-700">
            {FIT_STYLE_LABELS[product.fit_style!]}
          </span>
        </div>
      )}

      {/* Fit note */}
      {showFitNote && (
        <div className="border-b border-stone-200 px-5 py-4">
          <p className="text-sm text-stone-600">{product.fit_note}</p>
        </div>
      )}

      {/* Shoe conversion table */}
      {showShoeChart && selectedVariant && (
        <div className="overflow-x-auto px-5 py-5">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="table-line">
                <th className="py-2 pr-8 font-medium text-stone-700">System</th>
                <th className="py-2 font-medium text-stone-700">Size</th>
              </tr>
            </thead>
            <tbody>
              {selectedVariant.us_size && (
                <tr className="table-line">
                  <td className="py-2 pr-8 text-stone-500">US</td>
                  <td className="py-2">{selectedVariant.us_size}</td>
                </tr>
              )}
              {selectedVariant.eu_size && (
                <tr className="table-line">
                  <td className="py-2 pr-8 text-stone-500">EU</td>
                  <td className="py-2">{selectedVariant.eu_size}</td>
                </tr>
              )}
              {selectedVariant.uk_size && (
                <tr className="table-line">
                  <td className="py-2 pr-8 text-stone-500">UK</td>
                  <td className="py-2">{selectedVariant.uk_size}</td>
                </tr>
              )}
              {selectedVariant.mx_size && (
                <tr className="table-line">
                  <td className="py-2 pr-8 text-stone-500">MX</td>
                  <td className="py-2">{selectedVariant.mx_size}</td>
                </tr>
              )}
              {selectedVariant.jp_size && (
                <tr>
                  <td className="py-2 pr-8 text-stone-500">JP</td>
                  <td className="py-2">{selectedVariant.jp_size}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Apparel measurement table */}
      {showApparelChart && selectedVariant && (
        <div className="overflow-x-auto px-5 py-5">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="table-line">
                <th className="py-2 pr-8 font-medium text-stone-700">Measurement</th>
                <th className="py-2 font-medium text-stone-700">
                  {selectedVariant.size_label}
                </th>
              </tr>
            </thead>
            <tbody>
              {mdata?.bust && (
                <tr className="table-line">
                  <td className="py-2 pr-8 text-stone-500">Bust</td>
                  <td className="py-2">{mdata.bust}</td>
                </tr>
              )}
              {mdata?.underbust && (
                <tr className="table-line">
                  <td className="py-2 pr-8 text-stone-500">Underbust</td>
                  <td className="py-2">{mdata.underbust}</td>
                </tr>
              )}
              {mdata?.waist && (
                <tr className="table-line">
                  <td className="py-2 pr-8 text-stone-500">Waist</td>
                  <td className="py-2">{mdata.waist}</td>
                </tr>
              )}
              {mdata?.hip && (
                <tr className="table-line">
                  <td className="py-2 pr-8 text-stone-500">Hip</td>
                  <td className="py-2">{mdata.hip}</td>
                </tr>
              )}
              {mdata?.inseam && (
                <tr className="table-line">
                  <td className="py-2 pr-8 text-stone-500">Inseam</td>
                  <td className="py-2">{mdata.inseam}</td>
                </tr>
              )}
              {mdata?.foot_length && (
                <tr className="table-line">
                  <td className="py-2 pr-8 text-stone-500">Foot length</td>
                  <td className="py-2">{mdata.foot_length}</td>
                </tr>
              )}
              {mdata?.notes && (
                <tr>
                  <td className="py-2 pr-8 text-stone-500">Notes</td>
                  <td className="py-2">{mdata.notes}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
