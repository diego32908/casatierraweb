import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FLAT_SHIPPING_RATE_CENTS, heavyTierCents } from "@/lib/constants";

export interface ShippingSettings {
  flatRateCents: number;
  freeThresholdCents: number;
  priorityRateCents: number;
}

/** Default free-shipping threshold: $150.00 */
const FREE_THRESHOLD_DEFAULT_CENTS = 15000;

/** Default priority shipping rate: $15.99 */
const PRIORITY_DEFAULT_CENTS = 1599;

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
        priorityRateCents:
          typeof v.priority_rate_cents === "number"
            ? v.priority_rate_cents
            : PRIORITY_DEFAULT_CENTS,
      };
    }
  } catch {
    // Fall through to defaults if DB is unreachable at read time
  }
  return {
    flatRateCents: FLAT_SHIPPING_RATE_CENTS,
    freeThresholdCents: FREE_THRESHOLD_DEFAULT_CENTS,
    priorityRateCents: PRIORITY_DEFAULT_CENTS,
  };
}

/**
 * Compute the shipping charge for a given cart.
 * - Returns 0 for pickup orders.
 * - When heavyWeightOz > 0: uses weight-tier rates and disables the free-shipping threshold.
 * - Otherwise: applies free threshold and standard/priority rates.
 */
export function computeShippingCents(
  subtotalCents: number,
  fulfillment: "shipping" | "pickup",
  settings: ShippingSettings,
  shippingSpeed?: "standard" | "priority",
  heavyWeightOz?: number
): number {
  if (fulfillment === "pickup") return 0;
  if (heavyWeightOz && heavyWeightOz > 0) {
    return heavyTierCents(heavyWeightOz);
  }
  if (shippingSpeed === "priority") return settings.priorityRateCents;
  if (subtotalCents >= settings.freeThresholdCents) return 0;
  return settings.flatRateCents;
}
