"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useResendConfirmation } from "@/app/auth/use-resend-confirmation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { status: resendStatus, countdown, canResend, resend } = useResendConfirmation();

  const [failed, setFailed] = useState(false);
  const [resendEmail, setResendEmail] = useState("");

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

        router.replace("/auth/confirmed");
      } catch (err) {
        console.error("[auth/callback] error:", err);
        setFailed(true);
      }
    }

    run();
  }, [router]);

  // ── Loading ──────────────────────────────────────────────────────────────
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
            Confirmation links are only valid for a short time.
            Enter your email and we&apos;ll send you a fresh one.
          </p>

          {resendStatus === "sent" ? (
            <div className="border-t border-stone-100 pt-6 space-y-2">
              <p className="text-[13px] text-stone-600">
                A new confirmation link has been sent.
              </p>
              <p className="text-xs text-stone-400">
                Please use the newest email — previous links are no longer valid.
              </p>
              <p className="text-xs text-stone-400">
                Check your inbox and your spam or promotions folder.
              </p>
              {countdown > 0 && (
                <p className="text-[11px] text-stone-300 pt-1">
                  Send again in {countdown}s
                </p>
              )}
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); resend(resendEmail); }}
              className="space-y-3 text-left"
            >
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
                <p className="text-xs text-red-500 text-center">
                  We couldn&apos;t send the email right now. Please wait a moment and try again.
                </p>
              )}

              <button
                type="submit"
                disabled={!canResend || resendStatus === "sending"}
                className="w-full rounded-full bg-stone-900 py-3 text-xs font-medium tracking-[0.12em] uppercase text-white hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendStatus === "sending"
                  ? "Sending…"
                  : countdown > 0
                  ? `Send again in ${countdown}s`
                  : "Send new confirmation link"}
              </button>
            </form>
          )}

        </div>

        <div className="mt-8 text-center">
          <Link href="/auth/login" className="text-[11px] uppercase tracking-[0.18em] text-stone-400 hover:text-stone-700 transition-colors">
            Sign in instead
          </Link>
        </div>

      </div>
    </div>
  );
}
