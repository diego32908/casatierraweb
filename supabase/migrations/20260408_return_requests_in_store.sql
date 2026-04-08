-- Add 'in_store' as a valid label_option for return_requests.
-- Drops the existing check constraint and recreates it with the new value.
-- Existing rows are unaffected.

ALTER TABLE public.return_requests
  DROP CONSTRAINT IF EXISTS return_requests_label_option_check;

ALTER TABLE public.return_requests
  ADD CONSTRAINT return_requests_label_option_check
  CHECK (label_option IN ('prepaid', 'own_label', 'in_store'));

-- Seed returns_config into site_settings (idempotent).
-- Admin sets the Stripe Payment Links and return address via /admin/content.
INSERT INTO public.site_settings (key, label, value)
VALUES (
  'returns_config',
  'Returns & Exchanges Config',
  '{
    "return_prepaid_link": null,
    "exchange_prepaid_link": null,
    "return_address": "1600 E Holt Ave, Pomona, CA 91767"
  }'
)
ON CONFLICT (key) DO NOTHING;
