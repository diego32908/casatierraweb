import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createServerSupabaseClient } from "./server";

/**
 * Verify the current request is from an authenticated admin.
 * Reads the session cookie, verifies the JWT with Supabase (getUser, not getSession),
 * then confirms the user has a row in admin_profiles.
 *
 * Throws if the caller is not authenticated or not an admin.
 * Call this as the first line of every admin-only server action.
 */
export async function requireAdmin(): Promise<void> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // read-only — server actions cannot set cookies in this context
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  const serviceClient = createServerSupabaseClient();
  const { data } = await serviceClient
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!data) {
    throw new Error("Forbidden: admin access required");
  }
}
