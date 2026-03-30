-- Add hidden search keywords field to products
-- Allows admin to tag products with terms that don't appear in the visible title.
-- Examples: linen, clay, barro, handmade, oaxaca, dress, pottery
--
-- Run this in the Supabase SQL editor before deploying the search keyword feature.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS search_keywords text;
