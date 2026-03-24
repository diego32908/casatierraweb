export type StockStatus = "in_stock" | "low_stock" | "sold_out";

/**
 * Single source of truth for stock status.
 * Rules:
 *   stock = 0              → sold_out
 *   stock > 0 && <= thresh → low_stock
 *   stock > thresh         → in_stock
 *
 * threshold defaults to 5 (matches low_stock_threshold column default).
 */
export function getStockStatus(stock: number, threshold = 5): StockStatus {
  if (stock === 0) return "sold_out";
  if (stock <= threshold) return "low_stock";
  return "in_stock";
}
