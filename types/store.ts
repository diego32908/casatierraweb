export type ProductCategory =
  | "men"
  | "women"
  | "kids"
  | "dress"
  | "skirt"
  | "pottery"
  | "accessories"
  | "home_decor"
  | "shoes";


export type SizeMode =
  | "none"
  | "one_size"
  | "alpha"
  | "numeric"
  | "kids"
  | "shoes_us"
  | "custom";

export type Audience = "mens" | "womens" | "kids" | "unisex";

export type FitStyle = "fitted" | "relaxed" | "oversized";

export type FulfillmentType = "shipping" | "pickup";

export type OrderStatus =
  | "PAID"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED"
  | "STOCK_CONFLICT";

export type CustomRequestStatus = "new" | "reviewing" | "contacted" | "closed";

export interface Product {
  id: string;
  slug: string;
  sku: string | null;
  name_en: string;
  name_es: string;
  description_en: string | null;
  description_es: string | null;
  category: ProductCategory;
  gender_tag: string | null;
  size_mode: SizeMode;
  base_price_cents: number;
  compare_at_price_cents: number | null;
  featured: boolean;
  is_active: boolean;
  material: string | null;
  care_notes: string | null;
  primary_image_url: string | null;
  image_urls: string[];
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  fit_note: string | null;
  audience: Audience;
  fit_style: FitStyle | null;
  search_keywords: string | null;
  // Pottery / home display fields
  vessel_type: string | null;
  size_label_display: string | null;
  dimensions_display: string | null;
  // Shipping dimensions (product-level; variant-level overrides these)
  weight_oz: number | null;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  // Whether to render any measurement UI on the PDP (size chart, specs block).
  // Defaults to true; set to false to suppress all measurement sections.
  // Optional because older rows may not have this column populated.
  show_measurements?: boolean;
  // Per-product size chart override (replaces static chart when set)
  size_chart_override: {
    type: "apparel";
    rows: Array<{ label: string; valuesIn: Record<string, number> }>;
    note?: string;
  } | {
    type: "shoes";
    entries: Array<{ us: string; eu: string; mx: string }>;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface VariantMeasurementsCm {
  bust?: string;
  underbust?: string;
  waist?: string;
  hip?: string;
  inseam?: string;
  foot_length?: string;
  notes?: string;
}

export interface VariantMeasurementsIn {
  bust?: string;
  underbust?: string;
  waist?: string;
  hip?: string;
  inseam?: string;
  foot_length?: string;
  notes?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_sku: string | null;
  color_name: string | null;
  color_hex: string | null;
  size_label: string;
  size_sort: number;
  stock: number;
  low_stock_threshold: number;
  price_override_cents: number | null;
  is_default: boolean;
  us_size: string | null;
  eu_size: string | null;
  uk_size: string | null;
  mx_size: string | null;
  jp_size: string | null;
  measurements_cm: VariantMeasurementsCm | null;
  measurements_in: VariantMeasurementsIn | null;
  // Shipping dimensions (overrides product-level when set)
  weight_oz: number | null;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProductWithVariants extends Product {
  variants: ProductVariant[];
}

export interface ShippingAddress {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface Order {
  id: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  customer_name: string;
  email: string;
  phone: string | null;
  fulfillment: FulfillmentType;
  shipping_address: ShippingAddress | null;
  pickup_location: string | null;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  currency: string;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name_snapshot: string;
  variant_label_snapshot: string | null;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
  image_url_snapshot: string | null;
  created_at: string;
}

export interface Subscriber {
  id: string;
  email: string;
  phone: string | null;
  source: string;
  discount_code: string | null;
  created_at: string;
}

export interface CustomRequest {
  id: string;
  customer_name: string | null;
  email: string;
  phone: string | null;
  description: string;
  reference_image_url: string | null;
  status: CustomRequestStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaitlistEntry {
  id: string;
  product_id: string;
  variant_id: string | null;
  email: string;
  created_at: string;
}

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

export interface CheckoutCartItemInput {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface CheckoutRequestBody {
  /** Optional when initiating directly from cart — Stripe collects name at checkout. */
  customerName?: string;
  /** Optional when initiating directly from cart — Stripe collects email at checkout. */
  email?: string;
  phone?: string;
  fulfillment: FulfillmentType;
  shippingSpeed?: "standard" | "priority";
  items: CheckoutCartItemInput[];
  discountCode?: string | null;
  locale?: "en" | "es";
}

export interface CheckoutMetadata {
  customerName: string;
  email: string;
  phone?: string;
  fulfillment: FulfillmentType;
  items: string;
  locale?: "en" | "es";
}
