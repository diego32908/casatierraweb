"use client";

import { useState, useTransition } from "react";
import { updateSizeChartOverride } from "@/app/actions/product-size-chart";

interface Props {
  productId: string;
  currentOverride: object | null;
}

export function SizeChartOverrideEditor({ productId, currentOverride }: Props) {
  const [value, setValue] = useState(
    currentOverride ? JSON.stringify(currentOverride, null, 2) : ""
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleSave() {
    setMessage(null);
    let parsed: object | null = null;

    if (value.trim()) {
      try {
        parsed = JSON.parse(value.trim());
      } catch {
        setMessage({ type: "error", text: "Invalid JSON — check your syntax." });
        return;
      }
    }

    startTransition(async () => {
      const result = await updateSizeChartOverride(productId, parsed);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Size chart override saved." });
      }
    });
  }

  function handleClear() {
    setValue("");
    setMessage(null);
    startTransition(async () => {
      const result = await updateSizeChartOverride(productId, null);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Size chart override cleared — using default." });
      }
    });
  }

  return (
    <div className="panel p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Size Chart Override</h2>
        <p className="mt-1 text-xs text-stone-500">
          Optional. Paste JSON to replace the default chart for this product. Leave blank to use the standard chart.
        </p>
      </div>

      <details className="text-xs text-stone-400">
        <summary className="cursor-pointer select-none hover:text-stone-600">
          JSON format reference
        </summary>
        <pre className="mt-2 overflow-x-auto rounded bg-stone-50 p-3 text-[11px] leading-relaxed">
{`// Apparel:
{
  "type": "apparel",
  "rows": [
    { "label": "Chest", "valuesIn": { "S": 36, "M": 38, "L": 40 } },
    { "label": "Waist", "valuesIn": { "S": 28, "M": 30, "L": 32 } }
  ],
  "note": "Measurements in inches."
}

// Shoes:
{
  "type": "shoes",
  "entries": [
    { "us": "7", "eu": "40", "mx": "25" },
    { "us": "8", "eu": "41", "mx": "26" }
  ]
}`}
        </pre>
      </details>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={12}
        placeholder='{"type": "apparel", "rows": [...]}'
        className="w-full rounded border border-stone-200 bg-white p-3 font-mono text-xs leading-relaxed text-stone-800 focus:border-stone-400 focus:outline-none"
        spellCheck={false}
      />

      {message && (
        <p className={`text-xs ${message.type === "error" ? "text-red-600" : "text-green-700"}`}>
          {message.text}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-full bg-stone-900 px-5 py-2 text-xs font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save Override"}
        </button>
        {(currentOverride || value.trim()) && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isPending}
            className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
