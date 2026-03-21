"use client";

import { useMemo, useState } from "react";
import type { Product, ProductVariant } from "@/types/store";

export function SizeFitBox({
  product,
  selectedVariant,
}: {
  product: Product;
  selectedVariant: ProductVariant | null;
}) {
  const [unit, setUnit] = useState<"cm" | "in">("cm");

  const isShoes = product.category === "shoes" || product.size_mode === "shoes_us";
  const measurementData = useMemo(() => {
    if (!selectedVariant) return null;
    return unit === "cm"
      ? selectedVariant.measurements_cm
      : selectedVariant.measurements_in;
  }, [selectedVariant, unit]);

  return (
    <section className="panel">
      <div className="flex items-center justify-between border-b border-stone-300 px-5 py-4">
        <h2 className="text-lg font-semibold">Size and Fit</h2>

        {!isShoes ? (
          <div className="inline-flex rounded-full border border-stone-300 p-1 text-sm">
            <button
              onClick={() => setUnit("cm")}
              className={`rounded-full px-4 py-1 ${unit === "cm" ? "bg-stone-900 text-white" : ""}`}
            >
              Centimeters
            </button>
            <button
              onClick={() => setUnit("in")}
              className={`rounded-full px-4 py-1 ${unit === "in" ? "bg-stone-900 text-white" : ""}`}
            >
              Inches
            </button>
          </div>
        ) : null}
      </div>

      {isShoes ? (
        <div className="overflow-x-auto px-5 py-5">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="table-line">
                <th className="py-3 pr-6 font-medium">System</th>
                <th className="py-3 pr-6 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="table-line">
                <td className="py-3 pr-6 text-stone-500">US</td>
                <td className="py-3">{selectedVariant?.us_size ?? selectedVariant?.size_label ?? "-"}</td>
              </tr>
              <tr className="table-line">
                <td className="py-3 pr-6 text-stone-500">EU</td>
                <td className="py-3">{selectedVariant?.eu_size ?? "-"}</td>
              </tr>
              <tr className="table-line">
                <td className="py-3 pr-6 text-stone-500">UK</td>
                <td className="py-3">{selectedVariant?.uk_size ?? "-"}</td>
              </tr>
              <tr className="table-line">
                <td className="py-3 pr-6 text-stone-500">MX</td>
                <td className="py-3">{selectedVariant?.mx_size ?? "-"}</td>
              </tr>
              <tr>
                <td className="py-3 pr-6 text-stone-500">JP</td>
                <td className="py-3">{selectedVariant?.jp_size ?? "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto px-5 py-5">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="table-line">
                <th className="py-3 pr-6 font-medium">Measurement</th>
                <th className="py-3 font-medium">{selectedVariant?.size_label ?? "Selected Size"}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="table-line">
                <td className="py-3 pr-6 text-stone-500">Bust</td>
                <td className="py-3">{measurementData?.bust ?? "-"}</td>
              </tr>
              <tr className="table-line">
                <td className="py-3 pr-6 text-stone-500">Underbust</td>
                <td className="py-3">{measurementData?.underbust ?? "-"}</td>
              </tr>
              <tr className="table-line">
                <td className="py-3 pr-6 text-stone-500">Waist</td>
                <td className="py-3">{measurementData?.waist ?? "-"}</td>
              </tr>
              <tr className="table-line">
                <td className="py-3 pr-6 text-stone-500">Hip</td>
                <td className="py-3">{measurementData?.hip ?? "-"}</td>
              </tr>
              <tr className="table-line">
                <td className="py-3 pr-6 text-stone-500">Inseam</td>
                <td className="py-3">{measurementData?.inseam ?? "-"}</td>
              </tr>
              <tr>
                <td className="py-3 pr-6 text-stone-500">Notes</td>
                <td className="py-3">{measurementData?.notes ?? "True to size"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
