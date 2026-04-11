"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit, clientIP } from "@/lib/rate-limit";
import { sendWaitlistConfirmationEmail } from "@/lib/email";

export async function joinWaitlist(
  productId: string,
  variantId: string | null,
  email: string,
  productName?: string,
  variantLabel?: string | null
): Promise<{ error?: string }> {
  const ip = await clientIP();
  if (!checkRateLimit(`waitlist:${ip}`, 10, 10 * 60_000)) {
    return { error: "Too many requests. Please try again later." };
  }

  if (!email?.trim()) return { error: "Email is required." };

  const supabase = createServerSupabaseClient();

  // Check for duplicate — same product+variant+email
  const { data: existing } = await supabase
    .from("waitlist")
    .select("id")
    .eq("product_id", productId)
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (existing) return {}; // silent dedup — no error shown to user

  const { error } = await supabase.from("waitlist").insert({
    product_id: productId,
    variant_id: variantId ?? null,
    email: email.trim().toLowerCase(),
  });

  if (error) {
    console.error("[waitlist] insert error:", error.code, error.message);
    return { error: "Unable to join waitlist. Please try again." };
  }

  // Send confirmation email — non-blocking
  void sendWaitlistConfirmationEmail({
    email: email.trim().toLowerCase(),
    productName: productName ?? null,
    variantLabel: variantLabel ?? null,
  });

  return {};
}
