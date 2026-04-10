export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ReturnsLookupForm } from "./returns-lookup-form";
import { ReturnForm } from "./return-form";

// ── Types ─────────────────────────────────────────────────────────────────────

type OrderItem = {
  product_name_snapshot: string;
  variant_label_snapshot: string | null;
  quantity: number;
  image_url_snapshot: string | null;
};

type FoundOrder = {
  id: string;
  customer_name: string;
  email: string;
  status: string;
  shipping_address: {
    postal_code?: string | null;
  } | null;
  order_items: OrderItem[];
};

// ── Lookup ─────────────────────────────────────────────────────────────────────

function normalizeOrderRef(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 8);
}

function normalizeZip(raw: string): string {
  return raw.trim().replace(/\D/g, "").slice(0, 5);
}

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
        "id, customer_name, email, status, shipping_address, " +
        "order_items(product_name_snapshot, variant_label_snapshot, quantity, image_url_snapshot)"
      )
      .gte("id", gte)
      .lt("id", lt)
      .limit(5);

    if (error) {
      console.error("[returns] query error:", error.message);
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
    console.error("[returns] lookup error:", err);
    return null;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ q?: string; zip?: string; action?: string; payment?: string; type?: string }>;
}

export default async function ReturnsPage({ searchParams }: PageProps) {
  const { q, zip, action, payment, type } = await searchParams;
  const lookupAttempted = !!(q?.trim() && zip?.trim());
  const order = lookupAttempted ? await lookupOrder(q!, zip!) : null;

  const orderRef = order ? order.id.slice(0, 8).toUpperCase() : null;
  const formType = action === "exchange" ? "exchange" : action === "return" ? "return" : null;

  // ── Return fee payment success ─────────────────────────────────────────────
  if (payment === "success") {
    const isExchange = type === "exchange";
    return (
      <div className="px-4 md:px-12 lg:px-20 xl:px-28 py-16 md:py-24">
        <div className="max-w-lg">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: "1px solid #e7e5e4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={{ width: 18, height: 18, color: "#57534e" }}>
              <path d="M2.5 8.5l4 4 7-8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2">
            Payment Confirmed
          </p>
          <h1
            className="font-serif text-stone-900 mb-4"
            style={{ fontSize: 28, fontWeight: 400, lineHeight: 1.2 }}
          >
            {isExchange ? "Exchange fee received." : "Return fee received."}
          </h1>
          <p className="text-[14px] text-stone-500 leading-relaxed mb-8">
            {isExchange
              ? "We\u2019ll prepare your return label and ship your replacement once we receive your item. Look for a follow-up email with your label and instructions."
              : "We\u2019ll send your prepaid return label shortly. Look for a follow-up email with your label and full instructions."}
          </p>

          <div className="panel p-5 mb-8 space-y-2 text-[13px] text-stone-500 leading-relaxed">
            <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-3">What happens next</p>
            {isExchange ? (
              <ol className="list-decimal list-inside space-y-2">
                <li>We&rsquo;ll email your return label within 1 business day.</li>
                <li>Pack and ship the item using the label provided.</li>
                <li>Once we receive and inspect it, we&rsquo;ll ship your replacement.</li>
              </ol>
            ) : (
              <ol className="list-decimal list-inside space-y-2">
                <li>We&rsquo;ll email your prepaid return label within 1 business day.</li>
                <li>Pack and ship the item using the label provided.</li>
                <li>Your refund is processed within 5–7 business days of receiving your item.</li>
              </ol>
            )}
          </div>

          <a
            href="/shop"
            className="inline-block rounded-full border border-stone-900 px-8 py-3 text-xs font-medium uppercase tracking-[0.14em] text-stone-900 transition-colors hover:bg-stone-900 hover:text-white"
          >
            Continue Shopping
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-12 lg:px-20 xl:px-28 py-16 md:py-24">

      {/* ── Landing / Not-found state ── */}
      {!order && (
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-4">
            Returns &amp; Exchanges
          </p>
          <h1
            className="font-serif text-stone-900 mb-3"
            style={{ fontSize: 34, fontWeight: 400, lineHeight: 1.2 }}
          >
            Start a Return or Exchange
          </h1>
          <p className="text-[14px] text-stone-500 leading-relaxed mb-10">
            We want you to love what you ordered. If something isn&rsquo;t right, we&rsquo;re here to help.
          </p>

          {/* Policy summary */}
          <div className="panel p-6 mb-10 space-y-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Return Policy</p>
            <div className="space-y-3 text-[13px] text-stone-600 leading-relaxed">
              <p>
                <span className="text-stone-900 font-medium">14-day return window.</span>{" "}
                Items must be returned within 14 days of delivery, unworn and in original condition.
              </p>
              <p>
                <span className="text-stone-900 font-medium">Prepaid label available.</span>{" "}
                We offer a prepaid return label for a one-time $8.99 fee, paid separately before the label is sent. Or use your own label at no charge.
              </p>
              <p>
                <span className="text-stone-900 font-medium">Exchanges.</span>{" "}
                Need a different size or color? Exchanges are processed quickly — prepaid label + reship is $15.99, paid before the label is issued.
              </p>
              <p>
                <span className="text-stone-900 font-medium">Refunds.</span>{" "}
                Approved returns are refunded in full to the original payment method within 5–7 business days of receiving your item.
              </p>
            </div>
          </div>

          <p
            className="text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-6"
          >
            Look up your order
          </p>
          <ReturnsLookupForm initialQ={q ?? ""} initialZip={zip ?? ""} />

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

      {/* ── Order found ── */}
      {order && orderRef && (
        <div className="max-w-2xl">

          {/* Compact lookup bar */}
          <div className="panel px-5 py-3 flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Returns &amp; Exchanges</p>
              <span className="text-stone-300 select-none">·</span>
              <p className="font-mono text-[11px] text-stone-500">#{orderRef}</p>
            </div>
            <a
              href="/returns"
              className="text-[10px] uppercase tracking-[0.18em] text-stone-400 hover:text-stone-800 transition-colors duration-150"
            >
              New Lookup
            </a>
          </div>

          {/* Order summary */}
          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400 mb-1">
              #{orderRef}
            </p>
            <h1
              className="font-serif text-stone-900 mb-4"
              style={{ fontSize: 28, fontWeight: 400, lineHeight: 1.2 }}
            >
              {order.customer_name}
            </h1>
            <div className="divide-y divide-stone-100 border-t border-b border-stone-100">
              {(order.order_items ?? []).map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  {item.image_url_snapshot ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url_snapshot}
                      alt={item.product_name_snapshot}
                      className="shrink-0 object-cover bg-stone-100"
                      style={{ width: 36, height: 45 }}
                    />
                  ) : (
                    <div className="shrink-0 bg-stone-100" style={{ width: 36, height: 45 }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-stone-800">{item.product_name_snapshot}</p>
                    {item.variant_label_snapshot && (
                      <p className="text-[12px] text-stone-400 mt-0.5">{item.variant_label_snapshot}</p>
                    )}
                  </div>
                  {item.quantity > 1 && (
                    <p className="text-[12px] text-stone-400 shrink-0">×{item.quantity}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action choice (no action param yet) */}
          {!formType && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-5">
                What would you like to do?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={`/returns?q=${encodeURIComponent(q!)}&zip=${encodeURIComponent(zip!)}&action=return`}
                  className="panel p-6 hover:border-stone-500 transition-colors duration-150 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 w-8 h-8 border border-stone-200 flex items-center justify-center group-hover:border-stone-400 transition-colors duration-150">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14, color: "#78716c" }}>
                        <path d="M2 8h10M8 4l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[13px] text-stone-900 font-medium mb-1">Start a Return</p>
                      <p className="text-[12px] text-stone-400 leading-relaxed">
                        Get a refund for items you&rsquo;d like to send back.
                      </p>
                      <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-stone-500">
                        Prepaid label fee $8.99 &middot; Own label free
                      </p>
                    </div>
                  </div>
                </a>

                <a
                  href={`/returns?q=${encodeURIComponent(q!)}&zip=${encodeURIComponent(zip!)}&action=exchange`}
                  className="panel p-6 hover:border-stone-500 transition-colors duration-150 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 w-8 h-8 border border-stone-200 flex items-center justify-center group-hover:border-stone-400 transition-colors duration-150">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14, color: "#78716c" }}>
                        <path d="M2 5h10M8 1l4 4-4 4M14 11H4M8 7l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[13px] text-stone-900 font-medium mb-1">Start an Exchange</p>
                      <p className="text-[12px] text-stone-400 leading-relaxed">
                        Swap for a different size or color.
                      </p>
                      <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-stone-500">
                        Prepaid label + reship fee $15.99 &middot; Own label free
                      </p>
                    </div>
                  </div>
                </a>
              </div>

              <p className="mt-8 text-[12px] text-stone-400">
                Questions?{" "}
                <a
                  href="/contact"
                  className="underline underline-offset-2 hover:text-stone-700 transition-colors duration-150"
                >
                  Contact us
                </a>
              </p>
            </div>
          )}

          {/* Return / Exchange form */}
          {formType && (
            <div>
              <div className="flex items-center gap-3 mb-8">
                <a
                  href={`/returns?q=${encodeURIComponent(q!)}&zip=${encodeURIComponent(zip!)}`}
                  className="text-[11px] uppercase tracking-[0.14em] text-stone-400 hover:text-stone-700 transition-colors duration-150"
                >
                  ← Back
                </a>
                <span className="text-stone-300 select-none">·</span>
                <p className="text-[11px] uppercase tracking-[0.18em] text-stone-600">
                  {formType === "exchange" ? "Exchange Request" : "Return Request"}
                </p>
              </div>
              <ReturnForm
                orderId={order.id}
                orderRef={orderRef}
                email={order.email}
                formType={formType}
                orderItems={order.order_items}
              />
            </div>
          )}

        </div>
      )}

    </div>
  );
}
