-- Fix: infinite recursion in admin_profiles RLS policy (error 42P17)
--
-- Root cause:
--   Every admin policy checks:
--     EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
--   The policy on admin_profiles itself uses the same check, causing infinite
--   recursion whenever any browser-client query touches a table with an admin policy.
--
-- Fix:
--   Create a SECURITY DEFINER function that reads admin_profiles bypassing RLS.
--   Replace all inline EXISTS subqueries with a call to this function.
--
-- Run this in the Supabase SQL editor.

-- ── 1. Create the helper ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()
  );
$$;

-- ── 2. Rebuild all admin policies to use is_admin() ──────────────────────────

-- products
DROP POLICY IF EXISTS "admins manage products" ON public.products;
CREATE POLICY "admins manage products"
ON public.products FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- product_variants
DROP POLICY IF EXISTS "admins manage variants" ON public.product_variants;
CREATE POLICY "admins manage variants"
ON public.product_variants FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- orders
DROP POLICY IF EXISTS "admins manage orders" ON public.orders;
CREATE POLICY "admins manage orders"
ON public.orders FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- order_items
DROP POLICY IF EXISTS "admins manage order_items" ON public.order_items;
CREATE POLICY "admins manage order_items"
ON public.order_items FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- subscribers
DROP POLICY IF EXISTS "admins read subscribers" ON public.subscribers;
CREATE POLICY "admins read subscribers"
ON public.subscribers FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- custom_requests
DROP POLICY IF EXISTS "admins manage custom requests" ON public.custom_requests;
CREATE POLICY "admins manage custom requests"
ON public.custom_requests FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- waitlist
DROP POLICY IF EXISTS "admins manage waitlist" ON public.waitlist;
CREATE POLICY "admins manage waitlist"
ON public.waitlist FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- site_settings
DROP POLICY IF EXISTS "admins manage site settings" ON public.site_settings;
CREATE POLICY "admins manage site settings"
ON public.site_settings FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- admin_profiles (the self-referencing policy that was the root cause)
DROP POLICY IF EXISTS "admins manage admin profiles" ON public.admin_profiles;
CREATE POLICY "admins manage admin profiles"
ON public.admin_profiles FOR ALL
USING (is_admin())
WITH CHECK (is_admin());
