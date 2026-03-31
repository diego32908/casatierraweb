"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { beginAdminSession } from "@/app/actions/admin-auth";

const inputCls =
  "w-full border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors";
const labelCls = "block text-[11px] uppercase tracking-[0.16em] text-stone-500 mb-1.5";

function reasonMessage(reason: string | null): string | null {
  switch (reason) {
    case "idle":            return "Session ended due to inactivity.";
    case "expired":         return "Session expired. Please sign in again.";
    case "session_invalid": return "Your session was ended remotely.";
    case "inactive":        return "Your session was ended remotely.";
    case "kill_switch":     return "All sessions were terminated.";
    default:                return null;
  }
}

// useSearchParams() requires a Suspense boundary in Next.js 14+.
function LoginForm() {
  const router  = useRouter();
  const params  = useSearchParams();

  const errorParam  = params.get("error");
  const reasonParam = params.get("reason");

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [isPending, start]      = useTransition();
  const [error, setError]       = useState<string | null>(
    errorParam === "access_denied"
      ? "This account does not have admin access."
      : reasonMessage(reasonParam)
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    start(async () => {
      // Step 1: Supabase authentication
      const { error: authError } = await supabaseBrowser.auth.signInWithPassword({
        email:    email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // Step 2: Create our custom admin session (sets __admin_sid cookie,
      // logs the event, sends the alert email, invalidates previous sessions)
      const result = await beginAdminSession(navigator.userAgent);

      if (result.error) {
        await supabaseBrowser.auth.signOut();
        if (result.error === "session_error") {
          setError("Sign-in failed due to a server error. Check Vercel logs for details.");
        } else {
          setError("This account does not have admin access.");
        }
        return;
      }

      router.push("/admin");
      router.refresh();
    });
  }

  return (
    <>
      {error && (
        <p className="mb-5 text-xs text-red-600 text-center">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Email</label>
          <input
            required
            type="email"
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label className={labelCls}>Password</label>
          <input
            required
            type="password"
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 w-full rounded-full bg-stone-900 py-3.5 text-sm font-medium tracking-wide text-white transition-colors hover:bg-stone-700 disabled:opacity-60"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div className="mb-10 text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400">
            Tierra Oaxaca
          </p>
          <p className="mt-6 text-xl font-medium text-stone-900">Admin</p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
