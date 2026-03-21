import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FLAT_SHIPPING_RATE_CENTS, PICKUP_LOCATION_LABEL } from "@/lib/constants";
import type { CheckoutCartItemInput, FulfillmentType } from "@/types/store";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
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
    console.error("Stripe webhook verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const supabase = createServerSupabaseClient();

  try {
    const items = JSON.parse(session.metadata?.items ?? "[]") as CheckoutCartItemInput[];
    const fulfillment = (session.metadata?.fulfillment ?? "shipping") as FulfillmentType;
    const shippingAddress = JSON.parse(session.metadata?.shippingAddress ?? "null");

    const variantIds = items.map((item) => item.variantId);

    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select("*, product:products(*)")
      .in("id", variantIds);

    if (variantsError || !variants) {
      throw new Error("Could not load variants during webhook");
    }

    let subtotal = 0;
    const orderItemsPayload = items.map((cartItem) => {
      const variant = variants.find((v) => v.id === cartItem.variantId);
      if (!variant) throw new Error(`Missing variant ${cartItem.variantId}`);
      if (variant.stock < cartItem.quantity) {
        throw new Error(`Stock conflict for variant ${cartItem.variantId}`);
      }

      const product = variant.product as {
        base_price_cents: number;
        name_en: string;
        primary_image_url: string | null;
      };

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

    const shippingCents = fulfillment === "shipping" ? FLAT_SHIPPING_RATE_CENTS : 0;
    const totalCents = subtotal + shippingCents;

    const { data: createdOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        customer_name: session.metadata?.customerName ?? "Customer",
        email: session.metadata?.email ?? session.customer_email ?? "",
        phone: session.metadata?.phone || null,
        fulfillment,
        shipping_address: shippingAddress,
        pickup_location: fulfillment === "pickup" ? PICKUP_LOCATION_LABEL : null,
        subtotal_cents: subtotal,
        shipping_cents: shippingCents,
        discount_cents: 0,
        total_cents: totalCents,
        status: "PAID",
      })
      .select("*")
      .single();

    if (orderError || !createdOrder) {
      throw new Error(orderError?.message || "Failed to create order");
    }

    const { error: orderItemsError } = await supabase.from("order_items").insert(
      orderItemsPayload.map((item) => ({
        ...item,
        order_id: createdOrder.id,
      }))
    );

    if (orderItemsError) {
      throw new Error(orderItemsError.message);
    }

    // decrement stock
    for (const cartItem of items) {
      const variant = variants.find((v) => v.id === cartItem.variantId);
      if (!variant) continue;

      const newStock = Math.max(0, variant.stock - cartItem.quantity);

      const { error: stockError } = await supabase
        .from("product_variants")
        .update({ stock: newStock })
        .eq("id", variant.id);

      if (stockError) {
        throw new Error(stockError.message);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
