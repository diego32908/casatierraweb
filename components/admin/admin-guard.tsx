"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SessionMonitor } from "@/components/admin/session-monitor";

/**
 * Three-layer admin access guard:
 *
 * 1. proxy.ts (edge)     — JWT valid + admin_profiles exists         (every request)
 * 2. AdminGuard (client) — is-admin API + active session cookie       (on mount)
 * 3. requireAdmin()      — re-verifies before any server action       (per mutation)
 *
 * This guard (layer 2) runs once per page load after SSR completes.
 * It also mounts <SessionMonitor> which handles inactivity timeouts and
 * server-side kill-switch detection via periodic heartbeats.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router    = useRouter();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    (async () => {
      // Step 1: Verify Supabase identity (server-verified JWT, not cached session)
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user) {
        router.replace("/admin/login");
        return;
      }

      // Step 2: Confirm admin role via API
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        router.replace("/admin/login");
        return;
      }

      const isAdminRes  = await fetch("/api/auth/is-admin", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const { isAdmin } = await isAdminRes.json().catch(() => ({ isAdmin: false }));

      if (!isAdmin) {
        router.replace("/admin/login?error=access_denied");
        return;
      }

      // Step 3: Validate our custom session cookie
      const sessionRes  = await fetch("/api/admin/session");
      const sessionData = await sessionRes.json().catch(() => ({ valid: false, reason: "error" }));

      if (!sessionData.valid) {
        // Session was killed externally (kill switch) or expired
        await supabaseBrowser.auth.signOut();
        router.replace(`/admin/login?reason=${sessionData.reason ?? "session_invalid"}`);
        return;
      }

      setVerified(true);
    })();
  }, [router]);

  if (!verified) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xs uppercase tracking-widest text-stone-400">Checking access…</p>
      </div>
    );
  }

  return (
    <>
      <SessionMonitor />
      {children}
    </>
  );
}
