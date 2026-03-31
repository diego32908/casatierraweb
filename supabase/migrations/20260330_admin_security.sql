-- ── Admin Sessions ────────────────────────────────────────────────────────────
-- One row per admin login. Only one row per user may have is_active = true at
-- any time (enforced application-side on login). Session expires after 2 hours
-- hard-cap, or after 15 minutes of inactivity.

CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address     TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS admin_sessions_user_id_active_idx
  ON public.admin_sessions (user_id, is_active);

-- ── Security Events ───────────────────────────────────────────────────────────
-- Immutable audit log. Rows are only inserted, never updated or deleted.

CREATE TABLE IF NOT EXISTS public.security_events (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  TEXT         NOT NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  metadata    JSONB        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS security_events_user_id_idx
  ON public.security_events (user_id);
CREATE INDEX IF NOT EXISTS security_events_event_type_idx
  ON public.security_events (event_type);
CREATE INDEX IF NOT EXISTS security_events_created_at_idx
  ON public.security_events (created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- Both tables are service-role only. No anon or authenticated access.
-- All reads/writes in the application go through the service role client.

ALTER TABLE public.admin_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Deny everything for anon and authenticated roles.
-- The app uses the service role key, which bypasses RLS entirely.
CREATE POLICY "deny all: admin_sessions"  ON public.admin_sessions  USING (FALSE);
CREATE POLICY "deny all: security_events" ON public.security_events USING (FALSE);
