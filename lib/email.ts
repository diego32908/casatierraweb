import { Resend } from "resend";

// Lazy-initialized so the constructor never runs when RESEND_API_KEY is absent.
// The constructor throws "Missing API key" on empty/undefined keys, which would
// crash any serverless function that imports this module — even if the send is
// guarded later. Lazy init avoids that crash entirely.
let _resend: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[EMAIL] RESEND_API_KEY not set — all email sends will be skipped");
    return null;
  }
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

// Read EMAIL_FROM at call time (not module load) so missing vars are logged clearly.
function getFrom(): string | null {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    console.error("[EMAIL] EMAIL_FROM not set — all email sends will be skipped");
    return null;
  }
  return from;
}

const BRAND = "Tierra Oaxaca";

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100
  );
}

// ── Shared layout wrapper ────────────────────────────────────────────────────

function emailLayout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${BRAND}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:Georgia,serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
    style="background:#f5f5f4;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
        style="max-width:540px;background:#ffffff;border:1px solid #e7e5e4;">
        <!-- Header -->
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #f0eeec;">
            <p style="margin:0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;
              color:#a8a29e;font-family:Arial,sans-serif;">${BRAND}</p>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px 40px;">${body}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px 32px;border-top:1px solid #f0eeec;">
            <p style="margin:0;font-size:11px;color:#a8a29e;font-family:Arial,sans-serif;
              line-height:1.6;">
              ${BRAND} &nbsp;·&nbsp; 1600 E Holt Ave, Pomona, CA<br />
              You&rsquo;re receiving this because you interacted with our store.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Welcome / subscriber email ───────────────────────────────────────────────

