"use client";

import { useState, useTransition } from "react";
import { updateSizeChartOverride } from "@/app/actions/product-size-chart";
import { formatValue } from "@/lib/size-chart-data";

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_APPAREL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const DEFAULT_KIDS_SIZES    = ["2T", "3T", "4T", "5", "6", "8", "10", "12", "14", "16"];
const DEFAULT_ROW_LABELS    = ["Chest", "Waist", "Hip"];

// ── Types ─────────────────────────────────────────────────────────────────────

type ChartMode   = "default" | "custom";
type PreviewUnit = "in" | "cm";

interface ApparelRowState {
  id: string;
  label: string;
  values: Record<string, string>; // size → raw string input (may be "")
}

interface ApparelState {
  sizes: string[];
  rows: ApparelRowState[];
  note: string;
}

interface ShoeEntryState {
  id: string;
  us: string;
  eu: string;
  mx: string;
}

interface ShoeState {
  entries: ShoeEntryState[];
}

interface Props {
  productId: string;
  /** Product's size_mode — used to determine apparel vs shoe editor and default sizes. */
  sizeMode: string;
  currentOverride: object | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2);
}

function isShoeMode(sizeMode: string) {
  return sizeMode === "shoes_us";
}

function defaultSizes(sizeMode: string) {
  if (sizeMode === "kids")     return DEFAULT_KIDS_SIZES;
  if (sizeMode === "one_size") return ["One Size"];
  return DEFAULT_APPAREL_SIZES; // alpha, numeric, etc.
}

function initApparelState(override: object | null, sizeMode: string): ApparelState {
  const defSizes = defaultSizes(sizeMode);

  if (override && (override as Record<string, unknown>).type === "apparel") {
    const ov = override as {
      rows: Array<{ label: string; valuesIn: Record<string, number> }>;
      note?: string;
    };
    const sizes = ov.rows[0] ? Object.keys(ov.rows[0].valuesIn) : defSizes;
    return {
      sizes,
      rows: ov.rows.map((r) => ({
        id: uid(),
        label: r.label,
        values: Object.fromEntries(
          Object.entries(r.valuesIn).map(([k, v]) => [k, String(v)])
        ),
      })),
      note: ov.note ?? "",
    };
  }

  return {
    sizes: defSizes,
    rows: DEFAULT_ROW_LABELS.map((label) => ({
      id: uid(),
      label,
      values: Object.fromEntries(defSizes.map((s) => [s, ""])),
    })),
    note: "",
  };
}

function initShoeState(override: object | null): ShoeState {
  if (override && (override as Record<string, unknown>).type === "shoes") {
    const ov = override as { entries: Array<{ us: string; eu: string; mx: string }> };
    return { entries: ov.entries.map((e) => ({ ...e, id: uid() })) };
  }
  return { entries: [{ id: uid(), us: "", eu: "", mx: "" }] };
}

function serializeApparel(state: ApparelState): object {
  return {
    type: "apparel",
    rows: state.rows.map((row) => ({
      label: row.label,
      valuesIn: Object.fromEntries(
        state.sizes
          .map((s) => [s, parseFloat(row.values[s] ?? "")] as [string, number])
          .filter(([, v]) => !isNaN(v))
      ),
    })),
    ...(state.note.trim() ? { note: state.note.trim() } : {}),
  };
}

function serializeShoes(state: ShoeState): object {
  return {
    type: "shoes",
    entries: state.entries
      .filter((e) => e.us.trim() || e.eu.trim() || e.mx.trim())
      .map((e) => ({ us: e.us.trim(), eu: e.eu.trim(), mx: e.mx.trim() })),
  };
}

// ── Apparel sub-editor ────────────────────────────────────────────────────────

