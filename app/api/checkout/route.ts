import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getShippingSettings, computeShippingCents } from "@/lib/shipping";
import { PICKUP_LOCATION_LABEL, HEAVY_CATEGORIES, PACKAGING_BUFFER_OZ } from "@/lib/constants";
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

// ── URL helper ────────────────────────────────────────────────────────────────
// Derive the canonical site origin from the incoming request headers.
// This is always accurate — it follows the actual deployment (production or
// preview) rather than relying on NEXT_PUBLIC_SITE_URL, which can become stale
// when a Vercel preview deployment URL is deleted (→ DEPLOYMENT_NOT_FOUND).
function getBaseUrl(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host  =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    null;

  if (host) {
    return `${proto}://${host}`;
  }

  // Local dev fallback (no x-forwarded-* headers from Next.js dev server)
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// ── Row shapes from Supabase ───────────────────────────────────────────────────

interface VariantRow {
  id:                   string;
  size_label:           string;
  stock:                number;
  price_override_cents: number | null;
  weight_oz:            number | null;
  length_in:            number | null;
}

interface ProductRow {
  id:                string;
  name_en:           string;
  base_price_cents:  number;
  primary_image_url: string | null;
  category:          string;
  weight_oz:         number | null;
  length_in:         number | null;
}

// ── Response shape ────────────────────────────────────────────────────────────

export interface CheckoutResponse {
  url?:          string;
  error?:        string;
  /** Items silently removed because they are unavailable or invalid. */
  removedItems?: { productId: string; variantId: string }[];
}

export async function POST(request: NextRequest): Promise<NextResponse<CheckoutResponse>> {
  try {
    const body = (await request.json()) as CheckoutRequestBody;

    // customerName and email are optional — when omitted (direct cart → Stripe flow),
    // Stripe collects them during hosted checkout and the webhook reads them back
    // from session.shipping_details.name and session.customer_email.
    if (!body.items?.length) {
      return NextResponse.json({ error: "Missing required checkout fields" }, { status: 400 });
    }

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
    const variantIds = body.items.map((i) => i.variantId).filter(Boolean);
    const productIds = [...new Set(body.items.map((i) => i.productId))];

    const [variantResult, productResult] = await Promise.all([
      variantIds.length > 0
        ? supabase
            .from("product_variants")
            .select("id, size_label, stock, price_override_cents, weight_oz, length_in")
            .in("id", variantIds)
        : Promise.resolve({ data: [] as VariantRow[], error: null }),

      supabase
        .from("products")
        .select("id, name_en, base_price_cents, primary_image_url, category, weight_oz, length_in")
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

    // ── Resolve each cart item; gracefully remove unavailable ones ────────────
    const removedItems: CheckoutResponse["removedItems"] = [];
    const validItems:   typeof body.items = [];

    for (const cartItem of body.items) {
      const product = productMap.get(cartItem.productId);
      if (!product) {
        console.warn("[checkout] product not found:", cartItem.productId);
        removedItems.push({ productId: cartItem.productId, variantId: cartItem.variantId });
        continue;
      }

      const variant = cartItem.variantId ? variantMap.get(cartItem.variantId) : null;

      if (cartItem.variantId && !variant) {
        console.warn("[checkout] variant not found:", cartItem.variantId);
        removedItems.push({ productId: cartItem.productId, variantId: cartItem.variantId });
        continue;
      }

      if (variant && variant.stock < cartItem.quantity) {
        console.warn("[checkout] insufficient stock:", variant.size_label, "→", variant.stock, "requested:", cartItem.quantity);
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

    // ── Detect heavy / fragile cart and compute weight ────────────────────────
    // Triggers when any valid item has: heavy category, product weight, or dimensions.
    // Variant-level weight/dimensions take precedence over product-level when set.
    let heavyCartWeightOz = 0;
    const isHeavy = validItems.some((cartItem) => {
      const product = productMap.get(cartItem.productId)!;
      const variant  = cartItem.variantId ? variantMap.get(cartItem.variantId) : null;
      if ((HEAVY_CATEGORIES as readonly string[]).includes(product.category)) return true;
      const effectiveWeight = variant?.weight_oz ?? product.weight_oz;
      if (effectiveWeight && effectiveWeight > 0) return true;
      const effectiveLength = variant?.length_in ?? product.length_in;
      if (effectiveLength && effectiveLength > 0) return true;
      return false;
    });

    if (isHeavy) {
      const itemWeight = validItems.reduce((sum, cartItem) => {
        const product = productMap.get(cartItem.productId)!;
        const variant  = cartItem.variantId ? variantMap.get(cartItem.variantId) : null;
        const oz = variant?.weight_oz ?? product.weight_oz ?? 0;
        return sum + oz * cartItem.quantity;
      }, 0);
      heavyCartWeightOz = itemWeight + PACKAGING_BUFFER_OZ;
    }

    // ── Build Stripe line items ───────────────────────────────────────────────
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
          tax_behavior: "exclusive" as const,
          product_data: {
            name: product.name_en,
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
      shippingSettings,
      body.shippingSpeed,
      heavyCartWeightOz
    );
    const shippingIsFree = shippingAmountCents === 0 && body.fulfillment === "shipping";

    // ── Discount code ─────────────────────────────────────────────────────────
    // If the customer has a promo code (from newsletter signup), try to apply it
    // automatically as a Stripe promotion code. Falls back to allow_promotion_codes
    // so users can still enter a code manually in the Stripe hosted UI.
    let sessionDiscounts: Array<{ promotion_code: string }> | undefined;

    if (body.discountCode) {
      try {
        const promoCodes = await stripe.promotionCodes.list({
          code:   body.discountCode,
          active: true,
          limit:  1,
        });
        if (promoCodes.data.length > 0) {
          sessionDiscounts = [{ promotion_code: promoCodes.data[0].id }];
        } else {
          console.warn("[checkout] discount code not found in Stripe:", body.discountCode);
        }
      } catch (err) {
        // Non-fatal — fall back to manual promo code entry in Stripe UI
        console.warn("[checkout] promotion code lookup failed:", err);
      }
    }

    // ── Stripe session ────────────────────────────────────────────────────────
    const baseUrl = getBaseUrl(request);

    console.log("[CHECKOUT] fulfillment type:", body.fulfillment);
    console.log("[CHECKOUT] shipping_address_collection enabled:", body.fulfillment === "shipping" ? "yes" : "no (pickup)");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Only pre-fill email when provided (internal checkout form flow).
      // When omitted (direct cart → Stripe flow) Stripe collects it.
      ...(body.email ? { customer_email: body.email } : {}),
      line_items,

      // Collect phone — available in session.customer_details.phone for webhook
      phone_number_collection: { enabled: true },

      automatic_tax: { enabled: true },

      ...(body.fulfillment === "shipping"
        ? {
            shipping_address_collection: {
              allowed_countries: [...SHIPPING_COUNTRIES],
            },
            shipping_options: [
              {
                shipping_rate_data: {
                  // Heavy carts always use weight-tier rates regardless of shippingSpeed.
                  // Never show "Priority Shipping" for heavy carts — the rate is identical.
                  display_name: heavyCartWeightOz > 0
                    ? "Standard Shipping"
                    : body.shippingSpeed === "priority"
                    ? "Priority Shipping"
                    : shippingIsFree
                    ? "Free Shipping"
                    : "Standard Shipping",
                  type:         "fixed_amount",
                  fixed_amount: { amount: shippingAmountCents, currency: "usd" },
                  tax_behavior: "exclusive" as const,
                },
              },
            ],
          }
        : {
            billing_address_collection: "required" as const,
          }),

      // Apply a matched promotion code automatically, or show a manual promo
      // code field in the Stripe UI if no code was provided / code not found.
      // discounts and allow_promotion_codes are mutually exclusive in Stripe.
      ...(sessionDiscounts
        ? { discounts: sessionDiscounts }
        : { allow_promotion_codes: true }),

      // Always use request-derived base URL — never a potentially-stale env var.
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${baseUrl}/cart`,

      metadata: (() => {
        const itemsJson = JSON.stringify(validItems);
        if (itemsJson.length > 490) {
          throw new Error(
            `Cart metadata too large (${itemsJson.length} chars). ` +
            "Reduce cart size or store items server-side before session creation."
          );
        }
        return {
          customerName:   body.customerName ?? "",
          email:          body.email ?? "",
          phone:          body.phone ?? "",
          fulfillment:    body.fulfillment,
          items:          itemsJson,
          locale:         body.locale ?? "en",
          pickupLocation: body.fulfillment === "pickup" ? PICKUP_LOCATION_LABEL : "",
        };
      })(),
    });

    console.log("[CHECKOUT] session created:", session.id, "url:", session.url?.slice(0, 60));
    return NextResponse.json({ url: session.url ?? undefined, removedItems });
  } catch (error) {
    console.error("POST /api/checkout error", error);
    return NextResponse.json(
      { error: "Unable to start checkout. Please try again." },
      { status: 500 }
    );
  }
}