function welcomeEmailHtml(promoCode: string | null): string {
  const promoBlock = promoCode
    ? `<div style="margin:24px 0;padding:20px 24px;background:#fafaf9;border:1px dashed #d6d3d1;text-align:center;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;
          color:#a8a29e;font-family:Arial,sans-serif;">Your first-order code</p>
        <p style="margin:0;font-family:'Courier New',monospace;font-size:22px;font-weight:700;
          letter-spacing:0.12em;color:#1c1917;">${promoCode}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#78716c;font-family:Arial,sans-serif;">
          Enter this code at checkout.</p>
      </div>`
    : "";

  return emailLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:400;color:#1c1917;line-height:1.3;">
      Welcome to ${BRAND}.
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#57534e;line-height:1.7;font-family:Arial,sans-serif;">
      Thank you for joining us. You&rsquo;ll be the first to know about new
      arrivals, seasonal collections, and exclusive offers.
    </p>
    ${promoBlock}
    <p style="margin:0;font-size:14px;color:#78716c;line-height:1.7;font-family:Arial,sans-serif;">
      Each piece in our collection is crafted with care. We look forward to
      finding something you&rsquo;ll love.
    </p>
  `);
}

// ── Order confirmation email ─────────────────────────────────────────────────

export interface OrderEmailData {
  orderId: string;
  customerName: string;
  email: string;
  items: Array<{
    name: string;
    variant: string | null;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    imageUrl?: string | null;
  }>;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  fulfillment: "shipping" | "pickup";
  shippingAddress: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
  pickupLocation: string | null;
}

function orderConfirmationHtml(order: OrderEmailData): string {
  const orderRef = order.orderId.slice(0, 8).toUpperCase();

  const itemRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0eeec;vertical-align:top;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              ${item.imageUrl
                ? `<td style="padding-right:12px;vertical-align:top;">
                    <img src="${item.imageUrl}" alt="" width="48" height="60"
                      style="display:block;width:48px;height:60px;object-fit:cover;background:#f5f5f4;" />
                  </td>`
                : ""}
              <td style="vertical-align:top;">
                <p style="margin:0;font-size:14px;color:#1c1917;font-family:Arial,sans-serif;">${item.name}</p>
                ${item.variant
                  ? `<p style="margin:2px 0 0;font-size:12px;color:#a8a29e;font-family:Arial,sans-serif;">${item.variant}</p>`
                  : ""}
                ${item.quantity > 1
                  ? `<p style="margin:2px 0 0;font-size:12px;color:#a8a29e;font-family:Arial,sans-serif;">×${item.quantity}</p>`
                  : ""}
              </td>
            </tr>
          </table>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f0eeec;text-align:right;
          vertical-align:top;white-space:nowrap;">
          <p style="margin:0;font-size:14px;color:#1c1917;font-family:Arial,sans-serif;">
            ${formatCents(item.lineTotalCents)}
          </p>
        </td>
      </tr>`
    )
    .join("");

  const addressBlock =
    order.fulfillment === "shipping" && order.shippingAddress
      ? `<p style="margin:0;font-size:13px;color:#78716c;line-height:1.7;font-family:Arial,sans-serif;">
          ${[
            order.shippingAddress.line1,
            order.shippingAddress.line2,
            [order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postal_code]
              .filter(Boolean)
              .join(", "),
            order.shippingAddress.country,
          ]
            .filter(Boolean)
            .join("<br />")}
        </p>`
      : order.fulfillment === "pickup" && order.pickupLocation
      ? `<p style="margin:0;font-size:13px;color:#78716c;font-family:Arial,sans-serif;">
          ${order.pickupLocation}
        </p>`
      : "";

  const fulfillmentLabel =
    order.fulfillment === "pickup" ? "In-store pickup" : "Ships within 3–5 business days";

  return emailLayout(`
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;
      color:#a8a29e;font-family:Arial,sans-serif;">Order confirmed</p>
    <h1 style="margin:0 0 24px;font-size:22px;font-weight:400;color:#1c1917;line-height:1.3;">
      Thank you, ${order.customerName}.
    </h1>

    <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;
      color:#a8a29e;font-family:Arial,sans-serif;">Order #${orderRef}</p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
      style="margin:0 0 24px;">
      ${itemRows}
    </table>

    <!-- Totals -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
      style="margin:0 0 28px;">
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#78716c;font-family:Arial,sans-serif;">Subtotal</td>
        <td style="padding:4px 0;font-size:13px;color:#1c1917;text-align:right;
          font-family:Arial,sans-serif;">${formatCents(order.subtotalCents)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#78716c;font-family:Arial,sans-serif;">Shipping</td>
        <td style="padding:4px 0;font-size:13px;color:#1c1917;text-align:right;
          font-family:Arial,sans-serif;">${order.shippingCents === 0 ? "Free" : formatCents(order.shippingCents)}</td>
      </tr>
      ${
        order.taxCents > 0
          ? `<tr>
              <td style="padding:4px 0;font-size:13px;color:#78716c;font-family:Arial,sans-serif;">Tax</td>
              <td style="padding:4px 0;font-size:13px;color:#1c1917;text-align:right;
                font-family:Arial,sans-serif;">${formatCents(order.taxCents)}</td>
            </tr>`
          : ""
      }
      <tr>
        <td style="padding:12px 0 4px;font-size:14px;font-weight:600;color:#1c1917;
          font-family:Arial,sans-serif;border-top:1px solid #e7e5e4;">Total</td>
        <td style="padding:12px 0 4px;font-size:14px;font-weight:600;color:#1c1917;
          text-align:right;font-family:Arial,sans-serif;border-top:1px solid #e7e5e4;">
          ${formatCents(order.totalCents)}
        </td>
      </tr>
    </table>

    <!-- Fulfillment -->
    <div style="padding:16px 20px;background:#fafaf9;border:1px solid #f0eeec;margin:0 0 24px;">
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;
        color:#a8a29e;font-family:Arial,sans-serif;">
        ${order.fulfillment === "pickup" ? "Pickup" : "Delivery"}
      </p>
      <p style="margin:0 0 6px;font-size:13px;color:#57534e;font-family:Arial,sans-serif;">
        ${fulfillmentLabel}
      </p>
      ${addressBlock}
    </div>

    <p style="margin:0;font-size:13px;color:#a8a29e;line-height:1.6;font-family:Arial,sans-serif;">
      Questions? Reply to this email or visit our store.
    </p>
  `);
}

// ── Admin order notification email ───────────────────────────────────────────

export interface AdminOrderData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  phone: string | null;
  items: Array<{
    name: string;
    variant: string | null;
    quantity: number;
    lineTotalCents: number;
  }>;
  totalCents: number;
  fulfillment: "shipping" | "pickup";
  shippingAddress: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
  pickupLocation: string | null;
  status: string;
}

