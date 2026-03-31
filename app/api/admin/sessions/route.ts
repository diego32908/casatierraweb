import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessions, SESSION_COOKIE } from "@/lib/admin-security";

/**
 * GET /api/admin/sessions
 * Returns all active admin sessions. Marks the caller's current session.
 * Used by the Security page to display the session list.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const sessionId   = cookieStore.get(SESSION_COOKIE)?.value;

    const sessions = await getSessions(sessionId);
    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("[/api/admin/sessions GET]", err);
    return NextResponse.json({ sessions: [] }, { status: 500 });
  }
}
