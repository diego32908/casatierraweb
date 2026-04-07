"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit, clientIP } from "@/lib/rate-limit";
import { sendWelcomeEmail } from "@/lib/email";

/**
 * Look up the active promo code from admin popup settings.
 * Returns null when no code is configured or on any DB error.
 */
async function getActivePromoCode(
  supabase: ReturnType<typeof createServerSupabaseClient>
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "popup")
      .single();
    const code = (data?.value as { promo_code?: string | null } | null)?.promo_code ?? null;
    return code?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Subscribe an email address. Duplicate emails are treated as success (idempotent).
 * Returns { duplicate: true } when the email is already on the list so callers can
 * show a tailored message without treating it as an error.
 *
 * The active promo code is always read server-side from site_settings so all
 * subscriber entry points (footer, popup, cart) use the same code automatically.
 */
export async function subscribeEmail(
  email: string,
  source: "popup" | "checkout" | "footer" = "popup",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _clientPromoCode?: string | null  // ignored — promo code is always fetched server-side
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

  // Always fetch the active promo code from site settings — single source of truth.
  // This guarantees footer, popup, and cart all attach the same code.
  const promoCode = await getActivePromoCode(supabase);
  console.log("[NEWSLETTER] subscribeEmail → active promoCode from settings:", promoCode ?? "none");

  const { data: newSubscriber, error } = await supabase
    .from("subscribers")
    .insert({
      email: normalized,
      source,
      status: "active",
      promo_code: promoCode,
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

  console.log("[NEWSLETTER] subscribeEmail → DB insert OK, id:", newSubscriber?.id, "source:", source, "promoCode:", promoCode ?? "none");

  // Awaited so serverless context doesn't terminate before Resend executes.
  // sendWelcomeEmail has internal try/catch and never re-throws.
  console.log("[NEWSLETTER] subscribeEmail → awaiting sendWelcomeEmail");
  await sendWelcomeEmail(normalized, promoCode);

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
