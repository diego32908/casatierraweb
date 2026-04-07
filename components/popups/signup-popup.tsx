"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
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
  isDuplicate,
  onClose,
}: {
  promoCode: string | null;
  isDuplicate: boolean;
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
        {isDuplicate ? (
          // Existing subscriber — do not re-expose the promo code
          <>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#1c1917", margin: 0 }}>Already subscribed.</p>
            <p style={{ fontSize: 13, color: "#78716c", margin: 0 }}>Check your inbox for your offer.</p>
            <p style={{ fontSize: 12, color: "#a8a29e", margin: "4px 0 0" }}>First-order offer sent at signup.</p>
          </>
        ) : (
          // New subscriber
          <>
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
                Check your inbox for your first-order offer.
              </p>
            )}
          </>
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
  status: "idle" | "loading" | "error";
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
            // Explicit -webkit-appearance reset for Safari
            WebkitAppearance: "none",
            borderRadius: 0,
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

// ── Small-screen helper ───────────────────────────────────────────────────────
// Returns true when the viewport is narrower than 640px. Avoids SSR mismatch by
// initialising to false and updating after mount.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 640); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// ── Shared layout props ───────────────────────────────────────────────────────

interface LayoutProps {
  config: PopupConfig;
  isDuplicate: boolean;
  status: "idle" | "loading" | "done" | "error";
  email: string;
  setEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDismiss: () => void;
  onClose: () => void;
}

// ── Layout A — Split ──────────────────────────────────────────────────────────

function SplitLayout({ config, isDuplicate, status, email, setEmail, onSubmit, onDismiss, onClose }: LayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div style={{
      position: "relative",
      zIndex: 10,
      width: "100%",
      maxWidth: isMobile ? "100%" : 800,
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
          width: 36,
          height: 36,
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
        gridTemplateColumns: isMobile ? "1fr" : "48% 52%",
        width: "100%",
        height: isMobile ? "auto" : 460,
        maxHeight: isMobile ? "85vh" : undefined,
        overflowY: isMobile ? "auto" : "hidden",
        borderRadius: 12,
        background: "#ffffff",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {/* Image */}
        <div style={{
          position: "relative",
          overflow: "hidden",
          background: "#e7e5e4",
          height: isMobile ? 180 : "auto",
        }}>
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
          padding: isMobile ? "28px 24px 32px" : "40px 40px",
          background: "#ffffff",
        }}>
          {status === "done" ? (
            <SuccessState
              promoCode={isDuplicate ? null : config.promoCode}
              isDuplicate={isDuplicate}
              onClose={onClose}
            />
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

function CenteredLayout({ config, isDuplicate, status, email, setEmail, onSubmit, onDismiss, onClose }: LayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div style={{
      position: "relative",
      zIndex: 10,
      width: "100%",
      maxWidth: isMobile ? "100%" : 500,
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
          width: 36,
          height: 36,
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
        maxHeight: isMobile ? "85vh" : undefined,
        overflowY: isMobile ? "auto" : undefined,
      }}>
        {config.imageUrl && (
          <div style={{ height: isMobile ? 140 : 176, overflow: "hidden", background: "#e7e5e4" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={config.imageUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}
        <div style={{ padding: isMobile ? "28px 24px 32px" : "40px 40px" }}>
          {status === "done" ? (
            <SuccessState
              promoCode={isDuplicate ? null : config.promoCode}
              isDuplicate={isDuplicate}
              onClose={onClose}
            />
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
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isPending, startTransition] = useTransition();

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

  // Safari-safe scroll lock.
  // overflow:hidden on html/body breaks input focus inside position:fixed overlays on iOS Safari.
  // The position:fixed + negative-top body approach is the reliable cross-browser fix.
  useEffect(() => {
    if (!visible) return;
    const scrollY = window.scrollY;
    const body = document.body;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflowY = "scroll"; // preserve scrollbar width to prevent layout shift
    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.width = "";
      body.style.overflowY = "";
      window.scrollTo(0, scrollY);
    };
  }, [visible]);

  const dismiss = useCallback(() => {
    setVisible(false);
    savePromo(dismissWithCooldown(loadPromo()));
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || isPending) return;
    setStatus("idle");
    setIsDuplicate(false);

    startTransition(async () => {
      try {
        const result = await subscribeEmail(email, "popup", config.promoCode);
        if (result.error) {
          setStatus("error");
        } else if (result.duplicate) {
          // Existing subscriber — suppress popup without re-exposing the promo code
          setIsDuplicate(true);
          savePromo(markSubscribed(loadPromo(), null));
          setStatus("done");
        } else {
          // New subscriber — save promo code to localStorage for checkout auto-apply
          setIsDuplicate(false);
          savePromo(markSubscribed(loadPromo(), config.promoCode));
          setStatus("done");
        }
      } catch {
        setStatus("error");
      }
    });
  }

  if (!visible) return null;

  const effectiveStatus = isPending ? "loading" : status;

  const sharedProps: LayoutProps = {
    config,
    isDuplicate,
    status: effectiveStatus,
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
        // pointer-events: none on the wrapper so it doesn't intercept clicks.
        // The backdrop and content card each restore pointer-events: auto explicitly.
        pointerEvents: "none",
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop — must restore pointer-events so the dismiss-on-click works */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background: "rgba(0,0,0,0.45)",
          pointerEvents: "auto",
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
