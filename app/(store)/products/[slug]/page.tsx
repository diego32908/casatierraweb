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
