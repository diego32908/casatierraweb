"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit, clientIP } from "@/lib/rate-limit";

export async function joinWaitlist(
  productId: string,
  variantId: string | null,
  email: string
): Promise<void> {
  const ip = await clientIP();
  if (!checkRateLimit(`waitlist:${ip}`, 10, 10 * 60_000)) {
    throw new Error("Too many requests. Please try again later.");
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("waitlist_entries").insert({
    product_id: productId,
    variant_id: variantId ?? null,
    email,
  });
  if (error) {
    console.error("[waitlist] insert error:", error.code, error.message);
    throw new Error("Unable to join waitlist. Please try again.");
  }
}
