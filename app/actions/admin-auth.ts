"use server";

import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createAdminSession,
  destroyAdminSession,
  killAllAdminSessions,
  logSecurityEvent,
  validateAdminSession,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  extractIp,
} from "@/lib/admin-security";
import { sendSecurityAlert } from "@/lib/email";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getAuthenticatedAdminUser(): Promise<{
  id: string;
  email: string;
} | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: ()        => cookieStore.getAll(),
        setAll: ()        => { /* read-only in actions */ },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !user.email) return null;

  // Verify admin_profiles using service role (bypasses RLS)
  const service = createServerSupabaseClient();
  const { data } = await service
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!data) return null;
  return { id: user.id, email: user.email };
}

// ── Public actions ────────────────────────────────────────────────────────────

/**
 * Called immediately after a successful Supabase signInWithPassword().
 * Creates the admin_sessions row, sets the __admin_sid cookie, logs the event,
 * and sends an alert email.
 *
 * Returns { error } if the authenticated user is not an admin.
 */
export async function beginAdminSession(
  userAgent: string
): Promise<{ error?: string }> {
  const user = await getAuthenticatedAdminUser();
  if (!user) return { error: "access_denied" };

  const reqHeaders = await headers();
  const ip = extractIp(reqHeaders as unknown as Headers);

  try {
    const { sessionId, replacedCount } = await createAdminSession(
      user.id,
      ip,
      userAgent.slice(0, 512)
    );

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionId, SESSION_COOKIE_OPTIONS);

    await logSecurityEvent("admin_login", user.id, ip, userAgent, {
      session_replaced: replacedCount > 0,
      replaced_count:   replacedCount,
    });

    // Fire-and-forget alert
    sendSecurityAlert({
      eventType:       "admin_login",
      adminEmail:      user.email,
      ip,
      userAgent,
      timestamp:       new Date().toISOString(),
      sessionReplaced: replacedCount > 0,
    }).catch(console.error);

    return {};
  } catch (err) {
    console.error("[admin-auth] beginAdminSession error:", err);
    return { error: "session_error" };
  }
}

/**
 * Called on logout. Destroys the admin session, clears the cookie, logs the event.
 */
export async function endAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId   = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await destroyAdminSession(sessionId).catch(console.error);
  }

  // Clear the cookie
  cookieStore.set(SESSION_COOKIE, "", {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });

  // Log event (best-effort — no user context needed)
  const reqHeaders = await headers();
  const ip         = extractIp(reqHeaders as unknown as Headers);
  const user       = await getAuthenticatedAdminUser();
  if (user) {
    await logSecurityEvent(
      "admin_logout",
      user.id,
      ip,
      reqHeaders.get("user-agent") ?? ""
    ).catch(console.error);
  }
}

/**
 * Kill all active admin sessions.
 * Pass keepCurrent=true to preserve the caller's own session (log out others only).
 * Requires the caller to be an authenticated admin.
 */
export async function killSessions(
  keepCurrent: boolean
): Promise<{ error?: string; killed?: number }> {
  const user = await getAuthenticatedAdminUser();
  if (!user) return { error: "Unauthorized" };

  const cookieStore = await cookies();
  const sessionId   = cookieStore.get(SESSION_COOKIE)?.value;

  const reqHeaders = await headers();
  const ip         = extractIp(reqHeaders as unknown as Headers);
  const ua         = reqHeaders.get("user-agent") ?? "";

  const exceptId   = keepCurrent && sessionId ? sessionId : undefined;
  const killed     = await killAllAdminSessions(exceptId);

  if (!keepCurrent && sessionId) {
    // Clear caller's own cookie too
    cookieStore.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  }

  await logSecurityEvent("kill_switch_triggered", user.id, ip, ua, {
    kept_current: keepCurrent,
    killed_count: killed,
  });

  sendSecurityAlert({
    eventType:   "kill_switch_triggered",
    adminEmail:  user.email,
    ip,
    userAgent:   ua,
    timestamp:   new Date().toISOString(),
    killedCount: killed,
  }).catch(console.error);

  return { killed };
}

/**
 * Read and validate the current session cookie.
 * Used by AdminGuard to confirm the session is still live.
 */
export async function getSessionStatus(): Promise<{
  valid:   boolean;
  reason?: string;
}> {
  const cookieStore = await cookies();
  const sessionId   = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return { valid: false, reason: "no_cookie" };

  const result = await validateAdminSession(sessionId);
  return { valid: result.valid, reason: result.reason };
}
