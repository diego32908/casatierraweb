export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { StatusSelect } from "./status-select";
import { TrackingForm } from "./tracking-form";
import { OrderFilters } from "./order-filters";
import type { OrderStatus } from "@/types/store";

type OrderItem = {
  id: string;
  product_name_snapshot: string;
  variant_label_snapshot: string | null;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  image_url_snapshot: string | null;
};

type Order = {
  id: string;
  stripe_checkout_session_id: string | null;
  customer_name: string;
  email: string;
  phone: string | null;
  fulfillment: string;
  shipping_address: {
    line1: string | null;
    line2?: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country?: string | null;
  } | null;
  pickup_location: string | null;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  status: OrderStatus;
  notes: string | null;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  created_at: string;
  order_items: OrderItem[];
};

// Legacy: return fee sessions are now created dynamically with metadata so the webhook
// intercepts them before order creation (see app/api/webhooks/stripe/route.ts).
// These constants handle any orders that leaked into the DB before that approach was
// introduced. New return fee payments no longer produce order rows.
const RETURN_PAYMENT_CENTS  = 899;
const EXCHANGE_PAYMENT_CENTS = 1599;

function returnPaymentType(totalCents: number): "return" | "exchange" | null {
  if (totalCents === RETURN_PAYMENT_CENTS)   return "return";
  if (totalCents === EXCHANGE_PAYMENT_CENTS) return "exchange";
  return null;
}

const STATUS_STYLES: Record<string, string> = {
  PAID:              "bg-stone-900 text-white",
  PREPARING:         "bg-amber-100 text-amber-800",
  SHIPPED:           "bg-blue-100 text-blue-800",
  READY_FOR_PICKUP:  "bg-green-100 text-green-800",
  COMPLETED:         "bg-stone-100 text-stone-500",
  CANCELLED:         "bg-red-100 text-red-600",
  STOCK_CONFLICT:    "bg-red-700 text-white",
};

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; fulfillment?: string }>;
}

