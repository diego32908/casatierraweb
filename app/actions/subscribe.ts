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
  source: "popup" | "checkout" | "footer" = "popup",
  promoCode?: string | null
): Promise<{ error?: string; duplicate?: boolean }> {
  console.log("[NEWSLETTER] subscribeEmail → start, source:", source, "email:", email.trim().toLowerCase());

  const ip = await clientIP();
  if (!checkRateLimit(`subscribe:${ip}`, 5, 10 * 60_000)) {
    console.warn("[NEWSLETTER] subscribeEmail → rate limited, ip:", ip);
    return { error: "Too many requests. Please try again later." };
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    console.warn("[NEWSLETTER] subscribeEmail → invalid email");
    return { error: "Please enter a valid email address." };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("subscribers").insert({
    email: normalized,
    source,
    status: "active",
  });

  if (error) {
    if (error.code === "23505") {
      console.log("[NEWSLETTER] subscribeEmail → duplicate, already subscribed:", normalized);
      return { duplicate: true };
    }
    console.error("[NEWSLETTER] subscribeEmail → DB insert error:", error.code, error.message);
    return { error: "Something went wrong. Please try again." };
  }

  console.log("[NEWSLETTER] subscribeEmail → DB insert OK, new subscriber:", normalized, "source:", source);

  // Fire-and-forget welcome email — never blocks or fails the subscribe response
  console.log("[NEWSLETTER] subscribeEmail → firing sendWelcomeEmail (non-blocking)");
  sendWelcomeEmail(normalized, promoCode ?? null).catch((err) => {
    console.error("[NEWSLETTER] subscribeEmail → sendWelcomeEmail threw (non-fatal):", err);
  });

  return {};
}
