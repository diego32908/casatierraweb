import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getShippingSettings, computeShippingCents } from "@/lib/shipping";
import { PICKUP_LOCATION_LABEL } from "@/lib/constants";
import type { CheckoutRequestBody } from "@/types/store";

// Stripe tax code for general tangible goods.
// Swap to a more specific code if needed:
//   txcd_20010001 — Clothing
//   txcd_34020000 — Pottery / ceramic art
//   txcd_40060003 — Home décor
// Full list: https://stripe.com/docs/tax/tax-codes
const DEFAULT_TAX_CODE = "txcd_99999999";

// Countries accepted for shipping. Expand as the business grows.
const SHIPPING_COUNTRIES = ["US"] as const;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckoutRequestBody;

    if (!body.customerName || !body.email || !body.items?.length) {
      return NextResponse.json({ error: "Missing required checkout fields" }, { status: 400 });
    }

    // Validate all quantities are positive integers. Negative or zero quantities
    // would reach decrement_stock_safe and corrupt inventory (stock -= -1 increments it).
    for (const item of body.items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        return NextResponse.json({ error: "Invalid item quantity" }, { status: 400 });
      }
    }

    const [supabase, shippingSettings] = [
      createServerSupabaseClient(),
      await getShippingSettings(),
    ];

    const variantIds = body.items.map((item) => item.variantId);

    const { data: variants, error } = await supabase
      .from("product_variants")
      .select("*, product:products(*)")
      .in("id", variantIds);

    if (error || !variants?.length) {
      return NextResponse.json({ error: "Unable to load cart items" }, { status: 400 });
    }

    // Compute subtotal alongside line items so we can apply the free-shipping threshold
    let subtotalCents = 0;

    const line_items = body.items.map((cartItem) => {
      const variant = variants.find((v) => v.id === cartItem.variantId);
      if (!variant) throw new Error(`Variant not found: ${cartItem.variantId}`);
      if (variant.stock < cartItem.quantity) {
        throw new Error(`Insufficient stock for ${variant.size_label}`);
      }

      const unitAmount =
        variant.price_override_cents ??
        (variant.product as { base_price_cents: number }).base_price_cents;

      subtotalCents += unitAmount * cartItem.quantity;

      return {
        quantity: cartItem.quantity,
        price_data: {
          currency: "usd" as const,
          unit_amount: unitAmount,
          // Required for Stripe automatic tax — price does NOT include tax
          tax_behavior: "exclusive" as const,
          product_data: {
            name: (variant.product as { name_en: string }).name_en,
            description: variant.size_label,
            images: (variant.product as { primary_image_url: string | null }).primary_image_url
              ? [(variant.product as { primary_image_url: string }).primary_image_url]
              : [],
            tax_code: DEFAULT_TAX_CODE,
          },
        },
      };
    });

    // Determine shipping amount using the same logic as the checkout UI
    const shippingAmountCents = computeShippingCents(
      subtotalCents,
      body.fulfillment,
      shippingSettings
    );
    const shippingIsFree = shippingAmountCents === 0 && body.fulfillment === "shipping";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: body.email,
      line_items,

      // Stripe calculates sales tax automatically based on the customer's address.
      // Requires Stripe Tax to be enabled in the Stripe Dashboard.
      automatic_tax: { enabled: true },

      // Shipping orders: Stripe collects the shipping address and uses it for tax.
      // Pickup orders:   collect billing address so Stripe can determine jurisdiction.
      ...(body.fulfillment === "shipping"
        ? {
            shipping_address_collection: {
              allowed_countries: [...SHIPPING_COUNTRIES],
            },
            shipping_options: [
              {
                shipping_rate_data: {
                  display_name: shippingIsFree
                    ? "Free Shipping"
                    : "Flat Rate Shipping",
                  type: "fixed_amount",
                  fixed_amount: { amount: shippingAmountCents, currency: "usd" },
                  // Must be set for automatic tax to apply to shipping cost
                  tax_behavior: "exclusive" as const,
                },
              },
            ],
          }
        : {
            billing_address_collection: "required" as const,
          }),

      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,

      metadata: (() => {
        const itemsJson = JSON.stringify(body.items);
        // Stripe caps each metadata value at 500 characters.
        // Guard here so we fail fast with a clear error rather than losing an order silently.
        if (itemsJson.length > 490) {
          throw new Error(
            `Cart metadata too large (${itemsJson.length} chars). ` +
            "Reduce cart size or store items server-side before session creation."
          );
        }
        return {
          customerName: body.customerName,
          email: body.email,
          phone: body.phone ?? "",
          fulfillment: body.fulfillment,
          items: itemsJson,
          locale: body.locale ?? "en",
          pickupLocation: body.fulfillment === "pickup" ? PICKUP_LOCATION_LABEL : "",
        };
      })(),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("POST /api/checkout error", error);
    return NextResponse.json(
      { error: "Unable to start checkout. Please try again." },
      { status: 500 }
    );
  }
}
