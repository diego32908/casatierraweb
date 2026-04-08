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

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_COPY: Record<string, { label: string; detail: string }> = {
  PAID:             { label: "Order received",   detail: "We've received your order and are preparing it." },
  PREPARING:        { label: "Being prepared",    detail: "Your order is being carefully prepared." },
  SHIPPED:          { label: "On its way",        detail: "Your order has shipped and is on its way to you." },
  READY_FOR_PICKUP: { label: "Ready for pickup",  detail: "Your order is ready. Come see us at the store." },
  COMPLETED:        { label: "Delivered",         detail: "Your order has been delivered. Thank you!" },
  CANCELLED:        { label: "Cancelled",         detail: "This order has been cancelled." },
  STOCK_CONFLICT:   { label: "Pending review",    detail: "We're reviewing a stock issue and will be in touch shortly." },
};

const STATUS_BADGE: Record<string, string> = {
  PAID:             "bg-stone-900 text-white",
  PREPARING:        "bg-amber-50 text-amber-700 border border-amber-200",
  SHIPPED:          "bg-blue-50 text-blue-700 border border-blue-200",
  READY_FOR_PICKUP: "bg-green-50 text-green-700 border border-green-200",
  COMPLETED:        "bg-stone-100 text-stone-500",
  CANCELLED:        "bg-red-50 text-red-600 border border-red-200",
  STOCK_CONFLICT:   "bg-red-700 text-white",
};

// ── Status progress steps ─────────────────────────────────────────────────────

const PROGRESS_STEPS = ["Confirmed", "Shipped", "Delivered"];

function statusToStep(status: string): number {
  if (status === "PAID" || status === "PREPARING") return 0;
  if (status === "SHIPPED") return 1;
  if (status === "COMPLETED") return 2;
  return -1; // CANCELLED, STOCK_CONFLICT, READY_FOR_PICKUP — no progress bar
}

