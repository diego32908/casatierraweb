export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "Tierra Oaxaca";
export const FLAT_SHIPPING_RATE_CENTS = Number(process.env.FLAT_SHIPPING_RATE_CENTS || 899);
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
