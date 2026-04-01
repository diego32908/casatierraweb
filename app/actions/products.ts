"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/server-auth";
import type { ProductCategory, SizeMode, Audience, FitStyle } from "@/types/store";

// ── Helper ────────────────────────────────────────────────────────────────────
// Strip keys whose value is null before building a Supabase payload.
// Used for pottery/shipping columns that may not exist in the DB yet
// (pending migration). If the field is blank → omitted from the payload →
// no column-not-found error. Once the migration is applied and the admin
// enters a value, the column is written normally.
function withoutNulls<T extends Record<string, unknown>>(
  obj: T
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null)
  ) as Partial<T>;
}

// ── Weight parser ─────────────────────────────────────────────────────────────
function parseWeightOz(formData: FormData): number | null {
  const val  = parseFloat((formData.get("weight_value") as string) ?? "");
  const unit = (formData.get("weight_unit") as string) ?? "oz";
  if (!val || isNaN(val) || val <= 0) return null;
  return unit === "lb" ? val * 16 : val;
}

// ── Core product fields (always sent — columns guaranteed to exist) ────────────
function parseProductFields(formData: FormData) {
  const priceRaw = formData.get("price") as string;
  const nameEn   = (formData.get("name_en") as string).trim();
  const nameEs   = ((formData.get("name_es") as string) || "").trim();

  const base = {
    slug:                (formData.get("slug") as string).trim(),
    name_en:             nameEn,
    name_es:             nameEs || nameEn,
    base_price_cents:    Math.round(parseFloat(priceRaw || "0") * 100),
    compare_at_price_cents: (() => {
      const raw = (formData.get("compare_at_price") as string)?.trim();
      return raw ? Math.round(parseFloat(raw) * 100) : null;
    })(),
    category:        formData.get("category") as ProductCategory,
    size_mode:       formData.get("size_mode") as SizeMode,
    description_en:  (formData.get("description_en") as string)?.trim() || null,
    description_es:  (formData.get("description_es") as string)?.trim() || null,
    fit_note:        (formData.get("fit_note") as string)?.trim() || null,
    material:        (formData.get("material") as string)?.trim() || null,
    care_notes:      (formData.get("care_notes") as string)?.trim() || null,
    is_active:       formData.get("is_active") === "on",
    featured:        formData.get("featured") === "on",
    audience:        (formData.get("audience") as Audience) || "unisex",
    fit_style:       ((formData.get("fit_style") as string) || null) as FitStyle | null,
    search_keywords: (formData.get("search_keywords") as string)?.trim() || null,
  };

  // Pottery / shipping columns — only included when the admin filled them in.
  // This prevents "column not found" errors if the pottery migration hasn't run yet.
  // Blank fields are omitted (not sent as NULL) so existing rows are untouched.
  const optional = withoutNulls({
    vessel_type:        (formData.get("vessel_type") as string)?.trim() || null,
    size_label_display: (formData.get("size_label_display") as string)?.trim() || null,
    dimensions_display: (formData.get("dimensions_display") as string)?.trim() || null,
    weight_oz:          parseWeightOz(formData),
    length_in:          parseFloat((formData.get("length_in") as string) ?? "") || null,
    width_in:           parseFloat((formData.get("width_in")  as string) ?? "") || null,
    height_in:          parseFloat((formData.get("height_in") as string) ?? "") || null,
  });

  return { ...base, ...optional };
}

export async function createProduct(
  formData: FormData
): Promise<{ error?: string; id?: string }> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const data     = parseProductFields(formData);

  const { data: inserted, error } = await supabase
    .from("products")
    .insert(data)
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  return { id: inserted.id };
}

export async function updateProduct(
  id: string,
  formData: FormData
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const data     = parseProductFields(formData);

  const { error } = await supabase.from("products").update(data).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/inventory/${id}`);
  return {};
}

export async function upsertVariant(
  productId: string,
  formData:  FormData
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase  = createServerSupabaseClient();
  const variantId = (formData.get("variant_id") as string) || null;

  // Core variant fields — always sent (columns exist in current schema)
  const base = {
    product_id:          productId,
    size_label:          (formData.get("size_label") as string).trim(),
    size_sort:           parseInt(formData.get("size_sort") as string) || 0,
    stock:               parseInt(formData.get("stock") as string) || 0,
    low_stock_threshold: parseInt(formData.get("low_stock_threshold") as string) || 5,
    is_default:          formData.get("is_default") === "on",
    us_size:             (formData.get("us_size") as string)?.trim() || null,
    eu_size:             (formData.get("eu_size") as string)?.trim() || null,
    uk_size:             (formData.get("uk_size") as string)?.trim() || null,
    mx_size:             (formData.get("mx_size") as string)?.trim() || null,
    jp_size:             (formData.get("jp_size") as string)?.trim() || null,
    color_name:          (formData.get("color_name") as string)?.trim() || null,
    color_hex:           (formData.get("color_hex") as string)?.trim() || null,
  };

  // Shipping fields — only sent when non-blank so they don't fail on missing columns.
  // Run migration 20260331_pottery_fields.sql to enable these fields.
  const shipping = withoutNulls({
    weight_oz: parseWeightOz(formData),
    length_in: parseFloat((formData.get("length_in") as string) ?? "") || null,
    width_in:  parseFloat((formData.get("width_in")  as string) ?? "") || null,
    height_in: parseFloat((formData.get("height_in") as string) ?? "") || null,
  });

  const payload = { ...base, ...shipping };

  let error;
  if (variantId) {
    ({ error } = await supabase
      .from("product_variants")
      .update(payload)
      .eq("id", variantId));
  } else {
    ({ error } = await supabase.from("product_variants").insert(payload));
  }

  if (error) return { error: error.message };

  revalidatePath(`/admin/inventory/${productId}`);
  return {};
}

export async function deleteVariant(
  variantId: string,
  productId: string
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("product_variants")
    .delete()
    .eq("id", variantId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/inventory/${productId}`);
  return {};
}