function adminOrderNotificationHtml(order: AdminOrderData): string {
  const orderRef = order.orderId.slice(0, 8).toUpperCase();
  const isConflict = order.status === "STOCK_CONFLICT";

  const itemRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#1c1917;font-family:Arial,sans-serif;
          border-bottom:1px solid #f0eeec;">
          ${item.name}${item.variant ? ` <span style="color:#a8a29e;">· ${item.variant}</span>` : ""}
        </td>
        <td style="padding:8px 12px;font-size:13px;color:#78716c;font-family:Arial,sans-serif;
          border-bottom:1px solid #f0eeec;text-align:center;">×${item.quantity}</td>
        <td style="padding:8px 12px;font-size:13px;color:#1c1917;font-family:Arial,sans-serif;
          border-bottom:1px solid #f0eeec;text-align:right;white-space:nowrap;">
          ${formatCents(item.lineTotalCents)}
        </td>
      </tr>`
    )
    .join("");

  const fulfillmentBlock =
    order.fulfillment === "shipping" && order.shippingAddress
      ? `<p style="margin:0;font-size:13px;color:#57534e;font-family:Arial,sans-serif;line-height:1.7;">
          ${[
            order.shippingAddress.line1,
            order.shippingAddress.line2,
            [order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postal_code]
              .filter(Boolean)
              .join(", "),
            order.shippingAddress.country,
          ]
            .filter(Boolean)
            .join("<br />")}
        </p>`
      : order.fulfillment === "pickup"
      ? `<p style="margin:0;font-size:13px;color:#57534e;font-family:Arial,sans-serif;">
          ${order.pickupLocation ?? "In-store pickup"}
        </p>`
      : `<p style="margin:0;font-size:13px;color:#a8a29e;font-family:Arial,sans-serif;">No address provided</p>`;

  const conflictBanner = isConflict
    ? `<div style="margin:0 0 20px;padding:12px 16px;background:#fef2f2;border:1px solid #fecaca;">
        <p style="margin:0;font-size:12px;font-weight:600;color:#b91c1c;font-family:Arial,sans-serif;
          letter-spacing:0.06em;text-transform:uppercase;">
          ⚠ Stock conflict — manual review required
        </p>
      </div>`
    : "";

  return emailLayout(`
    ${conflictBanner}
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;
      color:#a8a29e;font-family:Arial,sans-serif;">New order</p>
    <h1 style="margin:0 0 24px;font-size:20px;font-weight:600;color:#1c1917;font-family:Arial,sans-serif;">
      #${orderRef}
    </h1>

    <!-- Customer -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
      style="border:1px solid #e7e5e4;margin:0 0 20px;">
      <tr>
        <td style="padding:8px 12px;font-size:12px;color:#a8a29e;font-family:Arial,sans-serif;
          width:96px;border-bottom:1px solid #f0eeec;vertical-align:top;">Customer</td>
        <td style="padding:8px 12px;font-size:13px;color:#1c1917;font-family:Arial,sans-serif;
          border-bottom:1px solid #f0eeec;">${order.customerName}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-size:12px;color:#a8a29e;font-family:Arial,sans-serif;
          border-bottom:1px solid #f0eeec;vertical-align:top;">Email</td>
        <td style="padding:8px 12px;font-size:13px;font-family:Arial,sans-serif;
          border-bottom:1px solid #f0eeec;">
          <a href="mailto:${order.customerEmail}" style="color:#1c1917;">${order.customerEmail}</a>
        </td>
      </tr>
      ${order.phone
        ? `<tr>
            <td style="padding:8px 12px;font-size:12px;color:#a8a29e;font-family:Arial,sans-serif;
              vertical-align:top;">Phone</td>
            <td style="padding:8px 12px;font-size:13px;color:#1c1917;font-family:Arial,sans-serif;">
              ${order.phone}
            </td>
          </tr>`
        : ""}
    </table>

    <!-- Items -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
      style="border:1px solid #e7e5e4;margin:0 0 20px;">
      ${itemRows}
      <tr>
        <td colspan="2" style="padding:10px 12px;font-size:13px;font-weight:600;color:#1c1917;
          font-family:Arial,sans-serif;">Total</td>
        <td style="padding:10px 12px;font-size:13px;font-weight:600;color:#1c1917;
          font-family:Arial,sans-serif;text-align:right;white-space:nowrap;">
          ${formatCents(order.totalCents)}
        </td>
      </tr>
    </table>

    <!-- Fulfillment -->
    <div style="padding:14px 16px;background:#fafaf9;border:1px solid #f0eeec;">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;
        color:#a8a29e;font-family:Arial,sans-serif;">
        ${order.fulfillment === "pickup" ? "Pickup" : "Ship to"}
      </p>
      ${fulfillmentBlock}
    </div>
  `);
}

// ── Shipped / tracking notification email ─────────────────────────────────────

export interface ShippedEmailData {
  orderId: string;
  customerName: string;
  email: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  items: Array<{
    name: string;
    variant: string | null;
    quantity: number;
    imageUrl: string | null;
  }>;
}

function shippedEmailHtml(data: ShippedEmailData): string {
  const orderRef = data.orderId.slice(0, 8).toUpperCase();
  // NEXT_PUBLIC_SITE_URL is intentionally NOT used here — in Vercel environments it gets
  // set to a preview deployment URL which becomes a DEPLOYMENT_NOT_FOUND link in emails.
  // SITE_URL must be explicitly set to the canonical production domain in env settings.
  const siteUrl = (process.env.SITE_URL ?? "https://tierraoaxaca.com").replace(/\/$/, "");
  const viewOrderUrl = `${siteUrl}/track-order?q=${orderRef}`;

  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0eeec;vertical-align:top;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              ${item.imageUrl
                ? `<td style="padding-right:12px;vertical-align:top;">
                    <img src="${item.imageUrl}" alt="" width="48" height="60"
                      style="display:block;width:48px;height:60px;object-fit:cover;background:#f5f5f4;" />
                  </td>`
                : ""}
              <td style="vertical-align:top;">
                <p style="margin:0;font-size:14px;color:#1c1917;font-family:Arial,sans-serif;">${item.name}</p>
                ${item.variant
                  ? `<p style="margin:3px 0 0;font-size:12px;color:#a8a29e;font-family:Arial,sans-serif;">${item.variant}</p>`
                  : ""}
                ${item.quantity > 1
                  ? `<p style="margin:3px 0 0;font-size:12px;color:#a8a29e;font-family:Arial,sans-serif;">Qty: ${item.quantity}</p>`
                  : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    )
    .join("");

  const trackingBlock = data.trackingNumber
    ? `<div style="margin:24px 0;padding:20px 24px;background:#fafaf9;border:1px solid #e7e5e4;text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;
          color:#a8a29e;font-family:Arial,sans-serif;">
          ${data.carrier ? data.carrier + " · " : ""}Tracking number
        </p>
        <p style="margin:0 0 18px;font-family:'Courier New',monospace;font-size:17px;font-weight:700;
          letter-spacing:0.1em;color:#1c1917;">
          ${data.trackingNumber}
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            ${data.trackingUrl
              ? `<td style="padding-right:10px;">
                  <a href="${data.trackingUrl}" style="display:inline-block;background:#1c1917;color:#ffffff;
                    font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.14em;
                    text-transform:uppercase;text-decoration:none;padding:12px 22px;">
                    Track Order
                  </a>
                </td>`
              : ""}
            <td>
              <a href="${viewOrderUrl}" style="display:inline-block;background:transparent;color:#1c1917;
                border:1px solid #d6d3d1;font-family:Arial,sans-serif;font-size:11px;font-weight:700;
                letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;padding:11px 22px;">
                View Order
              </a>
            </td>
          </tr>
        </table>
      </div>`
    : `<div style="margin:24px 0;text-align:center;">
        <p style="margin:0 0 16px;font-size:14px;color:#78716c;font-family:Arial,sans-serif;line-height:1.7;">
          Tracking information will be available shortly.
        </p>
        <a href="${viewOrderUrl}" style="display:inline-block;background:transparent;color:#1c1917;
          border:1px solid #d6d3d1;font-family:Arial,sans-serif;font-size:11px;font-weight:700;
          letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;padding:11px 22px;">
          View Order
        </a>
      </div>`;

  return emailLayout(`
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;
      color:#a8a29e;font-family:Arial,sans-serif;">Your order is on its way</p>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:400;color:#1c1917;line-height:1.3;">
      Good news, ${data.customerName}.
    </h1>
    <p style="margin:0 0 4px;font-size:14px;color:#78716c;font-family:Arial,sans-serif;line-height:1.7;">
      Your order <strong>#${orderRef}</strong> has shipped.
    </p>

    ${trackingBlock}

    <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;
      color:#a8a29e;font-family:Arial,sans-serif;">What&rsquo;s in your order</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;">
      ${itemRows}
    </table>

    <p style="margin:0;font-size:13px;color:#a8a29e;line-height:1.6;font-family:Arial,sans-serif;">
      Questions? Reply to this email or visit our store.
    </p>
  `);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a welcome / confirmation email to a new subscriber.
 * Skipped silently if RESEND_API_KEY is not configured.
 * Never throws — always resolves.
 */
export async function sendWelcomeEmail(
  to: string,
  promoCode: string | null
): Promise<void> {
  console.log("[WELCOME EMAIL] starting");

  if (!to) {
    console.error("[WELCOME EMAIL] recipient is empty — skipping");
    return;
  }
  console.log("[WELCOME EMAIL] recipient:", to);

  const resend = getResend();
  if (!resend) return;
  const from = getFrom();
  if (!from) return;

  try {
    await resend.emails.send({
      from,
      to,
      subject: `Welcome to ${BRAND}`,
      html: welcomeEmailHtml(promoCode),
    });
    console.log("[WELCOME EMAIL] sent OK → to:", to);
  } catch (err) {
    console.error("[WELCOME EMAIL] failed → to:", to, err);
  }
}

// ── Security alert email ─────────────────────────────────────────────────────

export interface SecurityAlertData {
  eventType:        string;
  adminEmail:       string;
  ip:               string;
  userAgent:        string;
  timestamp:        string;
  sessionReplaced?: boolean;
  killedCount?:     number;
  metadata?:        Record<string, unknown>;
}

const ALERT_LABELS: Record<string, string> = {
  admin_login:            "Admin Login",
  admin_logout:           "Admin Logout",
  session_replaced:       "Session Replaced",
  kill_switch_triggered:  "⚠ Kill Switch Triggered",
  admin_role_granted:     "Admin Role Granted",
  password_reset:         "Password Reset",
  suspicious_login:       "⚠ Suspicious Login Attempt",
};

function securityAlertHtml(data: SecurityAlertData): string {
  const label = ALERT_LABELS[data.eventType] ?? data.eventType;
  const rows = [
    ["Event",     label],
    ["Admin",     data.adminEmail],
    ["Time",      new Date(data.timestamp).toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "full", timeStyle: "long" })],
    ["IP",        data.ip],
    ["Device",    data.userAgent.slice(0, 120)],
    ...(data.sessionReplaced ? [["Session", "Previous session was terminated"]] : []),
    ...(data.killedCount !== undefined ? [["Sessions killed", String(data.killedCount)]] : []),
  ] as [string, string][];

  const tableRows = rows
    .map(([k, v]) => `<tr><td style="padding:8px 12px;font-size:13px;color:#78716c;
      font-family:Arial,sans-serif;white-space:nowrap;vertical-align:top;border-bottom:1px solid #f0eeec;">${k}</td>
      <td style="padding:8px 12px;font-size:13px;color:#1c1917;font-family:Arial,sans-serif;
      border-bottom:1px solid #f0eeec;">${v}</td></tr>`)
    .join("");

  const isWarning = data.eventType.includes("suspicious") || data.eventType.includes("kill_switch");

  return emailLayout(`
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;
      color:${isWarning ? "#b91c1c" : "#a8a29e"};font-family:Arial,sans-serif;">
      Security Alert
    </p>
    <h1 style="margin:0 0 24px;font-size:20px;font-weight:600;color:#1c1917;">
      ${label}
    </h1>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
      style="border:1px solid #e7e5e4;margin:0 0 20px;">
      ${tableRows}
    </table>
    <p style="margin:0;font-size:12px;color:#a8a29e;font-family:Arial,sans-serif;">
      If this was not you, use the kill switch in the admin panel immediately.
    </p>
  `);
}

