import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ isAdmin: false });

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ isAdmin: false });

    // Verify the token and get the user identity
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) return NextResponse.json({ isAdmin: false });

    // Check admin_profiles using service role (bypasses RLS)
    const serviceClient = createServerSupabaseClient();
    const { data } = await serviceClient
      .from("admin_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    return NextResponse.json({ isAdmin: !!data });
  } catch {
    return NextResponse.json({ isAdmin: false });
  }
}
