import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/server-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();

  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("subscribers")
    .select("id, email, source, status, promo_code, promo_sent, created_at")
    .order("created_at", { ascending: false });

  const rows = data ?? [];
  const header = "email,source,status,promo_code,promo_sent,created_at\n";
  const body = rows
    .map((r) =>
      [
        `"${r.email}"`,
        r.source,
        r.status,
        r.promo_code ?? "",
        r.promo_sent ? "true" : "false",
        r.created_at,
      ].join(",")
    )
    .join("\n");

  return new NextResponse(header + body, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="subscribers.csv"`,
    },
  });
}
