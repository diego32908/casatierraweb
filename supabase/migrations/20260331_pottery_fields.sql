-- ── Products: pottery display fields + product-level shipping dimensions ─────
-- These are used for pottery/home_decor items where size_mode='none' (no variants).
-- weight_oz stores weight in ounces (16 oz = 1 lb). Admin enters lb or oz and we convert.
-- Nullable — no effect on existing apparel products.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS vessel_type        TEXT,
  ADD COLUMN IF NOT EXISTS size_label_display TEXT,
  ADD COLUMN IF NOT EXISTS dimensions_display TEXT,
  ADD COLUMN IF NOT EXISTS weight_oz          NUMERIC CHECK (weight_oz IS NULL OR weight_oz > 0),
  ADD COLUMN IF NOT EXISTS length_in          NUMERIC CHECK (length_in IS NULL OR length_in > 0),
  ADD COLUMN IF NOT EXISTS width_in           NUMERIC CHECK (width_in IS NULL OR width_in > 0),
  ADD COLUMN IF NOT EXISTS height_in          NUMERIC CHECK (height_in IS NULL OR height_in > 0);

-- ── Variants: per-variant shipping weight/dimensions ─────────────────────────
-- For apparel or pottery with multiple size variants, weight may differ per variant.
-- Falls back to product-level weight_oz if not set on the variant.

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS weight_oz  NUMERIC CHECK (weight_oz IS NULL OR weight_oz > 0),
  ADD COLUMN IF NOT EXISTS length_in  NUMERIC CHECK (length_in IS NULL OR length_in > 0),
  ADD COLUMN IF NOT EXISTS width_in   NUMERIC CHECK (width_in IS NULL OR width_in > 0),
  ADD COLUMN IF NOT EXISTS height_in  NUMERIC CHECK (height_in IS NULL OR height_in > 0);

COMMENT ON COLUMN public.products.weight_oz          IS 'Shipping weight in ounces (16 oz = 1 lb). Used for pottery/no-variant products.';
COMMENT ON COLUMN public.products.vessel_type        IS 'Pottery vessel type: mug, cup, plate, bowl, pot, vase, planter, decor';
COMMENT ON COLUMN public.products.size_label_display IS 'Human-readable size/vessel label shown on product page (e.g. "Large serving bowl")';
COMMENT ON COLUMN public.products.dimensions_display IS 'Human-readable dimensions shown on product page (e.g. "12 in diameter")';
COMMENT ON COLUMN public.product_variants.weight_oz  IS 'Per-variant shipping weight in ounces. Overrides product-level weight_oz when set.';