async function getOrders(filters: { q?: string; status?: string; fulfillment?: string }): Promise<Order[] | null> {
  try {
    const supabase = createServerSupabaseClient();
    let query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });

    if (filters.q) {
      query = query.or(
        `customer_name.ilike.%${filters.q}%,email.ilike.%${filters.q}%`
      );
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.fulfillment) {
      query = query.eq("fulfillment", filters.fulfillment);
    }

    const { data, error } = await query;
    if (error) { console.error("[admin/orders]", error.message); return null; }
    return (data ?? []) as Order[];
  } catch (e) {
    console.error("[admin/orders] query failed:", e);
    return null;
  }
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const orders = await getOrders(filters);

  if (orders === null) {
    return (
      <section className="space-y-8 max-w-5xl">
        <header>
          <h1 className="text-3xl font-semibold">Orders</h1>
        </header>
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load orders. Refresh to try again.
        </div>
      </section>
    );
  }

  const counts = {
    total:         orders.length,
    paid:          orders.filter((o) => o.status === "PAID").length,
    preparing:     orders.filter((o) => o.status === "PREPARING").length,
    open:          orders.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.status)).length,
    stockConflict: orders.filter((o) => o.status === "STOCK_CONFLICT").length,
  };

  // For return/exchange payment rows, look up the original order_ref from return_requests
  // so admins can match the payment to the correct request in /admin/returns.
  let returnRefMap: Record<string, string> = {};
  const returnPaymentOrders = orders.filter((o) => returnPaymentType(o.total_cents) !== null);
  if (returnPaymentOrders.length > 0) {
    const supabase = createServerSupabaseClient();
    const emails = [...new Set(returnPaymentOrders.map((o) => o.email.toLowerCase()))];
    const { data: returnRequests } = await supabase
      .from("return_requests")
      .select("email, order_ref")
      .in("email", emails)
      .order("created_at", { ascending: false });
    for (const req of (returnRequests ?? [])) {
      const key = req.email.toLowerCase();
      if (!returnRefMap[key]) returnRefMap[key] = req.order_ref;
    }
  }

  return (
    <section className="space-y-8 max-w-5xl">
      <header>
        <h1 className="text-3xl font-semibold">Orders</h1>
        <p className="mt-2 text-sm text-stone-500">
          Review checkout results, fulfillment type, customer contact, and order status lifecycle.
        </p>
      </header>

      {/* Summary */}
      <div className="flex gap-6 text-sm flex-wrap">
        <span className="text-stone-900 font-medium">{counts.total} total</span>
        <span className="text-stone-400">{counts.open} open</span>
        <span className="text-stone-400">{counts.paid} paid (awaiting action)</span>
        <span className="text-stone-400">{counts.preparing} preparing</span>
        {counts.stockConflict > 0 && (
          <span className="font-semibold text-red-700">{counts.stockConflict} stock conflict</span>
        )}
      </div>

      {/* Filters */}
      <OrderFilters />

      {orders.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-sm text-stone-400">No orders found.</p>
          {(filters.q || filters.status || filters.fulfillment) && (
            <p className="text-xs text-stone-300 mt-1">Try adjusting your filters.</p>
          )}
        </div>
      ) : (() => {
        // Split return/exchange payment rows to the top — they require manual action
        const actionRows = orders.filter((o) => returnPaymentType(o.total_cents) !== null);
        const regularRows = orders.filter((o) => returnPaymentType(o.total_cents) === null);
        const renderOrder = (order: Order) => {
          const paymentType = returnPaymentType(order.total_cents);
          const originalRef = paymentType !== null
            ? (returnRefMap[order.email.toLowerCase()] ?? null)
            : null;
          return (
            <div key={order.id} className="panel p-6 space-y-4">

              {/* Top row */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-sm font-medium text-stone-900">{order.customer_name}</p>
                    {originalRef ? (
                      <p className={`text-[10px] uppercase tracking-[0.12em] font-mono font-semibold ${
                        paymentType === "exchange" ? "text-blue-700" : "text-orange-700"
                      }`}>
                        Original: #{originalRef}
                      </p>
                    ) : (
                      <p className="text-[10px] uppercase tracking-[0.16em] text-stone-400 font-mono">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                    )}
                  </div>
                  {originalRef && (
                    <p className="text-[10px] font-mono text-stone-300">
                      payment #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                  )}
                  <p className="text-xs text-stone-400">{order.email}</p>
                  {order.phone && (
                    <p className="text-xs text-stone-400">{order.phone}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-stone-400">
                    {order.fulfillment === "pickup" ? "Pickup" : "Shipping"}
                  </span>
                  {paymentType === "return" && (
                    <span className="text-[9px] uppercase tracking-[0.14em] px-2 py-1 bg-orange-50 text-orange-700 border border-orange-200 font-semibold">
                      Return Payment
                    </span>
                  )}
                  {paymentType === "exchange" && (
                    <span className="text-[9px] uppercase tracking-[0.14em] px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                      Exchange Payment
                    </span>
                  )}
                  <span
                    className={`text-[9px] uppercase tracking-[0.16em] px-2 py-1 ${STATUS_STYLES[order.status] ?? "bg-stone-100 text-stone-500"}`}
                  >
                    {order.status.replace(/_/g, " ")}
                  </span>
                  <StatusSelect orderId={order.id} current={order.status} />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2 border-t border-stone-100 pt-4">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.image_url_snapshot && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url_snapshot}
                          alt={item.product_name_snapshot}
                          className="h-10 w-8 object-cover bg-stone-100 shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs text-stone-700 truncate">{item.product_name_snapshot}</p>
                        {item.variant_label_snapshot && (
                          <p className="text-[11px] text-stone-400">{item.variant_label_snapshot}</p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-stone-700">{formatPrice(item.line_total_cents)}</p>
                      {item.quantity > 1 && (
                        <p className="text-[11px] text-stone-400">×{item.quantity}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Fulfillment details */}
              {order.fulfillment === "shipping" && order.shipping_address && (
                <div className="text-xs text-stone-400 border-t border-stone-100 pt-3">
                  <span className="text-[10px] uppercase tracking-wide text-stone-400">Ship to: </span>
                  {[
                    order.shipping_address.line1,
                    order.shipping_address.line2,
                    [
                      order.shipping_address.city,
                      order.shipping_address.state,
                      order.shipping_address.postal_code,
                    ].filter(Boolean).join(", "),
                    order.shipping_address.country,
                  ].filter(Boolean).join(" · ")}
                </div>
              )}
              {order.fulfillment === "shipping" && !order.shipping_address && (
                <div className="text-xs text-stone-400 border-t border-stone-100 pt-3">
                  <span className="text-[10px] uppercase tracking-wide text-amber-600">Ship to: address not captured</span>
                </div>
              )}
              {order.fulfillment === "pickup" && order.pickup_location && (
                <div className="text-xs text-stone-400 border-t border-stone-100 pt-3">
                  <span className="text-[10px] uppercase tracking-wide text-stone-400">Pickup: </span>
                  {order.pickup_location}
                </div>
              )}

              {/* Tracking (shipping orders only) */}
              {order.fulfillment === "shipping" && (
                <div className="border-t border-stone-100 pt-3 space-y-1">
                  {order.tracking_number && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wide text-stone-400">Tracking:</span>
                      <span className="font-mono text-[11px] text-stone-700">{order.tracking_number}</span>
                      {order.carrier && (
                        <span className="text-[11px] text-stone-400">via {order.carrier}</span>
                      )}
                      {order.tracking_url && (
                        <a
                          href={order.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-stone-500 underline hover:text-stone-800"
                        >
                          Track
                        </a>
                      )}
                      {order.shipped_at && (
                        <span className="text-[11px] text-stone-300">
                          shipped {new Date(order.shipped_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  )}
                  <TrackingForm
                    orderId={order.id}
                    carrier={order.carrier}
                    trackingNumber={order.tracking_number}
                    trackingUrl={order.tracking_url}
                  />
                </div>
              )}

              {/* Stock conflict note */}
              {order.status === "STOCK_CONFLICT" && order.notes && (
                <div className="rounded border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
                  <span className="font-semibold uppercase tracking-wide">Stock conflict — </span>
                  {order.notes}
                </div>
              )}

              {/* Return / exchange payment instruction block */}
              {paymentType !== null && (
                <div className="border border-orange-200 bg-orange-50 px-4 py-3 text-xs text-orange-800 space-y-1.5">
                  <p className="font-semibold uppercase tracking-[0.1em] text-[10px]">
                    {paymentType === "exchange" ? "Exchange" : "Return"} payment received — action required
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-orange-700 leading-relaxed">
                    <li>Find the matching request in <strong>/admin/returns</strong> by customer email or order ref</li>
                    <li>Use the <strong>original order&rsquo;s shipping address</strong> as the customer &ldquo;from&rdquo; address for the label</li>
                    <li>Generate the {paymentType === "exchange" ? "return + reship" : "return"} label manually</li>
                    <li>Send label to customer and mark the return request as <strong>Label Sent</strong></li>
                  </ol>
                </div>
              )}

              {/* Totals + date */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                <p className="text-[11px] text-stone-300">
                  {new Date(order.created_at).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
                <div className="text-right space-y-0.5">
                  {order.discount_cents > 0 && (
                    <p className="text-[11px] text-stone-400">
                      Discount: −{formatPrice(order.discount_cents)}
                    </p>
                  )}
                  <p className="text-sm font-medium text-stone-900">
                    {formatPrice(order.total_cents)}
                  </p>
                </div>
              </div>

            </div>
          );
        };
        return (
          <div className="space-y-6">
            {/* Action required — return/exchange payment rows pinned to top */}
            {actionRows.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-orange-700 font-semibold">
                    Action Required
                  </p>
                  <span className="text-[9px] bg-orange-100 text-orange-700 px-2 py-0.5 font-semibold uppercase tracking-wide">
                    {actionRows.length} return/exchange payment{actionRows.length > 1 ? "s" : ""}
                  </span>
                </div>
                {actionRows.map(renderOrder)}
              </div>
            )}
            {/* Regular orders */}
            {regularRows.length > 0 && (
              <div className="space-y-4">
                {actionRows.length > 0 && (
                  <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
                    All Orders
                  </p>
                )}
                {regularRows.map(renderOrder)}
              </div>
            )}
          </div>
        );
      })()}
    </section>
  );
}
