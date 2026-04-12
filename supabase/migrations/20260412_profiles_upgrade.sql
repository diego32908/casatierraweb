-- ═══════════════════════════════════════════════════════════════════════════
-- PROFILES TABLE — create-or-upgrade
--
-- Why this approach:
--   • CREATE TABLE IF NOT EXISTS handles a fresh database (table never existed)
--   • ALTER TABLE ADD COLUMN IF NOT EXISTS handles a database where the table
--     exists but is missing the newer columns (gender, default_shipping_address)
--   • All policy/trigger blocks guard against re-running with IF NOT EXISTS or
--     DROP IF EXISTS + recreate, so the whole file is safe to run more than once
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Table ──────────────────────────────────────────────────────────────────
-- id mirrors auth.users.id so there is always exactly one row per account.
-- Cascades on delete: removing the auth user also removes the profile.

CREATE TABLE IF NOT EXISTS public.profiles (
  id                       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                    text NOT NULL,
  first_name               text,
  last_name                text,
  phone                    text,
  birthday                 date,
  gender                   text CHECK (gender IN ('woman', 'man', 'non_binary', 'prefer_not_to_say')),
  default_shipping_address jsonb,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- If the table already existed without the newer columns, add them individually.
-- ADD COLUMN IF NOT EXISTS is idempotent — safe to run even when the column
-- was just created by the CREATE TABLE above.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text
    CHECK (gender IN ('woman', 'man', 'non_binary', 'prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS default_shipping_address jsonb;

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- ── 2. updated_at trigger ─────────────────────────────────────────────────────
-- update_updated_at() already exists (defined in 20260327_orders.sql).
-- We just attach it to the profiles table.

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 3. Row-level security ─────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
    AND policyname = 'user reads own profile'
  ) THEN
    CREATE POLICY "user reads own profile"
      ON public.profiles FOR SELECT TO authenticated
      USING (id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
    AND policyname = 'user inserts own profile'
  ) THEN
    CREATE POLICY "user inserts own profile"
      ON public.profiles FOR INSERT TO authenticated
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
    AND policyname = 'user updates own profile'
  ) THEN
    CREATE POLICY "user updates own profile"
      ON public.profiles FOR UPDATE TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
    AND policyname = 'admin reads all profiles'
  ) THEN
    CREATE POLICY "admin reads all profiles"
      ON public.profiles FOR ALL TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

-- ── 4. Auto-create profile on auth.users INSERT ───────────────────────────────
-- Fires immediately when auth.signUp() is called — before email confirmation.
-- Reads first_name / last_name from raw_user_meta_data (set in signUp options).
-- ON CONFLICT DO NOTHING means app-level upserts always win on subsequent calls.
-- SECURITY DEFINER lets it write to public.profiles from the auth schema context.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop and recreate so the trigger always points to the latest function version.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
