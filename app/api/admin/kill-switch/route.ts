import { NextRequest, NextResponse } from "next/server";
import { killSessions } from "@/app/actions/admin-auth";

/**
 * POST /api/admin/kill-switch
 * Body: { keepCurrent?: boolean }
 *
 * Kills all active admin sessions. Used by the admin security page.
 * Requires an active admin session (verified via the server action).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => ({})) as { keepCurrent?: boolean };
    const keepCurrent = body.keepCurrent === true;

    const result = await killSessions(keepCurrent);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Unauthorized" ? 401 : 500 }
      );
    }

    return NextResponse.json({ ok: true, killed: result.killed });
  } catch (err) {
    console.error("[/api/admin/kill-switch]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
