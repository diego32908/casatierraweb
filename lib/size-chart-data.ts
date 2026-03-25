import type { Product } from "@/types/store";

// ── Chart family ─────────────────────────────────────────────────────────────

export type ApparelChartFamily = "mens_apparel" | "womens_apparel" | "kids_apparel";
export type ShoeChartFamily    = "mens_shoes"   | "womens_shoes"   | "kids_shoes";
export type ChartFamily        = ApparelChartFamily | ShoeChartFamily;

/**
 * Map a product's audience + size_mode (+ category fallback) to a chart family.
 * Returns null for size modes that have no standard chart (numeric, custom, etc.).
 */
export function getChartFamily(
  product: Pick<Product, "audience" | "size_mode" | "category">
): ChartFamily | null {
  const { audience, size_mode, category } = product;

  if (size_mode === "alpha" || size_mode === "kids") {
    if (audience === "womens") return "womens_apparel";
    if (audience === "kids")   return "kids_apparel";
    return "mens_apparel"; // mens + unisex
  }

  if (size_mode === "shoes_us" || category === "shoes") {
    if (audience === "womens") return "womens_shoes";
    if (audience === "kids")   return "kids_shoes";
    return "mens_shoes"; // mens + unisex
  }

  return null;
}

// ── Apparel chart types ───────────────────────────────────────────────────────

export interface ApparelRow {
  label: string;
  /** Body measurements in inches, keyed by canonical size label. */
  valuesIn: Record<string, number>;
}

export interface ApparelChartData {
  rows: ApparelRow[];
  note?: string;
}

/**
 * Format a single row's value for a given size and unit.
 * Inches are rendered as-is (integer or one decimal place).
 * Centimeters are rounded to the nearest whole number.
 */
export function formatValue(inches: number, unit: "in" | "cm"): string {
  if (unit === "cm") {
    return String(Math.round(inches * 2.54));
  }
  return Number.isInteger(inches) ? String(inches) : inches.toFixed(1);
}

// ── Men's apparel ─────────────────────────────────────────────────────────────
// Body measurements in inches (chest, waist, hip).

export const MENS_APPAREL_CHART: ApparelChartData = {
  rows: [
    {
      label: "Chest",
      valuesIn: {
        XS: 34, S: 36, M: 39, L: 42, XL: 46, "2XL": 50, "3XL": 54, "4XL": 58,
      },
    },
    {
      label: "Waist",
      valuesIn: {
        XS: 28, S: 30, M: 32, L: 34, XL: 38, "2XL": 42, "3XL": 46, "4XL": 50,
      },
    },
    {
      label: "Hip",
      valuesIn: {
        XS: 34, S: 36, M: 39, L: 42, XL: 44, "2XL": 48, "3XL": 52, "4XL": 56,
      },
    },
  ],
  note: "Body measurements. For a relaxed fit, size up.",
};

// ── Women's apparel ───────────────────────────────────────────────────────────

export const WOMENS_APPAREL_CHART: ApparelChartData = {
  rows: [
    {
      label: "Bust",
      valuesIn: {
        XS: 32, S: 34, M: 36, L: 38, XL: 41, "2XL": 44, "3XL": 48, "4XL": 52,
      },
    },
    {
      label: "Waist",
      valuesIn: {
        XS: 24, S: 26, M: 28, L: 30, XL: 33, "2XL": 37, "3XL": 41, "4XL": 45,
      },
    },
    {
      label: "Hip",
      valuesIn: {
        XS: 34, S: 36, M: 38, L: 40, XL: 43, "2XL": 47, "3XL": 51, "4XL": 55,
      },
    },
  ],
  note: "Body measurements. When between sizes, size up for comfort.",
};

// ── Kids' apparel ─────────────────────────────────────────────────────────────

export const KIDS_APPAREL_CHART: ApparelChartData = {
  rows: [
    {
      label: "Chest",
      valuesIn: {
        "2T": 20, "3T": 21, "4T": 22, "4": 23,
        "5": 24, "6": 25, "7": 26, "8": 27,
        "10": 28.5, "12": 30, "14": 31.5, "16": 33,
      },
    },
    {
      label: "Waist",
      valuesIn: {
        "2T": 19, "3T": 20, "4T": 20.5, "4": 21,
        "5": 21.5, "6": 22, "7": 22.5, "8": 23,
        "10": 24, "12": 25, "14": 26, "16": 27,
      },
    },
    {
      label: "Hip",
      valuesIn: {
        "2T": 20, "3T": 21, "4T": 22, "4": 23,
        "5": 24, "6": 25, "7": 26, "8": 27,
        "10": 28.5, "12": 30, "14": 31.5, "16": 33,
      },
    },
  ],
  note: "Body measurements in inches. Kids' sizes are based on age and height averages.",
};

