import { Resend } from "resend";

// Lazy-initialized so the constructor never runs when RESEND_API_KEY is absent.
// The constructor throws "Missing API key" on empty/undefined keys, which would
// crash any serverless function that imports this module — even if the send is
// guarded later. Lazy init avoids that crash entirely.
let _resend: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

const FROM = process.env.EMAIL_FROM ?? "Tierra Oaxaca <hello@tierraoaxaca.com>";
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
          <p style="margin:0;font-size:14px;color:#1c1917;font-family:Arial,sans-serif;">
            ${item.name}
          </p>
          ${
            item.variant
              ? `<p style="margin:2px 0 0;font-size:12px;color:#a8a29e;font-family:Arial,sans-serif;">${item.variant}</p>`
              : ""
          }
          ${
            item.quantity > 1
              ? `<p style="margin:2px 0 0;font-size:12px;color:#a8a29e;font-family:Arial,sans-serif;">×${item.quantity}</p>`
              : ""
          }
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
  const resend = getResend();
  if (!resend) return; // RESEND_API_KEY not configured — skip silently
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Welcome to ${BRAND}`,
      html: welcomeEmailHtml(promoCode),
    });
  } catch (err) {
    console.error("[email] sendWelcomeEmail failed:", err);
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
  const resend    = getResend();
  const alertTo   = process.env.ADMIN_ALERT_EMAIL;
  if (!resend || !alertTo) return;

  const label = ALERT_LABELS[data.eventType] ?? data.eventType;
  try {
    await resend.emails.send({
      from:    FROM,
      to:      alertTo,
      subject: `[${BRAND}] ${label} — ${data.adminEmail}`,
      html:    securityAlertHtml(data),
    });
  } catch (err) {
    console.error("[email] sendSecurityAlert failed:", err);
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
  const resend = getResend();
  if (!resend) return; // RESEND_API_KEY not configured — skip silently
  try {
    const orderRef = order.orderId.slice(0, 8).toUpperCase();
    await resend.emails.send({
      from: FROM,
      to: order.email,
      subject: `Order confirmed — ${orderRef}`,
      html: orderConfirmationHtml(order),
    });
  } catch (err) {
    console.error("[email] sendOrderConfirmationEmail failed:", err);
  }
}
