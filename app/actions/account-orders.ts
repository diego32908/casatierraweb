"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AccountOrder = {
  id: string;
  created_at: string;
  status: string;
  total_cents: number;
  fulfillment: string;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  order_items: Array<{
    id: string;
    product_name_snapshot: string;
    variant_label_snapshot: string | null;
    quantity: number;
    line_total_cents: number;
  }>;
};

/**
 * Fetch orders for the currently authenticated user.
 *
 * Security model:
 *  1. Auth is verified server-side via cookie JWT (auth.getUser() — cannot be
 *     spoofed by the client, unlike getSession() which trusts the stored token).
 *  2. The query uses the service-role client (bypasses RLS) with an EXPLICIT
 *     .eq("email", ...) filter keyed to the server-verified user email.
 *  3. This means isolation is enforced by application code, not solely by RLS.
 *     If RLS policies change or are misconfigured this function remains safe.
 *
 * Returns [] (empty array) when the user is unauthenticated or has no orders.
 * Never throws — always resolves.
 */
export async function getMyOrders(): Promise<AccountOrder[]> {
  try {
    // Step 1: verify auth server-side via cookie-backed JWT.
    // createServerClient with anon key + cookies = respects auth state without
    // trusting client-supplied tokens.
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // read-only context — cookie writes not needed here
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user || !user.email) {
      return [];
    }

    // Step 2: fetch orders with service-role client + explicit email filter.
    // The email is taken from the server-verified JWT — not from any client input.
    // .toLowerCase() matches the RLS policy semantics (lower(email) = lower(...))
    // and the Stripe webhook which stores lowercase emails.
    const serviceClient = createServerSupabaseClient();
    const { data, error } = await serviceClient
      .from("orders")
      .select(
        "id, created_at, status, total_cents, fulfillment, " +
        "tracking_number, tracking_url, carrier, " +
        "order_items(id, product_name_snapshot, variant_label_snapshot, quantity, line_total_cents)"
      )
      .eq("email", user.email.toLowerCase())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getMyOrders] query error:", error.message);
      return [];
    }

    return (data ?? []) as unknown as AccountOrder[];
  } catch (err) {
    console.error("[getMyOrders] unexpected error:", err);
    return [];
  }
}
