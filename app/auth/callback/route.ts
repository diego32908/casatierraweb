import { createServerClient } from "@supabase/ssr";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login`);
  }

  const cookieStore = await cookies();

  // Use anon key + cookies so the auth session is written into the cookie jar
  // and the user lands fully signed in after the redirect.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    // Verification failed (expired / already used) — send to login with message
    return NextResponse.redirect(`${origin}/auth/login?verified=failed`);
  }

  // Create profile row using service role — the user is now verified,
  // their metadata (first/last name) was stored at signup time.
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
    // Non-fatal — user is authenticated regardless
    console.error("[auth/callback] profile upsert failed:", profileErr);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