function ApparelEditor({
  state,
  onChange,
}: {
  state: ApparelState;
  onChange: (s: ApparelState) => void;
}) {
  const [newSize, setNewSize]     = useState("");
  const [unit, setUnit]           = useState<PreviewUnit>("in");

  function addSize() {
    const label = newSize.trim().toUpperCase();
    if (!label || state.sizes.includes(label)) { setNewSize(""); return; }
    onChange({
      ...state,
      sizes: [...state.sizes, label],
      rows: state.rows.map((r) => ({ ...r, values: { ...r.values, [label]: "" } })),
    });
    setNewSize("");
  }

  function removeSize(size: string) {
    const sizes = state.sizes.filter((s) => s !== size);
    onChange({
      ...state,
      sizes,
      rows: state.rows.map((r) => {
        const values = { ...r.values };
        delete values[size];
        return { ...r, values };
      }),
    });
  }

  function addRow() {
    onChange({
      ...state,
      rows: [
        ...state.rows,
        { id: uid(), label: "", values: Object.fromEntries(state.sizes.map((s) => [s, ""])) },
      ],
    });
  }

  function removeRow(id: string) {
    onChange({ ...state, rows: state.rows.filter((r) => r.id !== id) });
  }

  function updateLabel(id: string, label: string) {
    onChange({ ...state, rows: state.rows.map((r) => r.id === id ? { ...r, label } : r) });
  }

  function updateCell(rowId: string, size: string, value: string) {
    onChange({
      ...state,
      rows: state.rows.map((r) =>
        r.id === rowId ? { ...r, values: { ...r.values, [size]: value } } : r
      ),
    });
  }

  // Build preview data: only numeric values pass through
  const previewRows = state.rows.map((row) => ({
    label: row.label || "—",
    valuesIn: Object.fromEntries(
      state.sizes
        .map((s) => [s, parseFloat(row.values[s] ?? "")] as [string, number])
        .filter(([, v]) => !isNaN(v))
    ),
  }));

  const hasPreview = state.sizes.length > 0 && state.rows.length > 0;

  return (
    <div className="space-y-6">

      {/* ── Sizes (columns) ── */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-stone-400 mb-2">
          Sizes <span className="normal-case tracking-normal">(columns)</span>
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {state.sizes.map((size) => (
            <span
              key={size}
              className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-xs text-stone-700"
            >
              {size}
              <button
                type="button"
                onClick={() => removeSize(size)}
                className="text-stone-300 hover:text-stone-700 leading-none"
                aria-label={`Remove ${size}`}
              >
                ×
              </button>
            </span>
          ))}
          <div className="flex items-center gap-1 ml-1">
            <input
              type="text"
              value={newSize}
              onChange={(e) => setNewSize(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSize(); } }}
              placeholder="Add…"
              maxLength={6}
              className="w-16 rounded border border-stone-200 px-2 py-0.5 text-xs text-stone-700 placeholder-stone-300 outline-none focus:border-stone-400"
            />
            <button
              type="button"
              onClick={addSize}
              className="text-stone-400 hover:text-stone-700 text-sm leading-none"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* ── Measurement rows ── */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-stone-400 mb-2">
          Measurements <span className="normal-case tracking-normal">(rows, inches)</span>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="pb-2 pr-3 text-left text-[11px] font-medium text-stone-400 w-28 min-w-[7rem]">
                  Label
                </th>
                {state.sizes.map((s) => (
                  <th
                    key={s}
                    className="pb-2 px-1 text-center text-[11px] font-semibold uppercase tracking-wide text-stone-600 min-w-[3.5rem]"
                  >
                    {s}
                  </th>
                ))}
                <th className="pb-2 w-6" />
              </tr>
            </thead>
            <tbody>
              {state.rows.map((row) => (
                <tr key={row.id} className="border-t border-stone-100">
                  <td className="py-1.5 pr-2">
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => updateLabel(row.id, e.target.value)}
                      placeholder="e.g. Chest"
                      className="w-full rounded border border-stone-200 px-2 py-1 text-xs text-stone-700 outline-none focus:border-stone-400"
                    />
                  </td>
                  {state.sizes.map((size) => (
                    <td key={size} className="py-1.5 px-1">
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.5"
                        value={row.values[size] ?? ""}
                        onChange={(e) => updateCell(row.id, size, e.target.value)}
                        placeholder="—"
                        className="w-14 rounded border border-stone-200 px-1.5 py-1 text-center text-xs text-stone-700 outline-none focus:border-stone-400"
                      />
                    </td>
                  ))}
                  <td className="py-1.5 pl-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="text-stone-300 hover:text-red-500 transition-colors text-base leading-none"
                      aria-label="Remove row"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="mt-2 text-xs text-stone-400 hover:text-stone-700 transition-colors"
        >
          + Add measurement row
        </button>
      </div>

      {/* ── Note ── */}
      <div>
        <label className="text-[11px] uppercase tracking-widest text-stone-400 block mb-1">
          Note <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={state.note}
          onChange={(e) => onChange({ ...state, note: e.target.value })}
          placeholder="e.g. Body measurements. For a relaxed fit, size up."
          className="w-full rounded border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-stone-400"
        />
      </div>

      {/* ── Live preview ── */}
      {hasPreview && (
        <div className="rounded border border-stone-100 bg-stone-50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-widest text-stone-400">Preview</p>
            <div className="inline-flex rounded-full border border-stone-200 bg-white p-0.5">
              {(["in", "cm"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`rounded-full px-3 py-0.5 text-xs transition-colors ${
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
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-28 border-b border-stone-200 pb-3 pr-5 text-left text-xs font-medium text-stone-400" />
                  {state.sizes.map((size) => (
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
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-stone-100 last:border-b-0">
                    <td className="py-3 pr-5 text-xs text-stone-400">{row.label}</td>
                    {state.sizes.map((size) => {
                      const raw = row.valuesIn[size];
                      return (
                        <td key={size} className="py-3 px-4 text-center text-sm text-stone-700">
                          {raw !== undefined ? formatValue(raw, unit) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {state.note.trim() && (
            <p className="text-[11px] leading-5 text-stone-400">{state.note}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shoe sub-editor ───────────────────────────────────────────────────────────

function ShoeEditor({
  state,
  onChange,
}: {
  state: ShoeState;
  onChange: (s: ShoeState) => void;
}) {
  function addEntry() {
    onChange({ entries: [...state.entries, { id: uid(), us: "", eu: "", mx: "" }] });
  }

  function removeEntry(id: string) {
    onChange({ entries: state.entries.filter((e) => e.id !== id) });
  }

  function updateEntry(id: string, field: "us" | "eu" | "mx", value: string) {
    onChange({
      entries: state.entries.map((e) => e.id === id ? { ...e, [field]: value } : e),
    });
  }

  const validEntries = state.entries.filter(
    (e) => e.us.trim() || e.eu.trim() || e.mx.trim()
  );

  return (
    <div className="space-y-5">
      {/* ── Entry table ── */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-stone-400 mb-2">Size entries</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="pb-2 px-2 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-700 min-w-[4rem]">US</th>
                <th className="pb-2 px-2 text-left text-[11px] font-medium uppercase tracking-wide text-stone-400 min-w-[4rem]">EU</th>
                <th className="pb-2 px-2 text-left text-[11px] font-medium uppercase tracking-wide text-stone-400 min-w-[4rem]">MX</th>
                <th className="pb-2 w-6" />
              </tr>
            </thead>
            <tbody>
              {state.entries.map((entry) => (
                <tr key={entry.id} className="border-t border-stone-100">
                  {(["us", "eu", "mx"] as const).map((field) => (
                    <td key={field} className="py-1.5 px-1">
                      <input
                        type="text"
                        value={entry[field]}
                        onChange={(e) => updateEntry(entry.id, field, e.target.value)}
                        placeholder="—"
                        className="w-16 rounded border border-stone-200 px-2 py-1 text-xs text-stone-700 outline-none focus:border-stone-400"
                      />
                    </td>
                  ))}
                  <td className="py-1.5 pl-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      className="text-stone-300 hover:text-red-500 transition-colors text-base leading-none"
                      aria-label="Remove entry"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={addEntry}
          className="mt-2 text-xs text-stone-400 hover:text-stone-700 transition-colors"
        >
          + Add size entry
        </button>
      </div>

      {/* ── Preview ── */}
      {validEntries.length > 0 && (
        <div className="rounded border border-stone-100 bg-stone-50 p-4 space-y-3">
          <p className="text-[11px] uppercase tracking-widest text-stone-400">Preview</p>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-stone-200 pb-3 pr-6 text-left text-xs font-semibold uppercase tracking-[0.1em] text-stone-700">US</th>
                  <th className="border-b border-stone-200 pb-3 px-4 text-left text-xs font-medium uppercase tracking-[0.1em] text-stone-400">EU</th>
                  <th className="border-b border-stone-200 pb-3 px-4 text-left text-xs font-medium uppercase tracking-[0.1em] text-stone-400">MX</th>
                </tr>
              </thead>
              <tbody>
                {validEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-stone-100 last:border-b-0">
                    <td className="py-3 pr-6 text-sm font-medium text-stone-900">{entry.us || "—"}</td>
                    <td className="py-3 px-4 text-sm text-stone-600">{entry.eu || "—"}</td>
                    <td className="py-3 px-4 text-sm text-stone-600">{entry.mx || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function CustomSizeChartEditor({ productId, sizeMode, currentOverride }: Props) {
  const shoes = isShoeMode(sizeMode);
  const hasExistingOverride = !!currentOverride;

  const [mode, setMode]       = useState<ChartMode>(hasExistingOverride ? "custom" : "default");
  const [apparel, setApparel] = useState<ApparelState>(() =>
    initApparelState(!shoes ? currentOverride : null, sizeMode)
  );
  const [shoe, setShoe]       = useState<ShoeState>(() =>
    initShoeState(shoes ? currentOverride : null)
  );

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleSave() {
    setMessage(null);

    // Validate custom charts before saving
    if (mode === "custom") {
      if (!shoes) {
        if (apparel.sizes.length === 0) {
          setMessage({ type: "error", text: "Add at least one size column before saving." });
          return;
        }
        if (apparel.rows.length === 0) {
          setMessage({ type: "error", text: "Add at least one measurement row before saving." });
          return;
        }
        const hasAnyValue = apparel.rows.some((row) =>
          apparel.sizes.some((s) => !isNaN(parseFloat(row.values[s] ?? "")))
        );
        if (!hasAnyValue) {
          setMessage({ type: "error", text: "Enter at least one measurement value before saving." });
          return;
        }
      } else {
        const hasAnyEntry = shoe.entries.some(
          (e) => e.us.trim() || e.eu.trim() || e.mx.trim()
        );
        if (!hasAnyEntry) {
          setMessage({ type: "error", text: "Add at least one size entry before saving." });
          return;
        }
      }
    }

    let payload: object | null = null;
    if (mode === "custom") {
      payload = shoes ? serializeShoes(shoe) : serializeApparel(apparel);
      if (process.env.NODE_ENV !== "production") {
        console.log("[CustomSizeChartEditor] saving override:", JSON.stringify(payload, null, 2));
      }
    }

    startTransition(async () => {
      const result = await updateSizeChartOverride(productId, payload);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        if (process.env.NODE_ENV !== "production") {
          console.error("[CustomSizeChartEditor] save failed:", result.error);
        }
      } else {
        setMessage({
          type: "success",
          text: mode === "default" ? "Reverted to default chart." : "Custom chart saved.",
        });
      }
    });
  }

  const debugJson = mode === "custom"
    ? JSON.stringify(shoes ? serializeShoes(shoe) : serializeApparel(apparel), null, 2)
    : "null  // using default chart";

  return (
    <div className="panel p-6 space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold">Custom Size Chart</h2>
        <p className="mt-1 text-xs text-stone-500">
          Use the standard chart for this product type, or define a custom one.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        {(["default", "custom"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full border px-4 py-1.5 text-xs transition-colors ${
              mode === m
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-200 text-stone-500 hover:border-stone-400 hover:text-stone-800"
            }`}
          >
            {m === "default" ? "Use default chart" : "Use custom chart"}
          </button>
        ))}
      </div>

      {/* Editor */}
      {mode === "custom" && !shoes && (
        <ApparelEditor state={apparel} onChange={setApparel} />
      )}
      {mode === "custom" && shoes && (
        <ShoeEditor state={shoe} onChange={setShoe} />
      )}

      {/* Message */}
      {message && (
        <p className={`text-xs ${message.type === "error" ? "text-red-600" : "text-green-700"}`}>
          {message.text}
        </p>
      )}

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="rounded-full bg-stone-900 px-5 py-2 text-xs font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save"}
      </button>

      {/* Advanced JSON (debug only) */}
      <details className="border-t border-stone-100 pt-4">
        <summary className="cursor-pointer select-none text-[11px] text-stone-400 hover:text-stone-600">
          Advanced — raw JSON
        </summary>
        <pre className="mt-3 overflow-x-auto rounded bg-stone-50 p-3 text-[11px] leading-relaxed text-stone-500">
          {debugJson}
        </pre>
      </details>

    </div>
  );
}
