import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductDetail } from "@/components/product/product-detail";
import type { ProductWithVariants } from "@/types/store";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerSupabaseClient();

  // ── DEBUG: split queries to isolate the failure ──────────────────────────

  // 1. Base product row only — no join, no is_active filter
  const { data: baseProduct, error: baseError } = await supabase
    .from("products")
    .select("id, slug, name_en, is_active")
    .eq("slug", slug)
    .single();

  // 2. All slugs in the table (first 10) — to catch slug mismatch
  const { data: allSlugs } = await supabase
    .from("products")
    .select("slug, is_active")
    .limit(10);

  // 3. Nested join — only if base row was found
  let variantsError: string | null = null;
  if (baseProduct) {
    const { error: ve } = await supabase
      .from("products")
      .select("*, variants:product_variants(*)")
      .eq("slug", slug)
      .single();
    variantsError = ve ? `${ve.code}: ${ve.message}` : null;
  }

  const debugInfo = {
    urlSlug: slug,
    baseRowFound: !!baseProduct,
    baseRowError: baseError ? `${baseError.code}: ${baseError.message}` : null,
    baseRowData: baseProduct,
    variantsJoinError: variantsError,
    allSlugsInDb: allSlugs?.map((r: any) => `${r.slug} (active=${r.is_active})`),
  };

  if (!baseProduct || variantsError) {
    return (
      <pre style={{ padding: 32, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    );
  }

  // ── End debug — restore original query for real render ────────────────────
  const { data: product, error } = await supabase
    .from("products")
    .select("*, variants:product_variants(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !product) return notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <ProductDetail product={product as unknown as ProductWithVariants} />
    </div>
  );
}
