import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  validateAdminSession,
  touchAdminSession,
  SESSION_COOKIE,
} from "@/lib/admin-security";

/**
 * GET /api/admin/session
 * Validate the current admin session cookie.
 * Called by AdminGuard on mount to confirm the session is active.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const sessionId   = cookieStore.get(SESSION_COOKIE)?.value;

    if (!sessionId) {
      return NextResponse.json({ valid: false, reason: "no_cookie" });
    }

    const result = await validateAdminSession(sessionId);
    return NextResponse.json({ valid: result.valid, reason: result.reason });
  } catch (err) {
    console.error("[/api/admin/session GET]", err);
    return NextResponse.json({ valid: false, reason: "error" });
  }
}

/**
 * POST /api/admin/session
 * Heartbeat — update last_active_at and confirm the session is still valid.
 * Called by SessionMonitor every 5 minutes.
 * Returns { valid: false } if the session was killed externally (kill switch).
 */
export async function POST(_req: NextRequest): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const sessionId   = cookieStore.get(SESSION_COOKIE)?.value;

    if (!sessionId) {
      return NextResponse.json({ valid: false, reason: "no_cookie" });
    }

    const touched = await touchAdminSession(sessionId);
    return NextResponse.json({ valid: touched });
  } catch (err) {
    console.error("[/api/admin/session POST]", err);
    return NextResponse.json({ valid: false, reason: "error" });
  }
}
