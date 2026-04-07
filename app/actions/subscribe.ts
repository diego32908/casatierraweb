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
  console.log("[NEWSLETTER] subscribeEmail → start, source:", source, "email:", email.trim().toLowerCase(), "promoCode:", promoCode ?? "none");

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
  const { data: newSubscriber, error } = await supabase
    .from("subscribers")
    .insert({
      email: normalized,
      source,
      status: "active",
      promo_code: promoCode ?? null,
      promo_sent: false,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      console.log("[NEWSLETTER] subscribeEmail → duplicate, already subscribed:", normalized);
      return { duplicate: true };
    }
    console.error("[NEWSLETTER] subscribeEmail → DB insert error:", error.code, error.message);
    return { error: "Something went wrong. Please try again." };
  }

  console.log("[NEWSLETTER] subscribeEmail → DB insert OK, id:", newSubscriber?.id, "source:", source);

  // Awaited so serverless context doesn't terminate before Resend executes.
  // sendWelcomeEmail has internal try/catch and never re-throws.
  console.log("[NEWSLETTER] subscribeEmail → awaiting sendWelcomeEmail, promoCode:", promoCode ?? "none");
  await sendWelcomeEmail(normalized, promoCode ?? null);

  // Mark promo as sent once the email dispatch was attempted
  if (promoCode && newSubscriber?.id) {
    const { error: updateError } = await supabase
      .from("subscribers")
      .update({ promo_sent: true })
      .eq("id", newSubscriber.id);
    if (updateError) {
      console.warn("[NEWSLETTER] subscribeEmail → promo_sent update failed (non-fatal):", updateError.message);
    } else {
      console.log("[NEWSLETTER] subscribeEmail → promo_sent marked true for:", normalized);
    }
  }

  return {};
}
