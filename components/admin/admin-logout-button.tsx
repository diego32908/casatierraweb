"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function AdminLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await supabaseBrowser.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="text-[11px] uppercase tracking-[0.18em] text-stone-400 hover:text-stone-700 transition-colors"
    >
      Sign out
    </button>
  );
}
