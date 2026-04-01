-- 1. Customer-facing RLS so signed-in users can read their own orders.
--    The orders.email column is matched against the JWT email claim.
--    Without this, the account page always shows "No orders yet."

CREATE POLICY "customers read own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

CREATE POLICY "customers read own order_items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

-- 2. Tracking / fulfillment fields — ready for carrier integration.
--    Admin sets these when a shipment is dispatched; shown in account page.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url    TEXT,
  ADD COLUMN IF NOT EXISTS carrier         TEXT,
  ADD COLUMN IF NOT EXISTS shipped_at      TIMESTAMPTZ;
