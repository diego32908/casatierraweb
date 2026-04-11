import { createServerClient } from "@supabase/ssr";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login`);
  }

  // Build the success redirect first so we can attach session cookies directly
  // onto its response object. Using `await cookies()` + cookieStore.set() does NOT
  // work here: NextResponse.redirect() creates a new response that doesn't inherit
  // the next/headers cookie jar. Cookies must be set on the response we return.
  const successUrl = `${origin}/auth/confirmed`;
  const response = NextResponse.redirect(successUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Read from the incoming request (the confirmation link click)
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write onto the redirect response so the browser receives the session
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    // Expired or already-used link — send to login, skip profile step
    return NextResponse.redirect(`${origin}/auth/login?verified=failed`);
  }

  // Upsert profile row now that the user is verified. Metadata (first/last name)
  // was stored at signup time. Non-fatal — user is authenticated regardless.
  try {
    const email = data.user.email ?? "";
    const meta = data.user.user_metadata ?? {};
    if (email) {
      const serviceClient = createServerSupabaseClient();
      await serviceClient.from("profiles").upsert(
        {
          id: data.user.id,
          email: email.toLowerCase(),
          first_name: (meta.first_name as string | undefined) ?? null,
          last_name: (meta.last_name as string | undefined) ?? null,
        },
        { onConflict: "id" }
      );
    }
  } catch (profileErr) {
    console.error("[auth/callback] profile upsert failed:", profileErr);
  }

  return response;
}
