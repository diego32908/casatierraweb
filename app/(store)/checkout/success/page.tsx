import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SuccessClient } from "./success-client";

// Next.js 15/16: searchParams is a Promise
interface Props {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId || typeof sessionId !== "string") {
    redirect("/shop");
  }

  // ── Verify payment via Stripe ────────────────────────────────────────────
  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });
  } catch {
    // Invalid or expired session ID
    redirect("/shop");
  }

  if (session.payment_status !== "paid") {
    redirect("/cart");
  }

  // ── Try to fetch order from Supabase ─────────────────────────────────────
  // Service role — bypasses RLS. The session_id itself is the auth token here:
  // only the person who completed checkout receives this URL from Stripe.
  // The order may not exist yet if the webhook is still processing.
  const supabase = createServerSupabaseClient();
  const { data: order } = await supabase
    .from("orders")
    .select(`
      id,
      fulfillment,
      total_cents,
      shipping_cents,
      tax_cents,
      shipping_address,
      order_items (
        product_name_snapshot,
        variant_label_snapshot,
        quantity,
        unit_price_cents,
        line_total_cents
      )
    `)
    .eq("stripe_checkout_session_id", sessionId)
    .single();

  // ── Build display data ───────────────────────────────────────────────────
  type DisplayItem = { name: string; variant: string | null; quantity: number; totalCents: number };

  let displayItems: DisplayItem[];

  if (order?.order_items && order.order_items.length > 0) {
    // Order processed by webhook — use the clean DB snapshots
    displayItems = (order.order_items as {
      product_name_snapshot: string;
      variant_label_snapshot: string | null;
      quantity: number;
      unit_price_cents: number;
      line_total_cents: number;
    }[]).map((oi) => ({
      name: oi.product_name_snapshot,
      variant: oi.variant_label_snapshot,
      quantity: oi.quantity,
      totalCents: oi.line_total_cents,
    }));
  } else {
    // Webhook not yet processed — fall back to Stripe line items
    displayItems = (session.line_items?.data ?? []).map((li) => ({
      name: li.description ?? "",
      variant: null,
      quantity: li.quantity ?? 1,
      totalCents: li.amount_total ?? 0,
    }));
  }

  // ── Shipping address (plain serializable shape) ──────────────────────────
  const addr = session.shipping_details?.address ?? null;
  const shippingAddress = addr
    ? {
        line1:      addr.line1      ?? null,
        line2:      addr.line2      ?? null,
        city:       addr.city       ?? null,
        state:      addr.state      ?? null,
        postalCode: addr.postal_code ?? null,
      }
    : null;

  return (
    <SuccessClient
      orderId={order?.id ?? null}
      sessionId={sessionId}
      customerName={
        session.metadata?.customerName ||
        session.shipping_details?.name ||
        session.customer_details?.name ||
        ""
      }
      email={session.metadata?.email ?? session.customer_email ?? ""}
      fulfillment={
        ((order?.fulfillment ?? session.metadata?.fulfillment ?? "shipping") as "shipping" | "pickup")
      }
      items={displayItems}
      totalCents={order?.total_cents ?? session.amount_total ?? 0}
      shippingCents={order?.shipping_cents ?? session.total_details?.amount_shipping ?? 0}
      taxCents={order?.tax_cents ?? session.total_details?.amount_tax ?? 0}
      shippingAddress={shippingAddress}
    />
  );
}
