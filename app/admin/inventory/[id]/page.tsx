import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/product-form";
import { VariantManager } from "@/components/admin/variant-manager";
import { ImageManager } from "@/components/admin/image-manager";
import { CustomSizeChartEditor } from "@/components/admin/custom-size-chart-editor";
import type { ProductWithVariants } from "@/types/store";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data } = await supabase
    .from("products")
    .select("*, variants:product_variants(*)")
    .eq("id", id)
    .single();

  if (!data) notFound();

  const product = data as unknown as ProductWithVariants;
  const hasSizing = product.size_mode !== "none";

  return (
    <section className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Edit Product</h1>
        <p className="mt-2 text-sm text-stone-500">{product.name_en}</p>
      </header>

      <ProductForm product={product} />

      <ImageManager
        productId={product.id}
        primaryImageUrl={product.primary_image_url}
        galleryUrls={product.image_urls ?? []}
      />

      {hasSizing ? (
        <VariantManager
          productId={product.id}
          variants={product.variants}
          sizeMode={product.size_mode}
          audience={product.audience}
        />
      ) : (
        <div className="panel p-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Variants &amp; Color
          </h2>
          <p className="mt-3 text-sm text-stone-500">
            This product uses size mode <span className="font-medium text-stone-700">None</span> — variants are disabled.
            To assign colors or track stock, change the size mode to{" "}
            <span className="font-medium text-stone-700">One size</span> or another mode in the form above.
          </p>
        </div>
      )}

      {hasSizing && (
        <CustomSizeChartEditor
          productId={product.id}
          sizeMode={product.size_mode}
          category={product.category}
          currentOverride={product.size_chart_override ?? null}
        />
      )}
    </section>
  );
}
