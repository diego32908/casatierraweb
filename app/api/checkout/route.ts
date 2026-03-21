import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FLAT_SHIPPING_RATE_CENTS, PICKUP_LOCATION_LABEL } from "@/lib/constants";
import type { CheckoutRequestBody } from "@/types/store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckoutRequestBody;

    if (!body.customerName || !body.email || !body.items?.length) {
      return NextResponse.json({ error: "Missing required checkout fields" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const variantIds = body.items.map((item) => item.variantId);

    const { data: variants, error } = await supabase
      .from("product_variants")
      .select("*, product:products(*)")
      .in("id", variantIds);

    if (error || !variants?.length) {
      return NextResponse.json({ error: "Unable to load cart items" }, { status: 400 });
    }

    let subtotal = 0;

    const line_items = body.items.map((cartItem) => {
      const variant = variants.find((v) => v.id === cartItem.variantId);
      if (!variant) throw new Error(`Variant not found: ${cartItem.variantId}`);
      if (variant.stock < cartItem.quantity) {
        throw new Error(`Insufficient stock for ${variant.size_label}`);
      }

      const unitAmount = variant.price_override_cents ?? (variant.product as { base_price_cents: number }).base_price_cents;
      subtotal += unitAmount * cartItem.quantity;

      return {
        quantity: cartItem.quantity,
        price_data: {
          currency: "usd" as const,
          unit_amount: unitAmount,
          product_data: {
            name: (variant.product as { name_en: string }).name_en,
            description: variant.size_label,
            images: (variant.product as { primary_image_url: string | null }).primary_image_url
              ? [(variant.product as { primary_image_url: string }).primary_image_url]
              : [],
          },
        },
      };
    });

    const shippingAmount =
      body.fulfillment === "shipping" ? FLAT_SHIPPING_RATE_CENTS : 0;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: body.email,
      line_items,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,
      metadata: {
        customerName: body.customerName,
        email: body.email,
        phone: body.phone ?? "",
        fulfillment: body.fulfillment,
        shippingAddress: JSON.stringify(body.shippingAddress ?? null),
        items: JSON.stringify(body.items),
        locale: body.locale ?? "en",
        pickupLocation:
          body.fulfillment === "pickup" ? PICKUP_LOCATION_LABEL : "",
      },
      shipping_options:
        body.fulfillment === "shipping"
          ? [
              {
                shipping_rate_data: {
                  display_name: "Flat Rate Shipping",
                  fixed_amount: { amount: shippingAmount, currency: "usd" },
                  type: "fixed_amount",
                },
              },
            ]
          : [],
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("POST /api/checkout error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
