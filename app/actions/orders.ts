"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/server-auth";
import { sendShippedEmail } from "@/lib/email";
import type { OrderStatus } from "@/types/store";

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();

  const update: Record<string, unknown> = { status };
  if (status === "SHIPPED") {
    update.shipped_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("orders")
    .update(update)
    .eq("id", orderId);

  if (error) {
    console.error("[orders] update status error:", error.message);
    return { error: error.message };
  }

  // Send shipment email when transitioning to SHIPPED
  if (status === "SHIPPED") {
    const { data: order } = await supabase
      .from("orders")
      .select("id, customer_name, email, carrier, tracking_number, tracking_url, total_cents, order_items(product_name_snapshot, variant_label_snapshot, quantity, line_total_cents)")
      .eq("id", orderId)
      .single();

    if (order?.email) {
      await sendShippedEmail({
        orderId: order.id,
        customerName: order.customer_name,
        email: order.email,
        carrier: order.carrier ?? null,
        trackingNumber: order.tracking_number ?? null,
        trackingUrl: order.tracking_url ?? null,
        totalCents: order.total_cents,
        items: (order.order_items as Array<{
          product_name_snapshot: string;
          variant_label_snapshot: string | null;
          quantity: number;
          line_total_cents: number;
        }>).map((i) => ({
          name: i.product_name_snapshot,
          variant: i.variant_label_snapshot,
          quantity: i.quantity,
          lineTotalCents: i.line_total_cents,
        })),
      });
    }
  }

  revalidatePath("/admin/orders");
  return {};
}

export async function updateOrderTracking(
  orderId: string,
  fields: {
    carrier: string | null;
    tracking_number: string | null;
    tracking_url: string | null;
  }
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("orders")
    .update({
      carrier: fields.carrier || null,
      tracking_number: fields.tracking_number || null,
      tracking_url: fields.tracking_url || null,
    })
    .eq("id", orderId);

  if (error) {
    console.error("[orders] update tracking error:", error.message);
    return { error: error.message };
  }

  revalidatePath("/admin/orders");
  return {};
}
