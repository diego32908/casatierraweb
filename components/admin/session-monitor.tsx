"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { endAdminSession } from "@/app/actions/admin-auth";

const INACTIVITY_MS   = 30 * 60 * 1000; // 30 minutes — matches server-side constant
const HEARTBEAT_MS    = 5  * 60 * 1000; // heartbeat every 5 minutes
const CHECK_EVERY_MS  = 30 * 1000;      // poll every 30 seconds

/**
 * Invisible component that:
 * 1. Tracks user activity (mouse, keyboard, scroll, touch)
 * 2. After INACTIVITY_MS of no activity → force logout
 * 3. Sends a heartbeat every HEARTBEAT_MS → server validates session is still active
 *    If server returns valid=false (kill switch fired) → force logout
 *
 * Mounted inside AdminGuard, so it only runs when the session is verified.
 */
export function SessionMonitor() {
  const router            = useRouter();
  const lastActivityRef   = useRef(Date.now());
  const lastHeartbeatRef  = useRef(Date.now());
  const loggedOutRef      = useRef(false);

  const forceLogout = useCallback(async (reason: string) => {
    if (loggedOutRef.current) return;
    loggedOutRef.current = true;

    try {
      await endAdminSession();
      await supabaseBrowser.auth.signOut();
    } catch {
      // Ignore errors during forced logout — proceed to redirect regardless
    }

    router.replace(`/admin/login?reason=${reason}`);
  }, [router]);

  // Track activity across all input types
  useEffect(() => {
    function recordActivity() {
      lastActivityRef.current = Date.now();
    }
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;
    events.forEach((e) => window.addEventListener(e, recordActivity, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, recordActivity));
  }, []);

  // Inactivity check + heartbeat loop
  useEffect(() => {
    const interval = setInterval(async () => {
      if (loggedOutRef.current) return;

      const now = Date.now();

      // Inactivity check — entirely client-side, no network needed
      if (now - lastActivityRef.current > INACTIVITY_MS) {
        clearInterval(interval);
        await forceLogout("idle");
        return;
      }

      // Heartbeat — validates session server-side and updates last_active_at
      if (now - lastHeartbeatRef.current >= HEARTBEAT_MS) {
        lastHeartbeatRef.current = now;
        try {
          const res  = await fetch("/api/admin/session", { method: "POST" });
          const data = (await res.json()) as { valid: boolean; reason?: string };
          if (!data.valid) {
            clearInterval(interval);
            await forceLogout(data.reason ?? "session_invalid");
          }
        } catch {
          // Network error — don't logout, just retry next cycle
        }
      }
    }, CHECK_EVERY_MS);

    return () => clearInterval(interval);
  }, [forceLogout]);

  return null; // no visible UI
}
