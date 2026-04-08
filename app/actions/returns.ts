"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/server-auth";
import { checkRateLimit, clientIP } from "@/lib/rate-limit";
import {
  sendAdminReturnNotification,
  sendReturnApprovedEmail,
  sendReturnRejectedEmail,
} from "@/lib/email";

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
  labelOption: "prepaid" | "own_label" | "in_store";
}

const FEE_CENTS: Record<string, Record<string, number | null>> = {
  return:   { prepaid: 899,  own_label: null, in_store: null },
  exchange: { prepaid: 1599, own_label: null, in_store: null },
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

  // Fire admin notification — non-blocking, failure does not propagate
  void sendAdminReturnNotification({
    orderRef:        input.orderRef,
    email:           input.email.trim().toLowerCase(),
    requestType:     input.requestType,
    items:           input.items,
    reason:          input.reason.trim(),
    notes:           input.notes.trim() || null,
    replacementSize: input.replacementSize?.trim() || null,
    labelOption:     input.labelOption,
    feeCents:        feeCents,
    createdAt:       new Date().toISOString(),
  });

  return {};
}

export async function updateReturnStatus(
  id: string,
  status: "pending" | "approved" | "rejected" | "completed"
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();

  // Fetch current record before updating so we can:
  //  a) detect whether status actually changed (prevents duplicate emails)
  //  b) have the data needed for customer emails
  const { data: current } = await supabase
    .from("return_requests")
    .select("status, order_ref, email, request_type, label_option, replacement_size")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("return_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[returns] status update error:", error.message);
    return { error: error.message };
  }

  revalidatePath("/admin/returns");

  // Fire customer email only when status actually changes to approved/rejected
  if (current && current.status !== status) {
    if (status === "approved") {
      // Read Stripe payment links + return address from site_settings
      const { data: settingRow } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "returns_config")
        .single();
      const cfg = (settingRow?.value ?? {}) as {
        return_prepaid_link?: string | null;
        exchange_prepaid_link?: string | null;
        return_address?: string | null;
      };

      void sendReturnApprovedEmail({
        orderRef:            current.order_ref,
        email:               current.email,
        requestType:         current.request_type as "return" | "exchange",
        labelOption:         current.label_option as "prepaid" | "own_label" | "in_store",
        replacementSize:     current.replacement_size ?? null,
        returnPrepaidLink:   cfg.return_prepaid_link ?? null,
        exchangePrepaidLink: cfg.exchange_prepaid_link ?? null,
        returnAddress:       cfg.return_address ?? "1600 E Holt Ave, Pomona, CA 91767",
      });
    } else if (status === "rejected") {
      void sendReturnRejectedEmail({
        orderRef:    current.order_ref,
        email:       current.email,
        requestType: current.request_type as "return" | "exchange",
      });
    }
  }

  return {};
}
