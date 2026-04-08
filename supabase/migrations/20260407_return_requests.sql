-- Return / exchange requests submitted by customers via /returns
-- Admin reviews these in /admin/returns and updates status manually.
-- No automation, no payment, no label generation in phase 1.

CREATE TABLE IF NOT EXISTS public.return_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid        REFERENCES public.orders(id) ON DELETE SET NULL,
  order_ref        text        NOT NULL,                        -- first 8 chars of order UUID, uppercased
  email            text        NOT NULL,
  request_type     text        NOT NULL CHECK (request_type IN ('return', 'exchange')),
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  items_json       jsonb       NOT NULL DEFAULT '[]',           -- [{name, variant, quantity}]
  reason           text        NOT NULL,
  notes            text,
  replacement_size text,                                        -- exchange only
  label_option     text        NOT NULL CHECK (label_option IN ('prepaid', 'own_label')),
  fee_cents        integer,                                     -- 899 for return prepaid, 1599 for exchange prepaid, null for own
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Service-role access only — customers submit via server actions, not direct DB
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

-- No public access
CREATE POLICY "no public access to return_requests"
  ON public.return_requests
  FOR ALL
  TO public
  USING (false);
