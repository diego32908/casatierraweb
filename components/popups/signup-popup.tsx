"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  loadPromo,
  savePromo,
  shouldShowPopup,
  markShown,
  dismissWithCooldown,
  markSubscribed,
} from "@/lib/promo";
import { subscribeEmail } from "@/app/actions/subscribe";

export interface PopupConfig {
  heading: string;
  bodyCopy: string | null;
  discountText: string | null;
  promoCode: string | null;
  ctaLabel: string;
  finePrint: string | null;
  imageUrl: string | null;
  layout: "split" | "centered";
}

// ── Success state ─────────────────────────────────────────────────────────────

function SuccessState({
  promoCode,
  onClose,
}: {
  promoCode: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!promoCode) return;
    navigator.clipboard.writeText(promoCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "24px 0", textAlign: "center" }}>
      {/* Checkmark */}
      <div style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid #e7e5e4", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 16 16" style={{ width: 16, height: 16, color: "#57534e" }} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2.5 8.5l4 4 7-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: "#1c1917", margin: 0 }}>You&rsquo;re in.</p>

        {promoCode ? (
          <>
            <p style={{ fontSize: 13, color: "#78716c", margin: 0 }}>Your first-order code:</p>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "#f5f5f4",
              border: "1px dashed #d6d3d1",
              borderRadius: 6,
              padding: "10px 16px",
              margin: "4px auto 0",
            }}>
              <span style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, letterSpacing: "0.12em", color: "#1c1917" }}>
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
            <p style={{ fontSize: 12, color: "#a8a29e", margin: "4px 0 0" }}>Enter this code at checkout.</p>
          </>
        ) : (
          <p style={{ fontSize: 13, color: "#78716c", margin: 0 }}>
            Your first-order offer is saved and will be applied at checkout.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          color: "#a8a29e",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          marginTop: 4,
        }}
      >
        Continue Shopping
      </button>
    </div>
  );
}

// ── Capture form ──────────────────────────────────────────────────────────────

function CaptureForm({
  config,
  status,
  email,
  setEmail,
  onSubmit,
  onDismiss,
}: {
  config: PopupConfig;
  status: "idle" | "loading" | "done" | "duplicate" | "error";
  email: string;
  setEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDismiss: () => void;
}) {
  const { heading, bodyCopy, discountText, ctaLabel, finePrint } = config;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.22em", color: "#a8a29e", margin: 0 }}>
        Exclusive Offer
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {discountText && (
          <p style={{ fontFamily: "Georgia, serif", fontSize: 38, fontWeight: 300, lineHeight: 1, color: "#1c1917", margin: 0 }}>
            {discountText}
          </p>
        )}
        {heading && (
          <h2 style={{
            fontSize: discountText ? 14 : 22,
            fontWeight: 600,
            color: discountText ? "#57534e" : "#1c1917",
            margin: 0,
            lineHeight: 1.3,
          }}>
            {heading}
          </h2>
        )}
      </div>

      {bodyCopy && (
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#78716c", margin: 0 }}>{bodyCopy}</p>
      )}

      {status === "duplicate" && (
        <p style={{ fontSize: 13, color: "#57534e", margin: 0 }}>You&rsquo;re already on the list.</p>
      )}
      {status === "error" && (
        <p style={{ fontSize: 13, color: "#b91c1c", margin: 0 }}>Something went wrong. Please try again.</p>
      )}

      <form
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 320 }}
      >
        <input
          type="email"
          required
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            height: 44,
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid #d6d3d1",
            background: "#fff",
            paddingLeft: 16,
            paddingRight: 16,
            fontSize: 14,
            color: "#1c1917",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          style={{
            height: 44,
            width: "100%",
            background: "#1c1917",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            border: "none",
            cursor: status === "loading" ? "not-allowed" : "pointer",
            opacity: status === "loading" ? 0.6 : 1,
          }}
        >
          {status === "loading" ? "…" : ctaLabel}
        </button>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            fontSize: 12,
            color: "#a8a29e",
            textDecoration: "underline",
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            padding: 0,
          }}
        >
          No thanks
        </button>
        {finePrint && (
          <p style={{ fontSize: 11, lineHeight: 1.5, color: "#a8a29e", margin: 0 }}>{finePrint}</p>
        )}
      </div>
    </div>
  );
}

// ── Layout A — Split ──────────────────────────────────────────────────────────

