"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/server-auth";
import { checkRateLimit, clientIP } from "@/lib/rate-limit";
import { stripe } from "@/lib/stripe";
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
  labelOption: "prepaid" | "in_store";
}

const FEE_CENTS: Record<string, Record<string, number | null>> = {
  return:   { prepaid: 899,  in_store: null },
  exchange: { prepaid: 1599, in_store: null },
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
  if (!["prepaid", "in_store"].includes(input.labelOption)) {
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

  // Block duplicate active requests for the same order
  const { data: activeRequest } = await supabase
    .from("return_requests")
    .select("id")
    .eq("order_id", input.orderId)
    .in("status", ["pending", "approved", "paid", "label_sent"])
    .maybeSingle();
  if (activeRequest) {
    return { error: "A return/exchange request for this order is already in progress." };
  }

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
  status: "pending" | "approved" | "paid" | "label_sent" | "completed" | "rejected"
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
      // Read return address from site_settings (needed for in_store emails)
      const { data: settingRow } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "returns_config")
        .single();
      const cfg = (settingRow?.value ?? {}) as {
        return_address?: string | null;
      };

      // For prepaid label options, create a dynamic Stripe Checkout Session so the
      // webhook can detect the payment via metadata (payment_purpose: "return_fee")
      // rather than fragile amount matching — works correctly with taxes and any currency.
      let paymentUrl: string | null = null;
      if (current.label_option === "prepaid") {
        const feeCents = FEE_CENTS[current.request_type]?.["prepaid"] ?? null;
        if (feeCents) {
          try {
            const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
            const checkoutSession = await stripe.checkout.sessions.create({
              mode: "payment",
              line_items: [{
                quantity: 1,
                price_data: {
                  currency: "usd",
                  unit_amount: feeCents,
                  product_data: {
                    name: current.request_type === "exchange"
                      ? "Exchange Return Label Fee"
                      : "Return Prepaid Label Fee",
                  },
                },
              }],
              metadata: {
                payment_purpose:   "return_fee",
                return_request_id: id,
              },
              success_url: `${siteUrl}/returns?payment=success&type=${current.request_type}`,
              cancel_url:  `${siteUrl}/returns`,
            });
            paymentUrl = checkoutSession.url;
          } catch (err) {
            // Non-fatal — email will show fallback text; admin can follow up manually
            console.error("[returns] Stripe session creation failed for return fee:", err);
          }
        }
      }

      void sendReturnApprovedEmail({
        orderRef:        current.order_ref,
        email:           current.email,
        requestType:     current.request_type as "return" | "exchange",
        labelOption:     current.label_option as "prepaid" | "in_store",
        replacementSize: current.replacement_size ?? null,
        paymentUrl,
        returnAddress:   cfg.return_address ?? "1600 E Holt Ave Ste D24\u2013D26, Pomona, CA 91767",
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
