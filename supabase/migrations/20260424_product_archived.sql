-- Add is_archived column to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_archived ON public.products(is_archived);

-- Update RLS policy to also exclude archived products from public reads
DROP POLICY IF EXISTS "public can read active products" ON public.products;
CREATE POLICY "public can read active products"
ON public.products
FOR SELECT
USING (is_active = true AND is_archived = false);

-- Update variant read policy to match
DROP POLICY IF EXISTS "public can read variants for active products" ON public.product_variants;
CREATE POLICY "public can read variants for active products"
ON public.product_variants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_variants.product_id
      AND p.is_active = true
      AND p.is_archived = false
  )
);
