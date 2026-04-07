-- Add promo tracking columns to subscribers table.
-- promo_code: the code that was included in the welcome email (null if no promo was active)
-- promo_sent: true once the welcome email with promo code has been dispatched

ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS promo_sent boolean NOT NULL DEFAULT false;
