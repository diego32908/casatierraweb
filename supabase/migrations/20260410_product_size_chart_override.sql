-- Per-product size chart override.
-- When set, this JSON replaces the static chart data for this product.
-- Supports both apparel and shoe chart shapes.
--
-- Apparel shape:
--   { "type": "apparel", "rows": [{ "label": "Chest", "valuesIn": { "S": 36, "M": 38 } }], "note": "..." }
--
-- Shoe shape:
--   { "type": "shoes", "entries": [{ "us": "8", "eu": "41", "mx": "26" }] }

alter table public.products
  add column if not exists size_chart_override jsonb default null;