export const APPAREL_CHARTS: Record<ApparelChartFamily, ApparelChartData> = {
  mens_apparel:   MENS_APPAREL_CHART,
  womens_apparel: WOMENS_APPAREL_CHART,
  kids_apparel:   KIDS_APPAREL_CHART,
};

// ── Shoe chart types ──────────────────────────────────────────────────────────

export interface ShoeEntry {
  us: string;
  eu: string;
  mx: string;
}

export interface ShoeChartData {
  entries: ShoeEntry[];
}

// ── Women's shoes ─────────────────────────────────────────────────────────────

export const WOMENS_SHOE_CHART: ShoeChartData = {
  entries: [
    { us: "5",   eu: "35",   mx: "22"   },
    { us: "5.5", eu: "35.5", mx: "22.5" },
    { us: "6",   eu: "36",   mx: "23"   },
    { us: "6.5", eu: "37",   mx: "23.5" },
    { us: "7",   eu: "37.5", mx: "24"   },
    { us: "7.5", eu: "38",   mx: "24.5" },
    { us: "8",   eu: "38.5", mx: "25"   },
    { us: "8.5", eu: "39",   mx: "25.5" },
    { us: "9",   eu: "40",   mx: "26"   },
    { us: "9.5", eu: "40.5", mx: "26.5" },
    { us: "10",  eu: "41",   mx: "27"   },
    { us: "11",  eu: "42",   mx: "28"   },
  ],
};

// ── Men's shoes ───────────────────────────────────────────────────────────────

export const MENS_SHOE_CHART: ShoeChartData = {
  entries: [
    { us: "6",    eu: "38.5", mx: "24"   },
    { us: "6.5",  eu: "39",   mx: "24.5" },
    { us: "7",    eu: "40",   mx: "25"   },
    { us: "7.5",  eu: "40.5", mx: "25.5" },
    { us: "8",    eu: "41",   mx: "26"   },
    { us: "8.5",  eu: "42",   mx: "26.5" },
    { us: "9",    eu: "42.5", mx: "27"   },
    { us: "9.5",  eu: "43",   mx: "27.5" },
    { us: "10",   eu: "44",   mx: "28"   },
    { us: "10.5", eu: "44.5", mx: "28.5" },
    { us: "11",   eu: "45",   mx: "29"   },
    { us: "11.5", eu: "45.5", mx: "29.5" },
    { us: "12",   eu: "46",   mx: "30"   },
    { us: "13",   eu: "47",   mx: "31"   },
    { us: "14",   eu: "48",   mx: "32"   },
  ],
};

// ── Kids' shoes ───────────────────────────────────────────────────────────────

export const KIDS_SHOE_CHART: ShoeChartData = {
  entries: [
    { us: "1",   eu: "32",   mx: "19"   },
    { us: "1.5", eu: "33",   mx: "19.5" },
    { us: "2",   eu: "33.5", mx: "20"   },
    { us: "2.5", eu: "34",   mx: "20.5" },
    { us: "3",   eu: "34.5", mx: "21"   },
    { us: "3.5", eu: "35",   mx: "21.5" },
    { us: "4",   eu: "36",   mx: "22"   },
    { us: "4.5", eu: "36.5", mx: "22.5" },
    { us: "5",   eu: "37",   mx: "23"   },
    { us: "5.5", eu: "37.5", mx: "23.5" },
    { us: "6",   eu: "38",   mx: "24"   },
    { us: "6.5", eu: "38.5", mx: "24.5" },
    { us: "7",   eu: "39",   mx: "25"   },
  ],
};

export const SHOE_CHARTS: Record<ShoeChartFamily, ShoeChartData> = {
  mens_shoes:   MENS_SHOE_CHART,
  womens_shoes: WOMENS_SHOE_CHART,
  kids_shoes:   KIDS_SHOE_CHART,
};
