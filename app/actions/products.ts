"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/server-auth";
import type { ProductCategory, SizeMode, Audience, FitStyle } from "@/types/store";

function parseProductFields(formData: FormData) {
  const priceRaw = formData.get("price") as string;
  const nameEn = (formData.get("name_en") as string).trim();
  const nameEs = ((formData.get("name_es") as string) || "").trim();
  return {
    slug: (formData.get("slug") as string).trim(),
    name_en: nameEn,
    name_es: nameEs || nameEn, // fall back to EN if ES is blank
    base_price_cents: Math.round(parseFloat(priceRaw || "0") * 100),
    compare_at_price_cents: (() => {
      const raw = (formData.get("compare_at_price") as string)?.trim();
      return raw ? Math.round(parseFloat(raw) * 100) : null;
    })(),
    category: formData.get("category") as ProductCategory,
    size_mode: formData.get("size_mode") as SizeMode,
    description_en: (formData.get("description_en") as string)?.trim() || null,
    description_es: (formData.get("description_es") as string)?.trim() || null,
    fit_note: (formData.get("fit_note") as string)?.trim() || null,
    material: (formData.get("material") as string)?.trim() || null,
    care_notes: (formData.get("care_notes") as string)?.trim() || null,
    is_active: formData.get("is_active") === "on",
    featured: formData.get("featured") === "on",
    audience: (formData.get("audience") as Audience) || "unisex",
    fit_style: ((formData.get("fit_style") as string) || null) as FitStyle | null,
    search_keywords: (formData.get("search_keywords") as string)?.trim() || null,
  };
}

export async function createProduct(
  formData: FormData
): Promise<{ error?: string; id?: string }> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const data = parseProductFields(formData);

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
  const data = parseProductFields(formData);

  const { error } = await supabase.from("products").update(data).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/inventory/${id}`);
  return {};
}

export async function upsertVariant(
  productId: string,
  formData: FormData
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const variantId = (formData.get("variant_id") as string) || null;

  const payload = {
    product_id: productId,
    size_label: (formData.get("size_label") as string).trim(),
    size_sort: parseInt(formData.get("size_sort") as string) || 0,
    stock: parseInt(formData.get("stock") as string) || 0,
    low_stock_threshold: parseInt(formData.get("low_stock_threshold") as string) || 5,
    is_default: formData.get("is_default") === "on",
    us_size: (formData.get("us_size") as string)?.trim() || null,
    eu_size: (formData.get("eu_size") as string)?.trim() || null,
    uk_size: (formData.get("uk_size") as string)?.trim() || null,
    mx_size: (formData.get("mx_size") as string)?.trim() || null,
    jp_size: (formData.get("jp_size") as string)?.trim() || null,
    color_name: (formData.get("color_name") as string)?.trim() || null,
    color_hex: (formData.get("color_hex") as string)?.trim() || null,
  };

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
