-- Add dress and skirt to the product_category enum.
-- These values were defined in types/store.ts and the admin product form
-- but were missing from the DB enum, causing the women page query
-- (.in("category", ["women","dress","skirt"])) to throw a cast error
-- and return null instead of matching the valid "women" category products.
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'dress';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'skirt';
