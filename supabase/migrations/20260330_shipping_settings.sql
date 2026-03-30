-- Seed the shipping settings row in site_settings.
-- flat_rate_cents:      charged when order does not qualify for free shipping.
-- free_threshold_cents: cart subtotal required to unlock free shipping.
-- Existing rows are left untouched (ON CONFLICT DO NOTHING).

INSERT INTO public.site_settings (key, label, value)
VALUES (
  'shipping',
  'Shipping Settings',
  '{"flat_rate_cents": 899, "free_threshold_cents": 15000}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
