-- Atomic stock decrement RPC
-- Prevents oversell race condition: two concurrent webhook events can no longer
-- both read stock=1 and both compute newStock=0 independently.
--
-- Uses SELECT FOR UPDATE to lock the row, then a single UPDATE.
-- Stock is clamped at 0 (never goes negative).
-- Returns new_stock and fulfilled so callers can detect oversell.
--
-- Run in Supabase SQL Editor before deploying the webhook that calls it.

CREATE OR REPLACE FUNCTION public.decrement_stock_safe(
  p_variant_id uuid,
  p_quantity    integer
)
RETURNS TABLE(new_stock integer, fulfilled boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_stock integer;
  v_new_stock integer;
BEGIN
  -- Lock the row for the duration of this transaction so no concurrent
  -- call can read the same stock value before we write the new one.
  SELECT stock
  INTO   v_old_stock
  FROM   public.product_variants
  WHERE  id = p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_variants row not found: %', p_variant_id;
  END IF;

  v_new_stock := GREATEST(0, v_old_stock - p_quantity);

  UPDATE public.product_variants
  SET    stock = v_new_stock
  WHERE  id    = p_variant_id;

  -- fulfilled = old stock was enough to cover the requested quantity
  RETURN QUERY SELECT v_new_stock, (v_old_stock >= p_quantity);
END;
$$;