/**
 * Send a security alert to the admin alert address.
 * Skipped silently if RESEND_API_KEY or ADMIN_ALERT_EMAIL are not configured.
 * Never throws — always resolves.
 */
export async function sendSecurityAlert(data: SecurityAlertData): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const from = getFrom();
  if (!from) return;
  // ADMIN_ALERT_EMAIL takes precedence; falls back to ADMIN_EMAIL if not set separately.
  const alertTo = process.env.ADMIN_ALERT_EMAIL ?? process.env.ADMIN_EMAIL;
  if (!alertTo) {
    console.error("[SECURITY ALERT] sendSecurityAlert skipped — neither ADMIN_ALERT_EMAIL nor ADMIN_EMAIL is set");
    return;
  }

  const label = ALERT_LABELS[data.eventType] ?? data.eventType;
  try {
    console.log("[SECURITY ALERT] sendSecurityAlert → event:", data.eventType, "admin:", data.adminEmail, "to:", alertTo);
    await resend.emails.send({
      from,
      to:      alertTo,
      subject: `[${BRAND}] ${label} — ${data.adminEmail}`,
      html:    securityAlertHtml(data),
    });
    console.log("[SECURITY ALERT] sendSecurityAlert → sent OK, event:", data.eventType);
  } catch (err) {
    console.error("[SECURITY ALERT] sendSecurityAlert → FAILED, event:", data.eventType, err);
  }
}

