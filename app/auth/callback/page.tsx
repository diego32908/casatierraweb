"use client";

// Landing target for Supabase email confirmation links.
//
// Why client-side (not a Route Handler):
//   @supabase/ssr uses PKCE by default. signUp() stores a code_verifier in
//   localStorage of the originating tab. The confirmation link opens in a new
//   tab — exchangeCodeForSession() must run in the browser so the client can
//   read that code_verifier. A server Route Handler has no access to it and
//   the exchange always fails.
//
// URL formats handled:
//   ?code=xxx          — PKCE exchange (default Supabase flow)
//   ?token_hash=xxx    — OTP direct verification
//   #access_token=xxx  — Implicit flow (legacy)

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

type ResendStatus = "idle" | "sending" | "sent" | "error";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<ResendStatus>("idle");

  useEffect(() => {
    async function run() {
      try {
        const params = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

        const code = params.get("code");
        const tokenHash = params.get("token_hash");
        const type = params.get("type");
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        if (code) {
          const { error } = await supabaseBrowser.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && type) {
          const { error } = await supabaseBrowser.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "signup" | "magiclink" | "recovery" | "email",
          });
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabaseBrowser.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else {
          const { data: { session } } = await supabaseBrowser.auth.getSession();
          if (!session) throw new Error("No auth params and no existing session");
        }

        // Session established — upsert profile and redirect
        const { data: { user } } = await supabaseBrowser.auth.getUser();
        if (user?.email) {
          const meta = user.user_metadata ?? {};
          await supabaseBrowser.from("profiles").upsert(
            {
              id: user.id,
              email: user.email.toLowerCase(),
              first_name: (meta.first_name as string | undefined) ?? null,
              last_name: (meta.last_name as string | undefined) ?? null,
            },
            { onConflict: "id" }
          );
        }

        // Writing session to localStorage also fires onAuthStateChange in the
        // original signup tab, switching it to the verified state automatically.
        router.replace("/auth/confirmed");
      } catch (err) {
        console.error("[auth/callback] error:", err);
        setFailed(true);
      }
    }

    run();
  }, [router]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    const email = resendEmail.trim().toLowerCase();
    if (!email) return;
    setResendStatus("sending");
    const { error } = await supabaseBrowser.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setResendStatus(error ? "error" : "sent");
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (!failed) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xs uppercase tracking-widest text-stone-400">Confirming…</p>
      </div>
    );
  }

  // ── Expired / already-used link ──────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-stone-50">
      <div style={{ width: "100%", maxWidth: 420 }}>

        <div className="text-center mb-12">
          <Link href="/" className="text-base font-medium tracking-[0.08em] text-stone-900 hover:text-stone-600 transition-colors">
            Tierra Oaxaca
          </Link>
        </div>

        <div className="bg-white border border-stone-200 px-10 py-12 text-center">

          <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-full border border-stone-100 bg-stone-50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>

          <h1 className="text-xl font-medium text-stone-900 mb-2 tracking-[-0.01em]">
            This link has expired
          </h1>
          <p className="text-[13px] text-stone-400 mb-8 leading-relaxed">
            Confirmation links are only valid for a short time.<br />
            Enter your email and we&apos;ll send you a fresh one.
          </p>

          {resendStatus === "sent" ? (
            <div className="border-t border-stone-100 pt-6">
              <p className="text-[13px] text-stone-600">
                A new confirmation link has been sent.
              </p>
              <p className="text-xs text-stone-400 mt-2">
                Check your inbox — and your spam or promotions folder.
              </p>
            </div>
          ) : (
            <form onSubmit={handleResend} className="space-y-3 text-left">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.16em] text-stone-500 mb-1.5">
                  Email
                </label>
                <input
                  required
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  className="w-full border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors"
                />
              </div>
              {resendStatus === "error" && (
                <p className="text-xs text-red-500">
                  Couldn&apos;t send — please try again in a moment.
                </p>
              )}
              <button
                type="submit"
                disabled={resendStatus === "sending"}
                className="w-full rounded-full bg-stone-900 py-3 text-xs font-medium tracking-[0.12em] uppercase text-white hover:bg-stone-700 transition-colors disabled:opacity-60"
              >
                {resendStatus === "sending" ? "Sending…" : "Send new confirmation link"}
              </button>
            </form>
          )}

        </div>

        <div className="mt-8 text-center">
          <Link
            href="/auth/login"
            className="text-[11px] uppercase tracking-[0.18em] text-stone-400 hover:text-stone-700 transition-colors"
          >
            Sign in instead
          </Link>
        </div>

      </div>
    </div>
  );
}
