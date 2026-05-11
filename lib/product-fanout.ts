export interface FanOutVariantStub {
  id: string;
  color_name: string | null;
  color_hex: string | null;
  image_url: string | null;
  price_override_cents: number | null;
  is_default: boolean;
  size_label?: string | null;
}

export interface FanOutSourceProduct {
  id: string;
  slug: string;
  name_en: string;
  name_es?: string | null;
  base_price_cents: number;
  compare_at_price_cents: number | null;
  primary_image_url: string | null;
  created_at?: string;
  category?: string;
  variants?: FanOutVariantStub[];
}

export interface FannedProductCard {
  id: string;
  slug: string;
  name_en: string;
  name_es?: string | null;
  base_price_cents: number;
  compare_at_price_cents: number | null;
  primary_image_url: string | null;
  created_at?: string;
  category?: string;
  variantId?: string;
  variants: Array<{
    color_name: string | null;
    color_hex: string | null;
    size_label?: string | null;
  }>;
}

// For products with 2+ distinct named colors, emits one card per color.
// Each color card deep-links to /products/[slug]?variant=[id].
// Products with 0 or 1 named color pass through as a single card unchanged.
export function fanOutByColor(products: FanOutSourceProduct[]): FannedProductCard[] {
  const result: FannedProductCard[] = [];

  for (const product of products) {
    const variants = product.variants ?? [];

    const colorNames = [
      ...new Set(
        variants
          .filter((v) => v.color_name != null)
          .map((v) => v.color_name as string)
      ),
    ];

    if (colorNames.length < 2) {
      result.push({
        id: product.id,
        slug: product.slug,
        name_en: product.name_en,
        name_es: product.name_es,
        base_price_cents: product.base_price_cents,
        compare_at_price_cents: product.compare_at_price_cents,
        primary_image_url: product.primary_image_url,
        created_at: product.created_at,
        category: product.category,
        variants: variants.map((v) => ({
          color_name: v.color_name,
          color_hex: v.color_hex,
          size_label: v.size_label,
        })),
      });
      continue;
    }

    for (const colorName of colorNames) {
      const colorVariants = variants.filter((v) => v.color_name === colorName);

      const imageVariant = colorVariants.find((v) => v.image_url);
      const image = imageVariant?.image_url ?? product.primary_image_url;

      const defaultVariant =
        colorVariants.find((v) => v.is_default) ?? colorVariants[0];
      const price =
        defaultVariant?.price_override_cents ?? product.base_price_cents;

      result.push({
        id: product.id,
        slug: product.slug,
        name_en: product.name_en,
        name_es: product.name_es,
        base_price_cents: price,
        compare_at_price_cents: product.compare_at_price_cents,
        primary_image_url: image,
        created_at: product.created_at,
        category: product.category,
        variantId: defaultVariant?.id,
        variants: colorVariants.map((v) => ({
          color_name: v.color_name,
          color_hex: v.color_hex,
          size_label: v.size_label,
        })),
      });
    }
  }

  return result;
}
