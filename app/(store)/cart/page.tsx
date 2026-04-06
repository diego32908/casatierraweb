import { getShippingSettings } from "@/lib/shipping";
import { CartClient } from "./cart-client";

export default async function CartPage() {
  const shipping = await getShippingSettings();
  return (
    <CartClient
      flatShippingCents={shipping.flatRateCents}
      priorityShippingCents={shipping.priorityRateCents}
      freeThresholdCents={shipping.freeThresholdCents}
    />
  );
}
