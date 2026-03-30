"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

// Middleware handles auth redirect to /admin/login for unauthenticated requests.
// This guard is the second layer: verifies admin role via /api/auth/is-admin.
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user) {
        router.replace("/admin/login");
        return;
      }

      // getSession() is safe here for token extraction only — identity verified above via getUser()
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        router.replace("/admin/login");
        return;
      }

      const res = await fetch("/api/auth/is-admin", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const { isAdmin } = await res.json().catch(() => ({ isAdmin: false }));

      if (!isAdmin) {
        router.replace("/admin/login?error=access_denied");
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

  return <>{children}</>;
}
