"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/server-auth";

export async function updateSizeChartOverride(
  productId: string,
  override: object | null
): Promise<{ error?: string }> {
  await requireAdmin();

  if (!productId) return { error: "Invalid product ID." };

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("products")
    .update({ size_chart_override: override })
    .eq("id", productId);

  if (error) {
    console.error("[size_chart_override] update error:", error.message);
    return { error: "Failed to save. Please try again." };
  }

  revalidatePath(`/admin/inventory/${productId}`);
  revalidatePath(`/products`, "layout"); // bust product page cache

  return {};
}
