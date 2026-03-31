import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin login page is exempt — it is the auth destination, not a protected route
  if (pathname === "/admin/login") {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  // ── Layer 1: Verify Supabase JWT ──────────────────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url    = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search   = "";
    return NextResponse.redirect(url);
  }

  // ── Layer 2: Verify admin role ────────────────────────────────────────────
  // Uses service role client to bypass RLS and check admin_profiles.
  // This prevents any authenticated Supabase user (e.g. a customer) from
  // accessing the admin UI, not just unauthenticated requests.
  try {
    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: profile } = await service
      .from("admin_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      const url    = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search   = "?error=access_denied";
      return NextResponse.redirect(url);
    }
  } catch {
    // If the admin check fails (DB unreachable), fail closed — deny access
    const url    = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search   = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: "/admin/:path*",
};
