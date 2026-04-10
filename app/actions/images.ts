"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/server-auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFilename(originalName: string): string {
  const ext = originalName.split(".").pop()?.toLowerCase() ?? "jpg";
  const rand = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}-${rand}.${ext}`;
}

// ─── Product image actions ────────────────────────────────────────────────────

/**
 * Upload a file to product-images bucket and save the URL to the product.
 * purpose "primary" → sets primary_image_url
 * purpose "gallery"  → appends to image_urls
 */
export async function uploadProductImage(
  productId: string,
  purpose: "primary" | "gallery",
  formData: FormData
): Promise<{ error?: string }> {
  await requireAdmin();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No file provided" };
  if (!file.type.startsWith("image/")) return { error: "File must be an image" };
  if (file.size > 5 * 1024 * 1024) return { error: "File must be under 5 MB" };

  const supabase = createServerSupabaseClient();
  const path = `products/${productId}/${makeFilename(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("product-images").getPublicUrl(path);

  if (purpose === "primary") {
    const { error } = await supabase
      .from("products")
      .update({ primary_image_url: publicUrl })
      .eq("id", productId);
    if (error) return { error: error.message };
  } else {
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("image_urls")
      .eq("id", productId)
      .single();
    if (fetchError) return { error: fetchError.message };

    const urls: string[] = product.image_urls ?? [];
    const { error } = await supabase
      .from("products")
      .update({ image_urls: [...urls, publicUrl] })
      .eq("id", productId);
    if (error) return { error: error.message };
  }

  revalidatePath(`/admin/inventory/${productId}`);
  revalidatePath(`/products`);
  return {};
}

/**
 * Remove an image URL from a product.
 * field "primary" → sets primary_image_url to null
 * field "gallery"  → removes the URL from image_urls
 * Note: the file is left in storage (safe — avoids accidental data loss).
 */
export async function removeProductImage(
  productId: string,
  url: string,
  field: "primary" | "gallery"
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();

  if (field === "primary") {
    const { error } = await supabase
      .from("products")
      .update({ primary_image_url: null })
      .eq("id", productId);
    if (error) return { error: error.message };
  } else {
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("image_urls")
      .eq("id", productId)
      .single();
    if (fetchError) return { error: fetchError.message };

    const filtered = (product.image_urls ?? []).filter((u: string) => u !== url);
    const { error } = await supabase
      .from("products")
      .update({ image_urls: filtered })
      .eq("id", productId);
    if (error) return { error: error.message };
  }

  revalidatePath(`/admin/inventory/${productId}`);
  return {};
}

/**
 * Promote a gallery image to the primary image slot.
 */
export async function promoteToMainImage(
  productId: string,
  url: string
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("products")
    .update({ primary_image_url: url })
    .eq("id", productId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/inventory/${productId}`);
  return {};
}

/**
 * Replace the entire image_urls array (used for reordering).
 */
export async function saveGalleryOrder(
  productId: string,
  urls: string[]
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("products")
    .update({ image_urls: urls })
    .eq("id", productId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/inventory/${productId}`);
  return {};
}

// ─── Category card image action ──────────────────────────────────────────────

type CardRow = { key: string; label: string; hint: string; href: string; image_url: string | null };

const DEFAULT_CARDS: CardRow[] = [
  { key: "shoes",   label: "Shoes",       hint: "Footwear",        href: "/shop", image_url: null },
  { key: "apparel", label: "Apparel",     hint: "Clothing",        href: "/shop", image_url: null },
  { key: "home",    label: "Home & Goods", hint: "Pottery & Décor", href: "/shop", image_url: null },
];

/**
 * Upload an image for one category card and save its URL into the
 * site_settings.value.cards array for key "category_cards".
 */
export async function uploadCategoryCardImage(
  cardKey: string,
  formData: FormData
): Promise<{ error?: string }> {
  await requireAdmin();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No file provided" };
  if (!file.type.startsWith("image/")) return { error: "File must be an image" };
  if (file.size > 5 * 1024 * 1024) return { error: "File must be under 5 MB" };

  const supabase = createServerSupabaseClient();
  const path = `category_cards/${cardKey}/${makeFilename(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("site-images")
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("site-images").getPublicUrl(path);

  // Read current row (may not exist yet — fall back to defaults)
  const { data: row } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "category_cards")
    .single();

  const existingCards: CardRow[] = (row?.value as { cards?: CardRow[] })?.cards ?? DEFAULT_CARDS;
  const updatedCards = existingCards.map((c) =>
    c.key === cardKey ? { ...c, image_url: publicUrl } : c
  );

  const { error: dbError } = await supabase
    .from("site_settings")
    .upsert({ key: "category_cards", label: "Category Cards", value: { cards: updatedCards } });

  if (dbError) return { error: dbError.message };

  revalidatePath("/");
  revalidatePath("/admin/content");
  return {};
}

/**
 * Clear the image for one category card (sets image_url to null).
 */
export async function clearCategoryCardImage(
  cardKey: string
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();

  const { data: row } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "category_cards")
    .single();

  const existingCards: CardRow[] = (row?.value as { cards?: CardRow[] })?.cards ?? DEFAULT_CARDS;
  const updatedCards = existingCards.map((c) =>
    c.key === cardKey ? { ...c, image_url: null } : c
  );

  const { error: dbError } = await supabase
    .from("site_settings")
    .upsert({ key: "category_cards", label: "Category Cards", value: { cards: updatedCards } });

  if (dbError) return { error: dbError.message };

  revalidatePath("/");
  revalidatePath("/admin/content");
  return {};
}

// ─── Site image actions ───────────────────────────────────────────────────────

/**
 * Upload a file to the site-images bucket and patch the given field
 * inside a site_settings row. Example:
 *   uploadSiteImage("hero", "image_url", formData)
 *   → sets site_settings.value.image_url for key "hero"
 */
export async function uploadSiteImage(
  settingKey: string,
  imageField: string,
  formData: FormData
): Promise<{ error?: string }> {
  await requireAdmin();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No file provided" };
  if (!file.type.startsWith("image/")) return { error: "File must be an image" };
  if (file.size > 5 * 1024 * 1024) return { error: "File must be under 5 MB" };

  const supabase = createServerSupabaseClient();
  const path = `${settingKey}/${makeFilename(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("site-images")
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("site-images").getPublicUrl(path);

  // Read current value and patch just the image field
  const { data: row } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", settingKey)
    .single();

  const merged = { ...(row?.value ?? {}), [imageField]: publicUrl };

  const { error: dbError } = await supabase
    .from("site_settings")
    .upsert({ key: settingKey, label: settingKey, value: merged });

  if (dbError) return { error: dbError.message };

  revalidatePath("/");
  revalidatePath("/admin/content");
  return {};
}
