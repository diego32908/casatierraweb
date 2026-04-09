-- Extend return_requests status to include payment tracking statuses.
-- Additive only — existing rows are unaffected.

ALTER TABLE public.return_requests
  DROP CONSTRAINT IF EXISTS return_requests_status_check;

ALTER TABLE public.return_requests
  ADD CONSTRAINT return_requests_status_check
  CHECK (status IN ('pending', 'approved', 'paid', 'label_sent', 'completed', 'rejected'));