// ── Order confirmation email ──────────────────────────────────────────────────

/**
 * Send an order confirmation email after a successful payment.
 * Skipped silently if RESEND_API_KEY is not configured.
 * Never throws — always resolves.
 */
export async function sendOrderConfirmationEmail(
  order: OrderEmailData
): Promise<void> {
  const orderRef = order.orderId.slice(0, 8).toUpperCase();
  console.log("[CUSTOMER ORDER EMAIL] starting → order:", orderRef);

  if (!order.email) {
    console.error("[CUSTOMER ORDER EMAIL] recipient is empty — skipping, order:", orderRef);
    return;
  }
  console.log("[CUSTOMER ORDER EMAIL] recipient:", order.email);

  const resend = getResend();
  if (!resend) return;
  const from = getFrom();
  if (!from) return;

  try {
    await resend.emails.send({
      from,
      to: order.email,
      subject: `Order confirmed — ${orderRef}`,
      html: orderConfirmationHtml(order),
    });
    console.log("[CUSTOMER ORDER EMAIL] sent OK → order:", orderRef, "to:", order.email);
  } catch (err) {
    console.error("[CUSTOMER ORDER EMAIL] failed → order:", orderRef, "to:", order.email, err);
  }
}

/**
 * Send a shipment notification to the customer with tracking info.
 * Skipped silently if RESEND_API_KEY is not configured.
 * Never throws — always resolves.
 */
