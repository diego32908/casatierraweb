import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FLAT_SHIPPING_RATE_CENTS } from "@/lib/constants";

export interface ShippingSettings {
  flatRateCents: number;
  freeThresholdCents: number;
}

/** Default free-shipping threshold: $150.00 */
const FREE_THRESHOLD_DEFAULT_CENTS = 15000;

/**
 * Read shipping settings from the DB, falling back to compiled-in defaults.
 * Safe to call from server components and API routes.
 * Never throws — always returns a usable value.
 */
export async function getShippingSettings(): Promise<ShippingSettings> {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "shipping")
      .single();

    const v = data?.value as Record<string, unknown> | undefined;
    if (v) {
      return {
        flatRateCents:
          typeof v.flat_rate_cents === "number"
            ? v.flat_rate_cents
            : FLAT_SHIPPING_RATE_CENTS,
        freeThresholdCents:
          typeof v.free_threshold_cents === "number"
            ? v.free_threshold_cents
            : FREE_THRESHOLD_DEFAULT_CENTS,
      };
    }
  } catch {
    // Fall through to defaults if DB is unreachable at read time
  }
  return {
    flatRateCents: FLAT_SHIPPING_RATE_CENTS,
    freeThresholdCents: FREE_THRESHOLD_DEFAULT_CENTS,
  };
}

/**
 * Compute the shipping charge for a given cart.
 * Returns 0 for pickup orders, 0 if the subtotal meets or exceeds the free
 * threshold, otherwise the flat rate.
 */
export function computeShippingCents(
  subtotalCents: number,
  fulfillment: "shipping" | "pickup",
  settings: ShippingSettings
): number {
  if (fulfillment === "pickup") return 0;
  if (subtotalCents >= settings.freeThresholdCents) return 0;
  return settings.flatRateCents;
}