function StatusProgress({ status }: { status: string }) {
  const step = statusToStep(status);
  if (step === -1) return null;

  return (
    <div className="flex items-start mb-5">
      {PROGRESS_STEPS.map((label, i) => (
        <div key={label} className="flex items-start" style={{ flex: i < PROGRESS_STEPS.length - 1 ? "1" : "none" }}>
          {/* Dot + label */}
          <div className="flex flex-col items-center shrink-0">
            <div
              className="rounded-full mt-[1px]"
              style={{
                width: 8,
                height: 8,
                background: i <= step ? "#1c1917" : "#e7e5e4",
              }}
            />
            <span
              className="mt-2 whitespace-nowrap"
              style={{
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: i <= step ? "#57534e" : "#d6d3d1",
              }}
            >
              {label}
            </span>
          </div>
          {/* Connecting line */}
          {i < PROGRESS_STEPS.length - 1 && (
            <div
              className="flex-1 mx-2"
              style={{
                height: 1,
                marginTop: 4,
                background: i < step ? "#1c1917" : "#e7e5e4",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Lookup (logic unchanged) ──────────────────────────────────────────────────

function normalizeOrderRef(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 8);
}

function normalizeZip(raw: string): string {
  return raw.trim().replace(/\D/g, "").slice(0, 5);
}

/**
 * UUID range covering every UUID whose first 8 hex chars equal ref8.
 * UUID columns in PostgreSQL support >= / < but not ILIKE (text-only operator).
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
  const statusInfo = order
    ? (STATUS_COPY[order.status] ?? { label: order.status, detail: "" })
    : null;
  const badgeCls = order
    ? (STATUS_BADGE[order.status] ?? "bg-stone-100 text-stone-500")
    : "";

  const addr = order?.shipping_address;
  const addrLine1 = [addr?.line1, addr?.line2].filter(Boolean).join(", ");
  const addrLine2 = [addr?.city, addr?.state, addr?.postal_code].filter(Boolean).join(", ");

  return (
    <div className="px-4 md:px-12 lg:px-20 xl:px-28 py-16 md:py-24">

      {/* ── Landing / Not-found state ── */}
      {!order && (
        <div className="max-w-md">
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-4">
            Order Lookup
          </p>
          <h1
            className="font-serif text-stone-900 mb-3"
            style={{ fontSize: 34, fontWeight: 400, lineHeight: 1.2 }}
          >
            Track Your Order
          </h1>
          <p className="text-[14px] text-stone-500 leading-relaxed mb-12">
            Enter your order number and shipping ZIP code to view status and tracking details.
          </p>

          <TrackOrderForm initialQ={q ?? ""} initialZip={zip ?? ""} />

          {lookupAttempted && (
            <div className="mt-10 panel p-6">
              <p className="text-[13px] text-stone-700 mb-1">
                We couldn&rsquo;t find an order with those details.
              </p>
              <p className="text-[12px] text-stone-400 leading-relaxed">
                Double-check your order number (found in your confirmation email) and ZIP code, then try again.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Order result state ── */}
      {order && orderRef && statusInfo && (
        <div className="max-w-4xl">

          {/* Compact lookup bar */}
          <div className="panel px-5 py-3 flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Order Lookup</p>
              <span className="text-stone-300 select-none">·</span>
              <p className="font-mono text-[11px] text-stone-500">#{orderRef}</p>
            </div>
            <a
              href="/track-order"
              className="text-[10px] uppercase tracking-[0.18em] text-stone-400 hover:text-stone-800 transition-colors duration-150"
            >
              New Search
            </a>
          </div>

          {/* Order header */}
          <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400 mb-1">
                #{orderRef}
              </p>
              <h1
                className="font-serif text-stone-900 mb-1"
                style={{ fontSize: 28, fontWeight: 400, lineHeight: 1.2 }}
              >
                {order.customer_name}
              </h1>
              <p className="text-[12px] text-stone-400">
                {new Date(order.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                <span className="mx-2 text-stone-200">·</span>
                {order.fulfillment === "pickup" ? "In-store pickup" : "Shipped to you"}
              </p>
            </div>
            <span
              className={`self-start text-[10px] uppercase tracking-[0.16em] px-3 py-1.5 ${badgeCls}`}
            >
              {statusInfo.label}
            </span>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

            {/* ── LEFT COLUMN ── */}
            <div className="space-y-4">

              {/* Status card */}
              <div className="panel p-6">
                <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-5">
                  Status
                </p>
                <StatusProgress status={order.status} />
                <p className="text-[16px] text-stone-900 font-medium mb-1">
                  {statusInfo.label}
                </p>
                {statusInfo.detail && (
                  <p className="text-[13px] text-stone-500 leading-relaxed">
                    {statusInfo.detail}
                  </p>
                )}
              </div>

              {/* Tracking card (shipping orders only) */}
              {order.fulfillment === "shipping" && (
                <div className="panel p-6">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-5">
                    Tracking
                  </p>
                  {order.tracking_number ? (
                    <>
                      <div className="flex flex-wrap gap-8 mb-6">
                        {order.carrier && (
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.14em] text-stone-400 mb-1.5">
                              Carrier
                            </p>
                            <p className="text-[13px] text-stone-800">{order.carrier}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-stone-400 mb-1.5">
                            Tracking #
                          </p>
                          <p className="font-mono text-[13px] text-stone-800">
                            {order.tracking_number}
                          </p>
                        </div>
                        {order.shipped_at && (
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.14em] text-stone-400 mb-1.5">
                              Shipped
                            </p>
                            <p className="text-[13px] text-stone-800">
                              {new Date(order.shipped_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
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
                          className="inline-block text-[11px] uppercase tracking-[0.16em] px-6 py-3 border border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white transition-colors duration-150"
                        >
                          Track on carrier site
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="text-[13px] text-stone-400 leading-relaxed">
                      Tracking details will appear here once your order ships.
                    </p>
                  )}
                </div>
              )}

              {/* Items card */}
              <div className="panel p-6">
                <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-5">
                  Items
                </p>
                <div className="divide-y divide-stone-100">
                  {(order.order_items ?? []).map((item, i) => (
                    <div key={i} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                      {item.image_url_snapshot ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url_snapshot}
                          alt={item.product_name_snapshot}
                          className="shrink-0 object-cover bg-stone-100"
                          style={{ width: 48, height: 60 }}
                        />
                      ) : (
                        <div
                          className="shrink-0 bg-stone-100"
                          style={{ width: 48, height: 60 }}
                        />
                      )}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-[13px] text-stone-800 leading-snug">
                          {item.product_name_snapshot}
                        </p>
                        {item.variant_label_snapshot && (
                          <p className="text-[12px] text-stone-400 mt-1">
                            {item.variant_label_snapshot}
                          </p>
                        )}
                        {item.quantity > 1 && (
                          <p className="text-[12px] text-stone-400 mt-0.5">
                            Qty: {item.quantity}
                          </p>
                        )}
                      </div>
                      <p className="text-[13px] text-stone-700 shrink-0 pt-0.5">
                        {formatPrice(item.line_total_cents)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="space-y-4">

              {/* Order summary card */}
              <div className="panel p-6">
                <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-5">
                  Order Total
                </p>
                <div className="space-y-2.5">
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
                      <span className="text-stone-800">
                        −{formatPrice(order.discount_cents)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-4 border-t border-stone-100">
                    <span className="text-[14px] font-medium text-stone-900">Total</span>
                    <span className="text-[14px] font-medium text-stone-900">
                      {formatPrice(order.total_cents)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shipping address card */}
              {order.fulfillment === "shipping" && addr && (
                <div className="panel p-6">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-4">
                    Shipping Address
                  </p>
                  <p className="text-[13px] text-stone-700" style={{ lineHeight: 1.8 }}>
                    {order.customer_name}
                    {addrLine1 && <><br />{addrLine1}</>}
                    {addrLine2 && <><br />{addrLine2}</>}
                  </p>
                </div>
              )}

              {/* Pickup card */}
              {order.fulfillment === "pickup" && (
                <div className="panel p-6">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-4">
                    Pickup Location
                  </p>
                  <p className="text-[13px] text-stone-700" style={{ lineHeight: 1.8 }}>
                    Tierra Oaxaca<br />
                    1600 E Holt Ave<br />
                    Pomona, CA
                  </p>
                </div>
              )}

              {/* Help */}
              <p className="text-[12px] text-stone-400 px-1">
                Questions?{" "}
                <a
                  href="/contact"
                  className="underline underline-offset-2 hover:text-stone-700 transition-colors duration-150"
                >
                  Contact us
                </a>
              </p>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
