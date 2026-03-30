"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit, clientIP } from "@/lib/rate-limit";
import { sendWelcomeEmail } from "@/lib/email";

/**
 * Subscribe an email address. Duplicate emails are treated as success (idempotent).
 * Returns { duplicate: true } when the email is already on the list so callers can
 * show a tailored message without treating it as an error.
 *
 * @param promoCode - Optional promo code to include in the welcome email.
 */
export async function subscribeEmail(
  email: string,
  source: "popup" | "footer" = "popup",
  promoCode?: string | null
): Promise<{ error?: string; duplicate?: boolean }> {
  const ip = await clientIP();
  if (!checkRateLimit(`subscribe:${ip}`, 5, 10 * 60_000)) {
    return { error: "Too many requests. Please try again later." };
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { error: "Please enter a valid email address." };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("subscribers").insert({
    email: normalized,
    source,
    status: "active",
  });

  if (error) {
    if (error.code === "23505") return { duplicate: true };
    console.error("[subscribe] insert error:", error.code, error.message);
    return { error: "Something went wrong. Please try again." };
  }

  console.log("[subscribe] new subscriber:", normalized, "source:", source);

  // Fire-and-forget welcome email — never blocks or fails the subscribe response
  sendWelcomeEmail(normalized, promoCode ?? null).catch((err) => {
    console.error("[subscribe] welcome email failed (non-fatal):", err);
  });

  return {};
}
