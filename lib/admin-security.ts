/**
 * Admin session management and security event logging.
 * All operations use the service role client — never anon/user tokens.
 * SERVER ONLY — never import from client components.
 */

import { createServerSupabaseClient } from "@/lib/supabase/server";

// ── Constants ─────────────────────────────────────────────────────────────────

export const SESSION_COOKIE = "__admin_sid";
export const SESSION_INACTIVITY_MS = 30 * 60 * 1000;  // 30 minutes
export const SESSION_MAX_AGE_MS    = 2  * 60 * 60 * 1000; // 2 hours
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path:     "/",   // must cover /api/admin/* routes too
  maxAge:   SESSION_MAX_AGE_MS / 1000, // seconds
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type SecurityEventType =
  | "admin_login"
  | "admin_logout"
  | "session_replaced"
  | "session_expired_idle"
  | "session_expired_hard"
  | "session_invalid"
  | "kill_switch_triggered"
  | "admin_role_granted"
  | "password_reset"
  | "suspicious_login";

export interface SessionValidation {
  valid:  boolean;
  reason?: "not_found" | "inactive" | "expired" | "idle";
  userId?: string;
}

// ── Session operations ────────────────────────────────────────────────────────

/**
 * Invalidate all active sessions for the user, then create a new one.
 * Returns the new session ID and how many prior sessions were killed.
 */
export async function createAdminSession(
  userId:    string,
  ip:        string,
  userAgent: string
): Promise<{ sessionId: string; replacedCount: number }> {
  const supabase = createServerSupabaseClient();

  // Count active sessions before killing them (for alert metadata)
  const { count } = await supabase
    .from("admin_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);

  // Invalidate all previous sessions for this user
  await supabase
    .from("admin_sessions")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  const sessionId  = crypto.randomUUID();
  const expiresAt  = new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString();

  const { error } = await supabase.from("admin_sessions").insert({
    id:             sessionId,
    user_id:        userId,
    ip_address:     ip,
    user_agent:     userAgent,
    is_active:      true,
    expires_at:     expiresAt,
  });

  if (error) throw new Error(`Failed to create admin session: ${error.message}`);

  return { sessionId, replacedCount: count ?? 0 };
}

/**
 * Validate a session ID from the cookie.
 * Also invalidates the session in the DB if it is idle or hard-expired.
 */
export async function validateAdminSession(
  sessionId: string
): Promise<SessionValidation> {
  if (!sessionId) return { valid: false, reason: "not_found" };

  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("admin_sessions")
    .select("user_id, is_active, expires_at, last_active_at")
    .eq("id", sessionId)
    .single();

  if (!data) return { valid: false, reason: "not_found" };
  if (!data.is_active) return { valid: false, reason: "inactive" };

  const now = Date.now();

  if (new Date(data.expires_at).getTime() < now) {
    await supabase
      .from("admin_sessions")
      .update({ is_active: false })
      .eq("id", sessionId);
    return { valid: false, reason: "expired" };
  }

  if (new Date(data.last_active_at).getTime() + SESSION_INACTIVITY_MS < now) {
    await supabase
      .from("admin_sessions")
      .update({ is_active: false })
      .eq("id", sessionId);
    return { valid: false, reason: "idle" };
  }

  return { valid: true, userId: data.user_id as string };
}

/**
 * Update last_active_at for an active session (heartbeat).
 * Also re-validates: returns false if the session was killed externally.
 */
export async function touchAdminSession(sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("admin_sessions")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("is_active", true)
    .select("id")
    .single();

  return !error && !!data;
}

/**
 * Mark a single session as inactive (clean logout).
 */
export async function destroyAdminSession(sessionId: string): Promise<void> {
  if (!sessionId) return;
  const supabase = createServerSupabaseClient();
  await supabase
    .from("admin_sessions")
    .update({ is_active: false })
    .eq("id", sessionId);
}

/**
 * Kill all active admin sessions (kill switch).
 * Pass `exceptSessionId` to keep the caller's own session alive.
 * Returns the number of sessions that were deactivated.
 */
export async function killAllAdminSessions(
  exceptSessionId?: string
): Promise<number> {
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("admin_sessions")
    .update({ is_active: false })
    .eq("is_active", true);

  if (exceptSessionId) {
    query = query.neq("id", exceptSessionId);
  }

  const { count } = await supabase
    .from("admin_sessions")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .then(async (countResult) => {
      await query;
      return countResult;
    });

  return count ?? 0;
}

// ── Session listing ───────────────────────────────────────────────────────────

export interface AdminSessionRow {
  id:             string;
  ip_address:     string | null;
  user_agent:     string | null;
  created_at:     string;
  last_active_at: string;
  expires_at:     string;
  isCurrent:      boolean;
}

/**
 * Return all active sessions. Marks which one is the caller's current session.
 */
export async function getSessions(
  currentSessionId?: string
): Promise<AdminSessionRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("admin_sessions")
    .select("id, ip_address, user_agent, created_at, last_active_at, expires_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getSessions failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    ...row,
    isCurrent: row.id === currentSessionId,
  }));
}

// ── Security event logging ────────────────────────────────────────────────────

export async function logSecurityEvent(
  eventType: SecurityEventType,
  userId:    string | null,
  ip:        string,
  userAgent: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("security_events").insert({
    user_id:    userId,
    event_type: eventType,
    ip_address: ip,
    user_agent: userAgent,
    metadata:   metadata ?? {},
  });
  if (error) {
    // Event logging must never break the caller
    console.error("[security_events] insert failed:", error.message);
  }
}

// ── IP helper ─────────────────────────────────────────────────────────────────

export function extractIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
