"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/server-auth";
import { sendWelcomeEmail } from "@/lib/email";

export async function resendSubscriberEmail(
  subscriberId: string
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();

  const { data: subscriber, error } = await supabase
    .from("subscribers")
    .select("id, email, promo_code")
    .eq("id", subscriberId)
    .single();

  if (error || !subscriber) {
    return { error: "Subscriber not found." };
  }

  await sendWelcomeEmail(subscriber.email, subscriber.promo_code ?? null);

  // Mark promo as sent (or re-sent)
  if (subscriber.promo_code) {
    await supabase
      .from("subscribers")
      .update({ promo_sent: true })
      .eq("id", subscriberId);
  }

  return {};
}