function SplitLayout({
  config,
  status,
  email,
  setEmail,
  onSubmit,
  onDismiss,
  onClose,
}: {
  config: PopupConfig;
  status: "idle" | "loading" | "done" | "duplicate" | "error";
  email: string;
  setEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDismiss: () => void;
  onClose: () => void;
}) {
  return (
    <div style={{
      position: "relative",
      zIndex: 10,
      width: "100%",
      maxWidth: 800,
      pointerEvents: "auto",
    }}>
      <button
        type="button"
        onClick={onDismiss}
        style={{
          position: "absolute",
          top: -12,
          right: -12,
          zIndex: 30,
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          background: "#ffffff",
          border: "1px solid #e7e5e4",
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
          cursor: "pointer",
          color: "#78716c",
        }}
        aria-label="Close"
      >
        <X style={{ width: 16, height: 16 }} />
      </button>

      <div style={{
        display: "grid",
        gridTemplateColumns: "48% 52%",
        width: "100%",
        height: 460,
        overflow: "hidden",
        borderRadius: 12,
        background: "#ffffff",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{ position: "relative", overflow: "hidden", background: "#e7e5e4" }}>
          {config.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.imageUrl}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #d6d3d1 0%, #a8a29e 100%)" }} />
          )}
        </div>

        <div style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflowY: "auto",
          padding: "40px 40px",
          background: "#ffffff",
        }}>
          {status === "done" ? (
            <SuccessState promoCode={config.promoCode} onClose={onClose} />
          ) : (
            <CaptureForm
              config={config}
              status={status}
              email={email}
              setEmail={setEmail}
              onSubmit={onSubmit}
              onDismiss={onDismiss}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Layout B — Centered ───────────────────────────────────────────────────────

function CenteredLayout({
  config,
  status,
  email,
  setEmail,
  onSubmit,
  onDismiss,
  onClose,
}: {
  config: PopupConfig;
  status: "idle" | "loading" | "done" | "duplicate" | "error";
  email: string;
  setEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDismiss: () => void;
  onClose: () => void;
}) {
  return (
    <div style={{
      position: "relative",
      zIndex: 10,
      width: "100%",
      maxWidth: 500,
      pointerEvents: "auto",
    }}>
      <button
        type="button"
        onClick={onDismiss}
        style={{
          position: "absolute",
          top: -12,
          right: -12,
          zIndex: 30,
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          background: "#ffffff",
          border: "1px solid #e7e5e4",
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
          cursor: "pointer",
          color: "#78716c",
        }}
        aria-label="Close"
      >
        <X style={{ width: 16, height: 16 }} />
      </button>

      <div style={{
        overflow: "hidden",
        borderRadius: 12,
        background: "#ffffff",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {config.imageUrl && (
          <div style={{ height: 176, overflow: "hidden", background: "#e7e5e4" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={config.imageUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}
        <div style={{ padding: "40px 40px" }}>
          {status === "done" ? (
            <SuccessState promoCode={config.promoCode} onClose={onClose} />
          ) : (
            <CaptureForm
              config={config}
              status={status}
              email={email}
              setEmail={setEmail}
              onSubmit={onSubmit}
              onDismiss={onDismiss}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function SignupPopup(config: PopupConfig) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "duplicate" | "error">("idle");

  // Trigger: randomized 7–10 seconds OR 40% scroll depth — whichever fires first.
  // Debug: add ?popup=1 to any URL to force it open immediately, bypassing localStorage.
  useEffect(() => {
    const forceOpen = new URLSearchParams(window.location.search).get("popup") === "1";

    if (forceOpen) {
      setVisible(true);
      return;
    }

    const promo = loadPromo();
    if (!shouldShowPopup(promo)) return;

    let triggered = false;
    function show() {
      if (triggered) return;
      triggered = true;
      const updated = markShown(loadPromo());
      savePromo(updated);
      setVisible(true);
    }

    // Randomize delay between 7 and 10 seconds
    const delay = 7000 + Math.random() * 3000;
    const timer = setTimeout(show, delay);

    function onScroll() {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total > 0 && window.scrollY / total >= 0.4) show();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Scroll lock while popup is open
  useEffect(() => {
    if (!visible) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
      document.body.style.overflow = "";
    };
  }, [visible]);

  const dismiss = useCallback(() => {
    setVisible(false);
    savePromo(dismissWithCooldown(loadPromo()));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === "loading") return;
    setStatus("loading");
    const result = await subscribeEmail(email, "popup", config.promoCode);
    if (result.duplicate) {
      // User is already subscribed — treat it as success and suppress future popups
      savePromo(markSubscribed(loadPromo(), config.promoCode));
      setStatus("done");
    } else if (result.error) {
      setStatus("error");
    } else {
      savePromo(markSubscribed(loadPromo(), config.promoCode));
      setStatus("done");
    }
  }

  if (!visible) return null;

  const sharedProps = {
    config,
    status,
    email,
    setEmail,
    onSubmit: handleSubmit,
    onDismiss: dismiss,
    onClose: () => setVisible(false),
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background: "rgba(0,0,0,0.45)",
        }}
        onClick={dismiss}
        aria-hidden
      />

      {config.layout === "split" ? (
        <SplitLayout {...sharedProps} />
      ) : (
        <CenteredLayout {...sharedProps} />
      )}
    </div>
  );
}
