import type { Product } from "@/types/store";

/**
 * Returns the customer-facing label for the size selector heading and the
 * "Select a size" button prompt. Uses both audience and size_mode so the
 * copy is precise without repeating logic in multiple components.
 */
export function sizeSelectorLabel(
  product: Pick<Product, "audience" | "size_mode">
): string {
  const { audience, size_mode } = product;

  if (size_mode === "shoes_us") {
    if (audience === "mens") return "Select men's shoe size";
    if (audience === "womens") return "Select women's shoe size";
    if (audience === "kids") return "Select kids' shoe size";
    return "Select shoe size";
  }

  if (audience === "mens") return "Select men's size";
  if (audience === "womens") return "Select women's size";
  if (audience === "kids") return "Select kids' size";

  return "Select a size";
}
