import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// Give the webhook the maximum allowed execution time.
// Vercel Hobby caps this at 10s regardless; Vercel Pro allows up to 60s.
// The handler does sequential DB writes + stock RPCs — a 3-item order
// takes ~2-3s; this budget covers any reasonable cart size.
export const maxDuration = 60;
import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FLAT_SHIPPING_RATE_CENTS, PICKUP_LOCATION_LABEL } from "@/lib/constants";
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from "@/lib/email";
import type { CheckoutCartItemInput, FulfillmentType } from "@/types/store";

export async function POST(request: Request) {
  console.log("[WEBHOOK] POST handler invoked");

  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    console.error("[WEBHOOK] missing stripe-signature header — rejecting");
    return NextResponse.json({ error: "Missing stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("[WEBHOOK] signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("[WEBHOOK] event received → type:", event.type, "id:", event.id);

  if (event.type !== "checkout.session.completed") {
    console.log("[WEBHOOK] ignoring event type:", event.type, "— no action taken");
    return NextResponse.json({ received: true });
  }

  console.log("[WEBHOOK] checkout.session.completed → processing");

  const session = event.data.object as Stripe.Checkout.Session;
  console.log("[WEBHOOK] session id:", session.id, "payment_status:", session.payment_status);

  const supabase = createServerSupabaseClient();

  // Idempotency guard — Stripe retries webhooks on timeout; return 200 if already processed
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .single();

  if (existingOrder) {
    console.log("[WEBHOOK] already processed session", session.id, "— skipping (idempotency guard)");
    return NextResponse.json({ received: true });
  }

  console.log("[WEBHOOK] no existing order found — proceeding to create order");

  try {
    const items = JSON.parse(session.metadata?.items ?? "[]") as CheckoutCartItemInput[];
    const fulfillment = (session.metadata?.fulfillment ?? "shipping") as FulfillmentType;

    // Stripe is the source of truth for address (collected in Stripe's hosted UI)
    // and for all money amounts (subtotal, shipping, tax, total).
    const shippingAddress = session.shipping_details?.address ?? null;
    const taxCents = session.total_details?.amount_tax ?? 0;
    const shippingCents = session.total_details?.amount_shipping
      ?? (fulfillment === "shipping" ? FLAT_SHIPPING_RATE_CENTS : 0);

    // Split items: pottery/home-décor products have variantId="" (no variant row).
    const variantBackedItems = items.filter((i) => i.variantId !== "");
    const productOnlyItems   = items.filter((i) => i.variantId === "");

    const [variantResult, productResult] = await Promise.all([
      variantBackedItems.length > 0
        ? supabase
            .from("product_variants")
            .select("*, product:products(*)")
            .in("id", variantBackedItems.map((i) => i.variantId))
        : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),

      productOnlyItems.length > 0
        ? supabase
            .from("products")
            .select("id, name_en, base_price_cents, primary_image_url")
            .in("id", [...new Set(productOnlyItems.map((i) => i.productId))])
        : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    ]);

    if (variantResult.error) throw new Error("Could not load variants during webhook");
    if (productResult.error) throw new Error("Could not load products during webhook");

    const variants = variantResult.data ?? [];
    const standaloneProducts = productResult.data ?? [];

    let subtotal = 0;
    const orderItemsPayload = items.map((cartItem) => {
      if (cartItem.variantId === "") {
        // Product-only item (pottery, home décor, size_mode='none')
        const product = standaloneProducts.find(
          (p) => (p as { id: string }).id === cartItem.productId
        ) as { id: string; name_en: string; base_price_cents: number; primary_image_url: string | null } | undefined;
        if (!product) throw new Error(`Missing product ${cartItem.productId}`);
        const lineTotal = product.base_price_cents * cartItem.quantity;
        subtotal += lineTotal;
        return {
          product_id: product.id,
          variant_id: null,
          product_name_snapshot: product.name_en,
          variant_label_snapshot: null,
          unit_price_cents: product.base_price_cents,
          quantity: cartItem.quantity,
          line_total_cents: lineTotal,
          image_url_snapshot: product.primary_image_url,
        };
      }

      // Variant-backed item
      const variant = variants.find((v) => (v as { id: string }).id === cartItem.variantId) as {
        id: string;
        product_id: string;
        price_override_cents: number | null;
        color_name: string | null;
        size_label: string;
        product: { base_price_cents: number; name_en: string; primary_image_url: string | null };
      } | undefined;
      if (!variant) throw new Error(`Missing variant ${cartItem.variantId}`);
      // No pre-check against variant.stock — that read is stale and racy.
      // The decrement_stock_safe RPC below provides the authoritative atomic check.

      const product = variant.product;
      const unitPrice = variant.price_override_cents ?? product.base_price_cents;
      const lineTotal = unitPrice * cartItem.quantity;
      subtotal += lineTotal;

      return {
        product_id: variant.product_id,
        variant_id: variant.id,
        product_name_snapshot: product.name_en,
        variant_label_snapshot: [variant.color_name, variant.size_label].filter(Boolean).join(" / "),
        unit_price_cents: unitPrice,
        quantity: cartItem.quantity,
        line_total_cents: lineTotal,
        image_url_snapshot: product.primary_image_url,
      };
    });

    // session.amount_total is the authoritative total charged by Stripe
    // (subtotal + shipping + tax - discounts). Always trust this over local math.
    const totalCents = session.amount_total ?? (subtotal + shippingCents + taxCents);

    const { data: createdOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        // metadata.customerName is empty when checkout was initiated directly from cart.
        // Fall back to the name Stripe collected in the shipping address form.
        customer_name:
          session.metadata?.customerName ||
          session.shipping_details?.name ||
          session.customer_details?.name ||
          "Customer",
        email: session.metadata?.email || session.customer_email || "",
        // metadata.phone is empty in direct-cart flow; fall back to Stripe-collected phone.
        phone:
          session.metadata?.phone ||
          session.customer_details?.phone ||
          null,
        fulfillment,
        shipping_address: shippingAddress,
        pickup_location: fulfillment === "pickup" ? PICKUP_LOCATION_LABEL : null,
        subtotal_cents: subtotal,
        shipping_cents: shippingCents,
        tax_cents: taxCents,
        discount_cents: 0,
        total_cents: totalCents,
        status: "PAID",
      })
      .select("*")
      .single();

    if (orderError || !createdOrder) {
      throw new Error(orderError?.message || "Failed to create order");
    }

    console.log("[WEBHOOK] order created → id:", createdOrder.id, "status:", createdOrder.status, "total:", createdOrder.total_cents);

    const { error: orderItemsError } = await supabase.from("order_items").insert(
      orderItemsPayload.map((item) => ({
        ...item,
        order_id: createdOrder.id,
      }))
    );

    if (orderItemsError) {
      throw new Error(orderItemsError.message);
    }

    // Atomic stock decrement. decrement_stock_safe locks the row and returns
    // fulfilled=false when stock was insufficient at the time of the UPDATE.
    // This is the authoritative check — no pre-read of variant.stock above.
    // Product-only items (pottery, size_mode='none') have no variant row → skip.
    const oversoldVariantIds: string[] = [];

    for (const cartItem of variantBackedItems) {
      const { data: stockResult, error: stockError } = await supabase.rpc(
        "decrement_stock_safe",
        { p_variant_id: cartItem.variantId, p_quantity: cartItem.quantity }
      );

      if (stockError) {
        throw new Error(stockError.message);
      }

      // RPC returns TABLE — Supabase wraps it as an array
      if (stockResult?.[0]?.fulfilled === false) {
        oversoldVariantIds.push(cartItem.variantId);
        console.warn(
          "[webhook] stock conflict: variant",
          cartItem.variantId,
          "requested", cartItem.quantity,
          "new_stock", stockResult[0].new_stock
        );
      }
    }

    // If any variant was oversold, flag the order for admin review
    if (oversoldVariantIds.length > 0) {
      await supabase
        .from("orders")
        .update({
          status: "STOCK_CONFLICT",
          notes: `Oversold variant(s): ${oversoldVariantIds.join(", ")}. Payment received — manual review required.`,
        })
        .eq("id", createdOrder.id);
    }

    // Upsert customer record — non-fatal if it fails
    try {
      const customerEmail = (session.metadata?.email || session.customer_email || "").toLowerCase().trim();
      if (customerEmail) {
        const { data: existing } = await supabase
          .from("customers")
          .select("id, order_count, total_spent_cents, first_order_completed")
          .eq("email", customerEmail)
          .single();

        if (existing) {
          await supabase
            .from("customers")
            .update({
              order_count: existing.order_count + 1,
              total_spent_cents: existing.total_spent_cents + totalCents,
              first_order_completed: true,
            })
            .eq("email", customerEmail);
        } else {
          await supabase.from("customers").insert({
            email: customerEmail,
            full_name:
              session.metadata?.customerName ||
              session.shipping_details?.name ||
              session.customer_details?.name ||
              null,
            phone:
              session.metadata?.phone ||
              session.customer_details?.phone ||
              null,
            first_order_at: new Date().toISOString(),
            first_order_completed: true,
            order_count: 1,
            total_spent_cents: totalCents,
          });
        }
      }
    } catch (customerError) {
      console.warn("[webhook] customer upsert failed (non-fatal):", customerError);
    }

    // Send order confirmation + admin notification — awaited so serverless context doesn't terminate
    // before Resend executes. Both functions have internal try/catch and never re-throw.
    console.log("[WEBHOOK] awaiting both email sends → customer:", createdOrder.email, "order:", createdOrder.id.slice(0, 8).toUpperCase());
    await Promise.all([
      sendOrderConfirmationEmail({
        orderId: createdOrder.id,
        customerName: createdOrder.customer_name,
        email: createdOrder.email,
        items: orderItemsPayload.map((item) => ({
          name: item.product_name_snapshot,
          variant: item.variant_label_snapshot || null,
          quantity: item.quantity,
          unitPriceCents: item.unit_price_cents,
          lineTotalCents: item.line_total_cents,
        })),
        subtotalCents: subtotal,
        shippingCents,
        taxCents,
        totalCents,
        fulfillment,
        shippingAddress: shippingAddress
          ? {
              line1: shippingAddress.line1 ?? null,
              line2: shippingAddress.line2 ?? null,
              city: shippingAddress.city ?? null,
              state: shippingAddress.state ?? null,
              postal_code: shippingAddress.postal_code ?? null,
              country: shippingAddress.country ?? null,
            }
          : null,
        pickupLocation: fulfillment === "pickup" ? PICKUP_LOCATION_LABEL : null,
      }),
      sendAdminOrderNotification({
        orderId: createdOrder.id,
        customerName: createdOrder.customer_name,
        customerEmail: createdOrder.email,
        phone: createdOrder.phone ?? null,
        items: orderItemsPayload.map((item) => ({
          name: item.product_name_snapshot,
          variant: item.variant_label_snapshot || null,
          quantity: item.quantity,
          lineTotalCents: item.line_total_cents,
        })),
        totalCents,
        fulfillment,
        shippingAddress: shippingAddress
          ? {
              line1: shippingAddress.line1 ?? null,
              line2: shippingAddress.line2 ?? null,
              city: shippingAddress.city ?? null,
              state: shippingAddress.state ?? null,
              postal_code: shippingAddress.postal_code ?? null,
              country: shippingAddress.country ?? null,
            }
          : null,
        pickupLocation: fulfillment === "pickup" ? PICKUP_LOCATION_LABEL : null,
        status: createdOrder.status,
      }),
    ]);

    console.log("[WEBHOOK] processing complete → returning 200");
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[WEBHOOK] processing FAILED:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
