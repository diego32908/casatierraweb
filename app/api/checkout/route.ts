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

// ── Types for resolved cart items ──────────────────────────────────────────────
// Variants and product-only items are normalized into this shape before
// being turned into Stripe line items.

interface ResolvedProduct {
  id:                string;
  name_en:           string;
  base_price_cents:  number;
  primary_image_url: string | null;
  // Shipping data — used for future carrier-rate logic (Pirate Ship, etc.)
  weight_oz:         number | null;
}

interface ResolvedVariant {
  id:                   string;
  product_id:           string;
  size_label:           string;
  stock:                number;
  price_override_cents: number | null;
  weight_oz:            number | null;
  product:              ResolvedProduct;
}

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

    // ── Fetch data for all cart items ─────────────────────────────────────────
    //
    // Items come in two flavors:
    //   1. Variant-backed: apparel, one_size pottery, shoes — have a real variantId
    //   2. Product-only:   size_mode='none' pottery/home items — variantId is empty
    //
    // Both are supported. Variant-backed items get stock-checked; product-only
    // items are treated as always available (no per-unit stock tracking exists
    // for size_mode='none' products — admin manages availability via is_active).

    const variantIds = body.items.map((i) => i.variantId).filter(Boolean);
    const productIds = [...new Set(body.items.map((i) => i.productId))];

    // Fetch variants (skip if none needed) and products in parallel
    const [variantResult, productResult] = await Promise.all([
      variantIds.length > 0
        ? supabase
            .from("product_variants")
            .select("id, product_id, size_label, stock, price_override_cents, weight_oz")
            .in("id", variantIds)
        : Promise.resolve({ data: [] as ResolvedVariant[], error: null }),

      supabase
        .from("products")
        .select("id, name_en, base_price_cents, primary_image_url, weight_oz")
        .in("id", productIds),
    ]);

    if (variantResult.error) {
      console.error("[checkout] variant fetch error:", variantResult.error);
      return NextResponse.json({ error: "Unable to load cart items" }, { status: 400 });
    }
    if (productResult.error || !productResult.data?.length) {
      console.error("[checkout] product fetch error:", productResult.error);
      return NextResponse.json({ error: "Unable to load cart items" }, { status: 400 });
    }

    const variantMap = new Map(
      (variantResult.data as ResolvedVariant[]).map((v) => [v.id, v])
    );
    const productMap = new Map(
      (productResult.data as ResolvedProduct[]).map((p) => [p.id, p])
    );

    // ── Build Stripe line items ───────────────────────────────────────────────
    let subtotalCents = 0;

    const line_items = body.items.map((cartItem) => {
      const product = productMap.get(cartItem.productId);
      if (!product) throw new Error(`Product not found: ${cartItem.productId}`);

      const variant = cartItem.variantId ? variantMap.get(cartItem.variantId) : null;

      // Variant exists but wasn't returned — mismatched IDs or deleted variant
      if (cartItem.variantId && !variant) {
        throw new Error(`Variant not found: ${cartItem.variantId}`);
      }

      // Stock check — only for variant-backed items (product-only items have no variant stock)
      if (variant && variant.stock < cartItem.quantity) {
        throw new Error(`Insufficient stock for ${variant.size_label}`);
      }

      const unitAmount = variant?.price_override_cents ?? product.base_price_cents;
      subtotalCents += unitAmount * cartItem.quantity;

      // Effective weight for this line item (variant overrides product level)
      // Kept here for future carrier-rate integration (Pirate Ship, EasyPost, etc.)
      // const effectiveWeightOz = variant?.weight_oz ?? product.weight_oz ?? null;

      return {
        quantity: cartItem.quantity,
        price_data: {
          currency:     "usd" as const,
          unit_amount:  unitAmount,
          // Required for Stripe automatic tax — price does NOT include tax
          tax_behavior: "exclusive" as const,
          product_data: {
            name:      product.name_en,
            // size_label is the human-readable variant label (e.g. "M", "Small mug").
            // Stripe requires description to be non-empty if provided — use undefined instead of "".
            ...(variant?.size_label ? { description: variant.size_label } : {}),
            images:    product.primary_image_url ? [product.primary_image_url] : [],
            tax_code:  DEFAULT_TAX_CODE,
          },
        },
      };
    });

    // ── Shipping ──────────────────────────────────────────────────────────────
    const shippingAmountCents = computeShippingCents(
      subtotalCents,
      body.fulfillment,
      shippingSettings
    );
    const shippingIsFree = shippingAmountCents === 0 && body.fulfillment === "shipping";

    // ── Stripe session ────────────────────────────────────────────────────────
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
                  display_name: shippingIsFree ? "Free Shipping" : "Flat Rate Shipping",
                  type:         "fixed_amount",
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
      cancel_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,

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
          customerName:   body.customerName,
          email:          body.email,
          phone:          body.phone ?? "",
          fulfillment:    body.fulfillment,
          items:          itemsJson,
          locale:         body.locale ?? "en",
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
