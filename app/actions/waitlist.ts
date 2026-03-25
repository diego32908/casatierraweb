"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function joinWaitlist(
  productId: string,
  variantId: string | null,
  email: string
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("waitlist_entries").insert({
    product_id: productId,
    variant_id: variantId ?? null,
    email,
  });
  if (error) throw new Error(error.message);
}
