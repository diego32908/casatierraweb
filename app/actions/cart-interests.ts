"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function trackCartInterest(
  productId: string,
  variantId: string | null,
  productName?: string,
  variantLabel?: string | null
): Promise<void> {
  if (!productId) return;

  try {
    const supabase = createServerSupabaseClient();
    await supabase.from("cart_interests").insert({
      product_id:    productId,
      variant_id:    variantId ?? null,
      product_name:  productName ?? null,
      variant_label: variantLabel ?? null,
    });
  } catch (err) {
    // Non-fatal — tracking failure must never affect the cart UX
    console.error("[cart_interests] insert error:", err);
  }
}
