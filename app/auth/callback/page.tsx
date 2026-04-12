"use client";

// This page is the landing target for Supabase email confirmation links.
//
// Why client-side (not a Route Handler):
//   @supabase/ssr uses PKCE by default. When signUp() is called from
//   createBrowserClient, a code_verifier is generated and stored in the
//   browser's localStorage. The confirmation link opens in a new tab with
//   a ?code= param. Exchanging that code server-side fails because the
//   server has no access to the original tab's code_verifier.
//   A client-side page uses supabaseBrowser which reads code_verifier from
//   localStorage and completes the exchange correctly.
//
// URL formats handled:
//   ?code=xxx          — PKCE exchange (default Supabase flow)
//   ?token_hash=xxx    — OTP direct verification (older / alternative flow)
//   #access_token=xxx  — Implicit flow (legacy)

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

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
          // PKCE flow — browser client uses localStorage code_verifier
          const { error } = await supabaseBrowser.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && type) {
          // Direct OTP verification (no PKCE verifier needed)
          const { error } = await supabaseBrowser.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "signup" | "magiclink" | "recovery" | "email",
          });
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          // Implicit flow — set session directly from hash
          const { error } = await supabaseBrowser.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else {
          // No recognised params — check if session already exists (e.g. browser
          // client auto-handled the URL before this effect ran)
          const { data: { session } } = await supabaseBrowser.auth.getSession();
          if (!session) throw new Error("No auth params and no session");
        }

        // Session is now established. Upsert the profile row so account page works.
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

        // Session is in localStorage — this also fires onAuthStateChange in any
        // other open tab (e.g. the original signup "Check your inbox" tab) via the
        // browser's cross-tab storage event, switching it to the verified state.
        router.replace("/auth/confirmed");
      } catch (err) {
        console.error("[auth/callback] error:", err);
        setFailed(true);
      }
    }

    run();
  }, [router]);

  if (failed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="text-center" style={{ maxWidth: 360 }}>
          <Link href="/" className="text-base font-medium tracking-[0.08em] text-stone-900 hover:text-stone-600 transition-colors">
            Tierra Oaxaca
          </Link>
          <p className="mt-10 text-sm text-stone-700">
            This confirmation link has expired or has already been used.
          </p>
          <div className="mt-6">
            <Link
              href="/auth/login"
              className="text-xs uppercase tracking-[0.16em] text-stone-500 underline underline-offset-4 hover:text-stone-900 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-xs uppercase tracking-widest text-stone-400">Confirming…</p>
    </div>
  );
}
