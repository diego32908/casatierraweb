"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/server-auth";
import { checkRateLimit, clientIP } from "@/lib/rate-limit";

export interface ReturnRequestItem {
  name: string;
  variant: string | null;
  quantity: number;
}

export interface SubmitReturnRequestInput {
  orderId: string;
  orderRef: string;
  email: string;
  requestType: "return" | "exchange";
  items: ReturnRequestItem[];
  reason: string;
  notes: string;
  replacementSize: string | null;
  labelOption: "prepaid" | "own_label";
}

const FEE_CENTS: Record<string, Record<string, number | null>> = {
  return:   { prepaid: 899,  own_label: null },
  exchange: { prepaid: 1599, own_label: null },
};

export async function submitReturnRequest(
  input: SubmitReturnRequestInput
): Promise<{ error?: string }> {
  // Rate limit by IP
  const ip = await clientIP();
  if (!checkRateLimit(`returns:${ip}`, 5, 15 * 60_000)) {
    return { error: "Too many requests. Please try again later." };
  }

  // Validate required fields
  if (!input.orderId || !input.orderRef || !input.email) {
    return { error: "Invalid request." };
  }
  if (!["return", "exchange"].includes(input.requestType)) {
    return { error: "Invalid request type." };
  }
  if (!["prepaid", "own_label"].includes(input.labelOption)) {
    return { error: "Invalid label option." };
  }
  if (!input.items.length) {
    return { error: "Please select at least one item." };
  }
  if (!input.reason.trim()) {
    return { error: "Please select a reason." };
  }

  const feeCents = FEE_CENTS[input.requestType]?.[input.labelOption] ?? null;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("return_requests").insert({
    order_id:         input.orderId,
    order_ref:        input.orderRef,
    email:            input.email.trim().toLowerCase(),
    request_type:     input.requestType,
    status:           "pending",
    items_json:       input.items,
    reason:           input.reason.trim(),
    notes:            input.notes.trim() || null,
    replacement_size: input.replacementSize?.trim() || null,
    label_option:     input.labelOption,
    fee_cents:        feeCents,
  });

  if (error) {
    console.error("[returns] insert error:", error.message);
    return { error: "Something went wrong. Please try again." };
  }

  return {};
}

export async function updateReturnStatus(
  id: string,
  status: "pending" | "approved" | "rejected" | "completed"
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("return_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[returns] status update error:", error.message);
    return { error: error.message };
  }

  revalidatePath("/admin/returns");
  return {};
}
