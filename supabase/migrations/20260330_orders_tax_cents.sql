-- Add tax_cents column to orders.
-- Populated from session.total_details.amount_tax in the Stripe webhook.
-- Existing rows default to 0 (pre-tax-feature orders had no automatic tax).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tax_cents integer NOT NULL DEFAULT 0;
