-- Allow the anon (public) role to read product_variants.
-- Required so the browser Supabase client (anon key) can fetch variant
-- color data for wishlist and search panels.
--
-- Run this in the Supabase SQL editor or via Supabase CLI.

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can read product_variants"
  ON product_variants
  FOR SELECT
  TO anon
  USING (true);
