import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getShippingSettings } from "@/lib/shipping";
import { CheckoutForm } from "./checkout-form";

export default async function CheckoutPage() {
  const [shipping, supabase] = [await getShippingSettings(), createServerSupabaseClient()];

  const { data: popupRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "popup")
    .single();

  const popup = (popupRow?.value ?? {}) as {
    enabled?: boolean;
    promo_code?: string | null;
    discount_text?: string | null;
  };

  // Only expose promo if the popup is active — no offer to show otherwise
  const promoCode = popup.enabled ? (popup.promo_code ?? null) : null;
  const discountText = popup.enabled ? (popup.discount_text ?? null) : null;

  return (
    <CheckoutForm
      flatShippingCents={shipping.flatRateCents}
      priorityShippingCents={shipping.priorityRateCents}
      freeThresholdCents={shipping.freeThresholdCents}
      promoCode={promoCode}
      discountText={discountText}
    />
  );
}
