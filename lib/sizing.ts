import type { Product } from "@/types/store";

// ── Canonical size ladders ───────────────────────────────────────────────────

export interface CanonicalSize {
  label: string;
  sort: number;
  /**
   * Optional sizes appear in the PDP ladder only when the admin has created a
   * variant with that size label. Base sizes (no `optional` flag) always
   * appear, even as unavailable, so shoppers can request them.
   */
  optional?: boolean;
}

/**
 * Standard adult apparel alpha sizing.
 * Base: S M L XL — always shown in the PDP ladder (crossed out if unavailable).
 * Optional: XS 2XL 3XL 4XL — shown only when admin creates a variant for that size.
 */
export const ALPHA_APPAREL_SIZES: CanonicalSize[] = [
  { label: "XS",  sort: 1, optional: true },
  { label: "S",   sort: 2 },
  { label: "M",   sort: 3 },
  { label: "L",   sort: 4 },
  { label: "XL",  sort: 5 },
  { label: "2XL", sort: 6, optional: true },
  { label: "3XL", sort: 7, optional: true },
  { label: "4XL", sort: 8, optional: true },
];

/** US kids apparel sizing — toddler through youth 16 */
export const KIDS_APPAREL_SIZES: CanonicalSize[] = [
  { label: "2T",  sort: 1 },
  { label: "3T",  sort: 2 },
  { label: "4T",  sort: 3 },
  { label: "4",   sort: 4 },
  { label: "5",   sort: 5 },
  { label: "6",   sort: 6 },
  { label: "7",   sort: 7 },
  { label: "8",   sort: 8 },
  { label: "10",  sort: 9 },
  { label: "12",  sort: 10 },
  { label: "14",  sort: 11 },
  { label: "16",  sort: 12 },
];

/** US women's shoe sizing */
export const WOMENS_SHOE_SIZES: CanonicalSize[] = [
  { label: "5",   sort: 1 },
  { label: "5.5", sort: 2 },
  { label: "6",   sort: 3 },
  { label: "6.5", sort: 4 },
  { label: "7",   sort: 5 },
  { label: "7.5", sort: 6 },
  { label: "8",   sort: 7 },
  { label: "8.5", sort: 8 },
  { label: "9",   sort: 9 },
  { label: "9.5", sort: 10 },
  { label: "10",  sort: 11 },
  { label: "11",  sort: 12 },
];

/** US men's shoe sizing */
export const MENS_SHOE_SIZES: CanonicalSize[] = [
  { label: "6",    sort: 1 },
  { label: "6.5",  sort: 2 },
  { label: "7",    sort: 3 },
  { label: "7.5",  sort: 4 },
  { label: "8",    sort: 5 },
  { label: "8.5",  sort: 6 },
  { label: "9",    sort: 7 },
  { label: "9.5",  sort: 8 },
  { label: "10",   sort: 9 },
  { label: "10.5", sort: 10 },
  { label: "11",   sort: 11 },
  { label: "11.5", sort: 12 },
  { label: "12",   sort: 13 },
  { label: "13",   sort: 14 },
  { label: "14",   sort: 15 },
];

/** US kids / youth shoe sizing */
export const KIDS_SHOE_SIZES: CanonicalSize[] = [
  { label: "1",   sort: 1 },
  { label: "1.5", sort: 2 },
  { label: "2",   sort: 3 },
  { label: "2.5", sort: 4 },
  { label: "3",   sort: 5 },
  { label: "3.5", sort: 6 },
  { label: "4",   sort: 7 },
  { label: "4.5", sort: 8 },
  { label: "5",   sort: 9 },
  { label: "5.5", sort: 10 },
  { label: "6",   sort: 11 },
  { label: "6.5", sort: 12 },
  { label: "7",   sort: 13 },
];

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the canonical size ladder for a product, or null for size modes
 * that have no fixed ladder (numeric, custom, one_size, none).
 *
 * The ladder drives the PDP size panel: every entry renders as a row,
 * crossed out if no matching variant exists or variant stock is 0.
 */
export function getCanonicalSizes(
  product: Pick<Product, "audience" | "size_mode">
): CanonicalSize[] | null {
  const { audience, size_mode } = product;

  switch (size_mode) {
    case "alpha":
      return ALPHA_APPAREL_SIZES;

    case "kids":
      return KIDS_APPAREL_SIZES;

    case "shoes_us":
      if (audience === "womens") return WOMENS_SHOE_SIZES;
      if (audience === "kids")   return KIDS_SHOE_SIZES;
      return MENS_SHOE_SIZES; // mens + unisex default

    default:
      // numeric, custom, one_size, none — render actual variants as-is
      return null;
  }
}

// ── Labels ───────────────────────────────────────────────────────────────────

/**
 * Returns the customer-facing label for the size selector heading and the
 * "Select a size" button prompt. Checks size_mode first, then falls back to
 * category so that shoe products using any size mode get shoe-specific copy.
 */
export function sizeSelectorLabel(
  product: Pick<Product, "audience" | "size_mode" | "category">
): string {
  const { audience, size_mode, category } = product;

  // Shoe label: size_mode explicitly set to shoes_us OR product is in the shoes category
  if (size_mode === "shoes_us" || category === "shoes") {
    if (audience === "mens")   return "Select men's shoe size";
    if (audience === "womens") return "Select women's shoe size";
    if (audience === "kids")   return "Select kids' shoe size";
    return "Select shoe size";
  }

  if (audience === "mens")   return "Select men's size";
  if (audience === "womens") return "Select women's size";
  if (audience === "kids")   return "Select kids' size";

  return "Select a size";
}
