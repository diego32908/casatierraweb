import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("products")
      .select("*, variants:product_variants(*)")
      .eq("is_active", true)
      .eq("is_archived", false)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: data });
  } catch (error) {
    console.error("GET /api/products error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
