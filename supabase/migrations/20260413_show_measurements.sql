-- Add show_measurements flag to products.
-- Defaults to TRUE so all existing products keep their current behavior.
-- When false, no size chart or specs block is rendered on the PDP.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS show_measurements boolean NOT NULL DEFAULT true;
