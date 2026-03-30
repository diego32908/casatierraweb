-- Add product status flags and accessory sub-type
-- Run this in Supabase SQL editor or via Supabase CLI

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_new       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_sale      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accessory_type text;

-- Index for sale page query
CREATE INDEX IF NOT EXISTS idx_products_is_sale ON products (is_sale) WHERE is_sale = true;

-- Index for new arrivals query
CREATE INDEX IF NOT EXISTS idx_products_is_new ON products (is_new) WHERE is_new = true;
