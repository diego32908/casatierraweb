export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { TrackOrderForm } from "./track-form";

// ── Types ─────────────────────────────────────────────────────────────────────

type OrderItem = {
  product_name_snapshot: string;
  variant_label_snapshot: string | null;
  quantity: number;
  line_total_cents: number;
  image_url_snapshot: string | null;
};

type FoundOrder = {
  id: string;
  customer_name: string;
  status: string;
  created_at: string;
  fulfillment: string;
  shipping_address: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  order_items: OrderItem[];
};

// ── Status display ─────────────────────────────────────────────────────────────

const STATUS_COPY: Record<string, { label: string; detail: string }> = {
  PAID:             { label: "Order received",       detail: "We've received your order and are preparing it." },
  PREPARING:        { label: "Being prepared",        detail: "Your order is being carefully prepared." },
  SHIPPED:          { label: "Shipped",               detail: "Your order is on its way." },
  READY_FOR_PICKUP: { label: "Ready for pickup",      detail: "Your order is ready. Come see us at the store." },
  COMPLETED:        { label: "Delivered",             detail: "Your order has been delivered. Thank you!" },
  CANCELLED:        { label: "Cancelled",             detail: "This order has been cancelled." },
  STOCK_CONFLICT:   { label: "Pending review",        detail: "We're reviewing a stock issue. We'll be in touch." },
};

// ── Lookup ────────────────────────────────────────────────────────────────────

function normalizeOrderRef(raw: string): string {
  // Strip anything not hex, uppercase, take first 8 chars
  return raw.trim().toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 8);
}

function normalizeZip(raw: string): string {
  return raw.trim().replace(/\D/g, "").slice(0, 5);
}

/**
 * Build a UUID range that covers every UUID whose first 8 hex chars equal `ref8`.
 * UUID columns in PostgreSQL support >= / < comparisons (ordered by byte value),
 * but do NOT support ILIKE (text-only operator — causes a type error on uuid columns).
 *
 * Example: ref8 = "490f1d58"
 *   gte → "490f1d58-0000-0000-0000-000000000000"
 *   lt  → "490f1d59-0000-0000-0000-000000000000"
 */
function uuidRange(ref8: string): { gte: string; lt: string } {
  const lo = ref8.toLowerCase();
  const hiNum = parseInt(lo, 16) + 1;
  const hiPrefix = hiNum > 0xffffffff
    ? "ffffffff"
    : hiNum.toString(16).padStart(8, "0");
  return {
    gte: `${lo}-0000-0000-0000-000000000000`,
    lt:  `${hiPrefix}-0000-0000-0000-000000000000`,
  };
}

async function lookupOrder(rawRef: string, rawZip: string): Promise<FoundOrder | null> {
  const ref = normalizeOrderRef(rawRef);
  const zip = normalizeZip(rawZip);

  if (ref.length < 6 || zip.length < 5) return null;

  try {
    const supabase = createServerSupabaseClient();
    const { gte, lt } = uuidRange(ref);
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, customer_name, status, created_at, fulfillment, shipping_address, " +
        "carrier, tracking_number, tracking_url, shipped_at, " +
        "subtotal_cents, shipping_cents, tax_cents, discount_cents, total_cents, " +
        "order_items(product_name_snapshot, variant_label_snapshot, quantity, line_total_cents, image_url_snapshot)"
      )
      .gte("id", gte)
      .lt("id", lt)
      .limit(5);

    if (error) {
      console.error("[track-order] query error:", error.message);
      return null;
    }

    if (!data?.length) return null;

    const orders = data as unknown as FoundOrder[];

    // Verify ZIP matches — done server-side so we never reveal order existence without ZIP
    const match = orders.find((order) => {
      const addr = order.shipping_address;
      if (!addr?.postal_code) return false;
      const orderZip = addr.postal_code.trim().replace(/\D/g, "").slice(0, 5);
      return orderZip === zip;
    });

    return match ?? null;
  } catch (err) {
    console.error("[track-order] lookup error:", err);
    return null;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ q?: string; zip?: string }>;
}

