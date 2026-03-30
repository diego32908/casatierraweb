"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/server-auth";

/**
 * Read all site settings in one query.
 * Returns a map of key → value (typed as Record<string, unknown>).
 */
export async function getSiteSettings(): Promise<
  Record<string, Record<string, unknown>>
> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from("site_settings").select("key, value");
  if (!data) return {};
  return Object.fromEntries(data.map((row) => [row.key, row.value]));
}

/**
 * Patch a site setting by merging the supplied fields into its current value.
 * Existing fields not included in `patch` are preserved.
 */
export async function patchSiteSetting(
  key: string,
  label: string,
  patch: Record<string, unknown>
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();

  const { data: row } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .single();

  const merged = { ...(row?.value ?? {}), ...patch };

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key, label, value: merged });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/content");
  return {};
}
