-- Contact / inquiry submissions from the /contact page
create table if not exists public.contact_submissions (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  inquiry_type text not null,
  message      text not null,
  status       text not null default 'new',   -- new | read | resolved
  created_at   timestamptz not null default now()
);

-- Anon users can insert (submit the form)
create policy "anon_insert_contact" on public.contact_submissions
  for insert to anon with check (true);

-- Only admins can read
create policy "admin_read_contact" on public.contact_submissions
  for select using (is_admin());

-- Only admins can update status
create policy "admin_update_contact" on public.contact_submissions
  for update using (is_admin()) with check (is_admin());

alter table public.contact_submissions enable row level security;