export default async function TrackOrderPage({ searchParams }: PageProps) {
  const { q, zip } = await searchParams;
  const lookupAttempted = !!(q?.trim() && zip?.trim());
  const order = lookupAttempted ? await lookupOrder(q!, zip!) : null;

  const orderRef = order ? order.id.slice(0, 8).toUpperCase() : null;
  const statusInfo = order ? (STATUS_COPY[order.status] ?? { label: order.status, detail: "" }) : null;

  return (
    <div className="px-4 md:px-12 lg:px-20 xl:px-28 py-16 md:py-24">
      <div className="max-w-xl">

        {/* Heading */}
        <p className="text-[11px] uppercase tracking-widest text-stone-400 mb-4">Order Lookup</p>
        <h1
          className="font-serif text-stone-900 mb-3"
          style={{ fontSize: 32, fontWeight: 400, lineHeight: 1.2 }}
        >
          Track Your Order
        </h1>
        <p className="text-[14px] text-stone-500 leading-relaxed mb-12">
          Enter your order number and shipping ZIP to view your order status and tracking details.
        </p>

        {/* Form */}
        <TrackOrderForm initialQ={q ?? ""} initialZip={zip ?? ""} />

        {/* Not found */}
        {lookupAttempted && !order && (
          <div className="mt-12 pt-12 border-t border-stone-100">
            <p className="text-[13px] text-stone-500">
              We couldn&rsquo;t find an order with those details.
            </p>
            <p className="text-[12px] text-stone-400 mt-1">
              Please double-check your order number and ZIP code, then try again.
            </p>
          </div>
        )}

        {/* Order result */}
        {order && orderRef && statusInfo && (
          <div className="mt-12 pt-12 border-t border-stone-100 space-y-10">

            {/* Order header */}
            <div>
              <p className="text-[11px] uppercase tracking-widest text-stone-400 mb-1">
                Order #{orderRef}
              </p>
              <p className="text-[13px] text-stone-400">
                {new Date(order.created_at).toLocaleDateString("en-US", {
                  month: "long", day: "numeric", year: "numeric",
                })}
                {" · "}
                {order.fulfillment === "pickup" ? "In-store pickup" : "Shipping"}
              </p>
            </div>

            {/* Status */}
            <div>
              <p className="text-[11px] uppercase tracking-widest text-stone-400 mb-2">Status</p>
              <p className="text-[17px] text-stone-900 font-medium mb-1">{statusInfo.label}</p>
              {statusInfo.detail && (
                <p className="text-[13px] text-stone-500">{statusInfo.detail}</p>
              )}
            </div>

            {/* Tracking */}
            {order.fulfillment === "shipping" && (
              <div>
                <p className="text-[11px] uppercase tracking-widest text-stone-400 mb-4">Shipping</p>

                {/* Address */}
                {order.shipping_address && (
                  <div className="mb-5">
                    <p className="text-[12px] text-stone-400 mb-1">Deliver to</p>
                    <p className="text-[13px] text-stone-700 leading-relaxed">
                      {order.customer_name}<br />
                      {[
                        order.shipping_address.line1,
                        order.shipping_address.line2,
                        [
                          order.shipping_address.city,
                          order.shipping_address.state,
                          order.shipping_address.postal_code,
                        ].filter(Boolean).join(", "),
                      ].filter(Boolean).join(", ")}
                    </p>
                  </div>
                )}

                {/* Tracking details */}
                {order.tracking_number ? (
                  <div className="space-y-3">
                    <div className="flex gap-6">
                      {order.carrier && (
                        <div>
                          <p className="text-[11px] uppercase tracking-widest text-stone-400 mb-1">Carrier</p>
                          <p className="text-[13px] text-stone-700">{order.carrier}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[11px] uppercase tracking-widest text-stone-400 mb-1">Tracking</p>
                        <p className="font-mono text-[13px] text-stone-700">{order.tracking_number}</p>
                      </div>
                      {order.shipped_at && (
                        <div>
                          <p className="text-[11px] uppercase tracking-widest text-stone-400 mb-1">Shipped</p>
                          <p className="text-[13px] text-stone-700">
                            {new Date(order.shipped_at).toLocaleDateString("en-US", {
                              month: "short", day: "numeric",
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                    {order.tracking_url && (
                      <a
                        href={order.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-[11px] uppercase tracking-widest px-6 py-3 border border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white transition-colors duration-150"
                      >
                        Track on carrier site
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-[13px] text-stone-400">
                    Tracking details will appear here once your order ships.
                  </p>
                )}
              </div>
            )}

            {/* Items */}
            <div>
              <p className="text-[11px] uppercase tracking-widest text-stone-400 mb-6">Items</p>
              <div className="space-y-5">
                {(order.order_items ?? []).map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    {item.image_url_snapshot && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url_snapshot}
                        alt={item.product_name_snapshot}
                        className="w-14 shrink-0 object-cover bg-stone-100"
                        style={{ height: 70 }}
                      />
                    )}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-[14px] text-stone-800">{item.product_name_snapshot}</p>
                      {item.variant_label_snapshot && (
                        <p className="text-[12px] text-stone-400 mt-0.5">{item.variant_label_snapshot}</p>
                      )}
                      {item.quantity > 1 && (
                        <p className="text-[12px] text-stone-400 mt-0.5">Qty: {item.quantity}</p>
                      )}
                    </div>
                    <p className="text-[13px] text-stone-700 shrink-0 pt-0.5">
                      {formatPrice(item.line_total_cents)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Price breakdown */}
            <div className="border-t border-stone-100 pt-6 space-y-2">
              <p className="text-[11px] uppercase tracking-widest text-stone-400 mb-4">Order total</p>
              <div className="flex justify-between text-[13px]">
                <span className="text-stone-500">Subtotal</span>
                <span className="text-stone-800">{formatPrice(order.subtotal_cents)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-stone-500">Shipping</span>
                <span className="text-stone-800">
                  {order.shipping_cents === 0 ? "Free" : formatPrice(order.shipping_cents)}
                </span>
              </div>
              {order.tax_cents > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-stone-500">Tax</span>
                  <span className="text-stone-800">{formatPrice(order.tax_cents)}</span>
                </div>
              )}
              {order.discount_cents > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-stone-500">Discount</span>
                  <span className="text-stone-800">−{formatPrice(order.discount_cents)}</span>
                </div>
              )}
              <div className="flex justify-between text-[14px] font-medium pt-3 border-t border-stone-100">
                <span className="text-stone-900">Total</span>
                <span className="text-stone-900">{formatPrice(order.total_cents)}</span>
              </div>
            </div>

            <p className="text-[12px] text-stone-400">
              Questions? <a href="/contact" className="underline underline-offset-2 hover:text-stone-700 transition-colors">Contact us</a> or reply to your confirmation email.
            </p>

          </div>
        )}

      </div>
    </div>
  );
}
