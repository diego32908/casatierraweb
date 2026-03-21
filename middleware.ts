import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // V3 skeleton:
  // real admin auth should be handled with Supabase auth middleware + cookie/session sync.
  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