export async function sendShippedEmail(data: ShippedEmailData): Promise<void> {
  const orderRef = data.orderId.slice(0, 8).toUpperCase();
  console.log("[SHIPPED EMAIL] starting → order:", orderRef);

  if (!data.email) {
    console.error("[SHIPPED EMAIL] recipient is empty — skipping, order:", orderRef);
    return;
  }

  const resend = getResend();
  if (!resend) return;
  const from = getFrom();
  if (!from) return;

  try {
    await resend.emails.send({
      from,
      to: data.email,
      subject: `Your order has shipped — #${orderRef}`,
      html: shippedEmailHtml(data),
    });
    console.log("[SHIPPED EMAIL] sent OK → order:", orderRef, "to:", data.email);
  } catch (err) {
    console.error("[SHIPPED EMAIL] failed → order:", orderRef, "to:", data.email, err);
  }
}

/**
 * Send a new-order notification to the business/admin email.
 * Reads ADMIN_EMAIL from env — skipped silently if not configured.
 * Never throws — always resolves.
 */
export async function sendAdminOrderNotification(
  order: AdminOrderData
): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const from = getFrom();
  if (!from) return;
  const adminTo = process.env.ADMIN_EMAIL;
  if (!adminTo) {
    console.error("[ADMIN EMAIL] sendAdminOrderNotification skipped — ADMIN_EMAIL not set");
    return;
  }
  const orderRef = order.orderId.slice(0, 8).toUpperCase();
  try {
    const conflictFlag = order.status === "STOCK_CONFLICT" ? " ⚠ STOCK CONFLICT" : "";
    console.log("[ADMIN EMAIL] sendAdminOrderNotification → attempting send to:", adminTo, "order:", orderRef);
    await resend.emails.send({
      from,
      to: adminTo,
      subject: `[${BRAND}] New order #${orderRef}${conflictFlag}`,
      html: adminOrderNotificationHtml(order),
    });
    console.log("[ADMIN EMAIL] sendAdminOrderNotification → sent OK, order:", orderRef);
  } catch (err) {
    console.error("[ADMIN EMAIL] sendAdminOrderNotification → FAILED, order:", orderRef, err);
  }
}
