export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { StatusSelect } from "./status-select";
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
  created_at: string;
  order_items: OrderItem[];
};

const STATUS_STYLES: Record<string, string> = {
  PAID:              "bg-stone-900 text-white",
  PREPARING:         "bg-amber-100 text-amber-800",
  SHIPPED:           "bg-blue-100 text-blue-800",
  READY_FOR_PICKUP:  "bg-green-100 text-green-800",
  COMPLETED:         "bg-stone-100 text-stone-500",
  CANCELLED:         "bg-red-100 text-red-600",
  STOCK_CONFLICT:    "bg-red-700 text-white",
};

async function getOrders(): Promise<Order[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (error) { console.error("[admin/orders]", error.message); return []; }
    return (data ?? []) as Order[];
  } catch (e) {
    console.error("[admin/orders] query failed:", e);
    return [];
  }
}

export default async function AdminOrdersPage() {
  const orders = await getOrders();

  const counts = {
    total:         orders.length,
    paid:          orders.filter((o) => o.status === "PAID").length,
    preparing:     orders.filter((o) => o.status === "PREPARING").length,
    open:          orders.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.status)).length,
    stockConflict: orders.filter((o) => o.status === "STOCK_CONFLICT").length,
  };

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

      {orders.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-sm text-stone-400">No orders yet.</p>
          <p className="text-xs text-stone-300 mt-1">
            Orders appear here after a successful Stripe checkout.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="panel p-6 space-y-4">

              {/* Top row */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm font-medium text-stone-900">{order.customer_name}</p>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-stone-400 font-mono">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <p className="text-xs text-stone-400">{order.email}</p>
                  {order.phone && (
                    <p className="text-xs text-stone-400">{order.phone}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-stone-400">
                    {order.fulfillment === "pickup" ? "Pickup" : "Shipping"}
                  </span>
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

              {/* Stock conflict note */}
              {order.status === "STOCK_CONFLICT" && order.notes && (
                <div className="rounded border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
                  <span className="font-semibold uppercase tracking-wide">Stock conflict — </span>
                  {order.notes}
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
          ))}
        </div>
      )}
    </section>
  );
}
