"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { endAdminSession } from "@/app/actions/admin-auth";

export function AdminLogoutButton() {
  const router              = useRouter();
  const [isPending, start]  = useTransition();

  function handleLogout() {
    start(async () => {
      // Destroy our custom session record + clear __admin_sid cookie
      await endAdminSession().catch(console.error);
      // Sign out of Supabase (clears auth cookies)
      await supabaseBrowser.auth.signOut();
      router.push("/admin/login");
    });
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="text-[11px] uppercase tracking-[0.18em] text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-50"
    >
      {isPending ? "…" : "Sign out"}
    </button>
  );
}
