"use client";

import { useEffect, useState } from "react";
import { loadPromo, savePromo, isSubscribed, markSubscribed } from "@/lib/promo";
import { subscribeEmail } from "@/app/actions/subscribe";

interface Props {
  promoCode: string | null;
  discountText: string | null;
}

type Status = "idle" | "loading" | "done" | "duplicate" | "error";

/**
 * Slim inline promo callout shown in checkout for non-subscribed users.
 * Unlike the popup it is NOT blocked by the dismiss cooldown — checkout is
 * a high-intent moment and the offer is low-friction and non-blocking.
 * Suppressed entirely once the user has subscribed.
 */
export function CheckoutPromo({ promoCode, discountText }: Props) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    const promo = loadPromo();
    if (!isSubscribed(promo)) setShow(true);
  }, []);

  // Not yet hydrated — render nothing to avoid layout shift
  if (!mounted || !show) return null;

  // No offer configured — nothing to show
  if (!promoCode && !discountText) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === "loading") return;
    setStatus("loading");
    const result = await subscribeEmail(email, "popup", promoCode);
    if (result.error) {
      setStatus("error");
    } else {
      // duplicate or new — either way, mark subscribed client-side and show success
      savePromo(markSubscribed(loadPromo(), promoCode));
      setStatus("done");
    }
  }

  function handleCopy() {
    if (!promoCode) return;
    navigator.clipboard.writeText(promoCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      style={{
        border: "1px solid #e7e5e4",
        background: "#fafaf9",
        padding: "20px 24px",
      }}
    >
      {status === "done" ? (
        /* ── Success state ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: "1px solid #d6d3d1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg viewBox="0 0 16 16" style={{ width: 10, height: 10, color: "#57534e" }}
                fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2.5 8.5l4 4 7-8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1c1917" }}>
              You&rsquo;re on the list.
            </p>
          </div>

          {promoCode && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: "#fff",
                border: "1px dashed #d6d3d1",
                padding: "8px 14px",
              }}>
                <span style={{
                  fontFamily: "monospace",
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "#1c1917",
                }}>
                  {promoCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: copied ? "#16a34a" : "#78716c",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    transition: "color 0.15s",
                  }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#a8a29e" }}>
                Apply at checkout.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ── Capture state ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            {discountText && (
              <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "#1c1917" }}>
                {discountText} off your first order
              </p>
            )}
            <p style={{ margin: 0, fontSize: 12, color: "#78716c" }}>
              Join the list and unlock your discount code instantly.
            </p>
          </div>

          {status === "error" && (
            <p style={{ margin: 0, fontSize: 12, color: "#b91c1c" }}>
              Something went wrong — please try again.
            </p>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                flex: "1 1 180px",
                height: 38,
                border: "1px solid #d6d3d1",
                background: "#fff",
                paddingLeft: 12,
                paddingRight: 12,
                fontSize: 13,
                color: "#1c1917",
                outline: "none",
                minWidth: 0,
              }}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              style={{
                height: 38,
                paddingLeft: 16,
                paddingRight: 16,
                background: "#1c1917",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                border: "none",
                cursor: status === "loading" ? "not-allowed" : "pointer",
                opacity: status === "loading" ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {status === "loading" ? "…" : "Unlock"}
            </button>
          </form>

          <p style={{ margin: 0, fontSize: 11, color: "#a8a29e" }}>
            No spam. Unsubscribe anytime.
          </p>
        </div>
      )}
    </div>
  );
}
