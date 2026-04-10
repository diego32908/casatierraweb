import { HEAVY_CATEGORIES, PACKAGING_BUFFER_OZ } from "@/lib/constants";

// ── Cart item shape ───────────────────────────────────────────────────────────

export interface CartItem {
  /**
   * Unique cart line key: `${product_id}::${variant_id ?? "none"}`.
   * Same product + same variant merges; different variant = separate line.
   */
  key: string;
  product_id: string;
  variant_id: string | null;
  slug: string;
  product_name: string;
  price_cents: number;
  primary_image_url: string | null;
  selected_color_name: string | null;
  selected_color_hex: string | null;
  selected_size: string | null;
  quantity: number;
  /** Stored so cart/checkout can detect heavy/fragile items without a DB round-trip. */
  category?: string;
  /** Weight in ounces (variant-level takes precedence over product-level). */
  weight_oz?: number;
}

/** Returns true if any item in the cart requires heavy/fragile shipping. */
export function isHeavyCart(items: CartItem[]): boolean {
  return items.some(
    (i) =>
      (i.category && (HEAVY_CATEGORIES as readonly string[]).includes(i.category)) ||
      (i.weight_oz != null && i.weight_oz > 0)
  );
}

/**
 * Returns the total cart weight in ounces for heavy carts, including a
 * packaging buffer. Returns 0 for non-heavy carts.
 */
export function cartHeavyWeightOz(items: CartItem[]): number {
  if (!isHeavyCart(items)) return 0;
  const itemWeight = items.reduce(
    (sum, i) => sum + (i.weight_oz ?? 0) * i.quantity,
    0
  );
  return itemWeight + PACKAGING_BUFFER_OZ;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function cartKey(productId: string, variantId: string | null): string {
  return `${productId}::${variantId ?? "none"}`;
}

export function cartSubtotalCents(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
}

export function cartTotalItems(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

// ── localStorage persistence ──────────────────────────────────────────────────

const STORAGE_KEY = "tierra_cart_v1";

export function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage quota exceeded — fail silently
  }
}
