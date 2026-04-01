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

// ── Row shapes from Supabase ───────────────────────────────────────────────────
// Only select the columns we actually need — do NOT select pottery/shipping
// columns (weight_oz, length_in, etc.) until the migration has been applied.

interface VariantRow {
  id:                   string;
  size_label:           string;
  stock:                number;
  price_override_cents: number | null;
}

interface ProductRow {
  id:                string;
  name_en:           string;
  base_price_cents:  number;
  primary_image_url: string | null;
}

// ── Response shape ────────────────────────────────────────────────────────────

export interface CheckoutResponse {
  url?:          string;
  error?:        string;
  /** Items that were silently removed because they are unavailable or invalid. */
  removedItems?: { productId: string; variantId: string }[];
}

export async function POST(request: NextRequest): Promise<NextResponse<CheckoutResponse>> {
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

    // ── Fetch all referenced products and variants in parallel ────────────────
    //
    // Items come in two flavors:
    //   1. Variant-backed: apparel, one_size pottery, shoes — variantId is a UUID
    //   2. Product-only:   size_mode='none' items — variantId is "" (empty string)
    //
    // We fetch both independently. Missing items are removed gracefully rather
    // than blocking the whole checkout.

    const variantIds = body.items.map((i) => i.variantId).filter(Boolean);
    const productIds = [...new Set(body.items.map((i) => i.productId))];

    const [variantResult, productResult] = await Promise.all([
      variantIds.length > 0
        ? supabase
            .from("product_variants")
            .select("id, size_label, stock, price_override_cents")
            .in("id", variantIds)
        : Promise.resolve({ data: [] as VariantRow[], error: null }),

      supabase
        .from("products")
        .select("id, name_en, base_price_cents, primary_image_url")
        .in("id", productIds),
    ]);

    if (variantResult.error) {
      console.error("[checkout] variant fetch error:", variantResult.error);
      return NextResponse.json({ error: "Unable to load cart items" }, { status: 400 });
    }
    if (productResult.error) {
      console.error("[checkout] product fetch error:", productResult.error);
      return NextResponse.json({ error: "Unable to load cart items" }, { status: 400 });
    }

    const variantMap = new Map<string, VariantRow>(
      (variantResult.data ?? []).map((v) => [v.id, v])
    );
    const productMap = new Map<string, ProductRow>(
      (productResult.data ?? []).map((p) => [p.id, p])
    );

    // ── Resolve each cart item; remove unavailable ones gracefully ────────────

    const removedItems: CheckoutResponse["removedItems"] = [];
    const validItems:   typeof body.items = [];

    for (const cartItem of body.items) {
      const product = productMap.get(cartItem.productId);
      if (!product) {
        // Product deleted or deactivated since item was added to cart
        console.warn("[checkout] product not found:", cartItem.productId);
        removedItems.push({ productId: cartItem.productId, variantId: cartItem.variantId });
        continue;
      }

      const variant = cartItem.variantId ? variantMap.get(cartItem.variantId) : null;

      if (cartItem.variantId && !variant) {
        // Variant was deleted or ID is stale (e.g. from old localStorage cart)
        console.warn("[checkout] variant not found:", cartItem.variantId);
        removedItems.push({ productId: cartItem.productId, variantId: cartItem.variantId });
        continue;
      }

      if (variant && variant.stock < cartItem.quantity) {
        // Out of stock since item was added to cart
        console.warn("[checkout] insufficient stock:", variant.size_label, variant.stock, "requested:", cartItem.quantity);
        removedItems.push({ productId: cartItem.productId, variantId: cartItem.variantId });
        continue;
      }

      validItems.push(cartItem);
    }

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: "None of the items in your cart are currently available.", removedItems },
        { status: 400 }
      );
    }

    // ── Build Stripe line items from valid items only ─────────────────────────
    let subtotalCents = 0;

    const line_items = validItems.map((cartItem) => {
      const product = productMap.get(cartItem.productId)!;
      const variant  = cartItem.variantId ? variantMap.get(cartItem.variantId) : null;

      const unitAmount = variant?.price_override_cents ?? product.base_price_cents;
      subtotalCents += unitAmount * cartItem.quantity;

      return {
        quantity: cartItem.quantity,
        price_data: {
          currency:     "usd" as const,
          unit_amount:  unitAmount,
          // Required for Stripe automatic tax — price does NOT include tax
          tax_behavior: "exclusive" as const,
          product_data: {
            name: product.name_en,
            // size_label is the human-readable variant label (e.g. "M", "Small mug").
            // Omit when empty to avoid Stripe rejecting a blank description string.
            ...(variant?.size_label ? { description: variant.size_label } : {}),
            images:   product.primary_image_url ? [product.primary_image_url] : [],
            tax_code: DEFAULT_TAX_CODE,
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
        // Only include valid items in metadata (removed items are already dropped)
        const itemsJson = JSON.stringify(validItems);
        // Stripe caps each metadata value at 500 characters.
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

    return NextResponse.json({ url: session.url ?? undefined, removedItems });
  } catch (error) {
    console.error("POST /api/checkout error", error);
    return NextResponse.json(
      { error: "Unable to start checkout. Please try again." },
      { status: 500 }
    );
  }
}
