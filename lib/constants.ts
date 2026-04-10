export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "Tierra Oaxaca";
export const FLAT_SHIPPING_RATE_CENTS = Number(process.env.FLAT_SHIPPING_RATE_CENTS || 899);

// Heavy / fragile item shipping (pottery, home goods, weighted items)
export const HEAVY_CATEGORIES = ["pottery", "home_decor"] as const;
export const PACKAGING_BUFFER_OZ = 8; // 0.5 lb packaging buffer added to every heavy order

/** Weight-based shipping tiers for heavy / fragile carts (standard and priority). */
export const HEAVY_TIERS: ReadonlyArray<{ maxLb: number; cents: number }> = [
  { maxLb: 3,   cents: 1299 }, // 0–3 lb  → $12.99
  { maxLb: 8,   cents: 1899 }, // 3–8 lb  → $18.99
  { maxLb: 15,  cents: 2499 }, // 8–15 lb → $24.99
  { maxLb: 30,  cents: 3499 }, // 15–30 lb → $34.99
  { maxLb: 999, cents: 4999 }, // 30+ lb  → $49.99
];

/** Returns the shipping charge in cents for a given total cart weight in ounces. */
export function heavyTierCents(totalWeightOz: number): number {
  const lb = totalWeightOz / 16;
  for (const tier of HEAVY_TIERS) {
    if (lb <= tier.maxLb) return tier.cents;
  }
  return 4999;
}
export const PICKUP_LOCATION_LABEL =
  process.env.PICKUP_LOCATION_LABEL ||
  "1600 E Holt Ave Ste D24-D26, Pomona, CA 91767";

export const STORE_NAV = [
  { label: "WOMEN",            href: "/women" },
  { label: "MEN",              href: "/men" },
  { label: "KIDS & TODDLERS",  href: "/kids" },
  { label: "ACCESSORIES",      href: "/accessories" },
  { label: "HOME",             href: "/home" },
  { label: "SALE",             href: "/sale" },
] as const;

export const APP_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL"] as const;
export const SHOE_SIZES_US_MENS = ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "12"] as const;

export const LOW_STOCK_THRESHOLD = 5;
