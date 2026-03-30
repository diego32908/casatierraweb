-- Newsletter / email subscribers table
-- Used by: footer "Stay Connected" form and first-purchase popup

create table if not exists subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  source     text not null default 'footer',
  status     text not null default 'active',
  created_at timestamptz not null default now(),
  constraint subscribers_email_key unique (email)
);

-- RLS
alter table subscribers enable row level security;

-- Anyone can subscribe (anon insert)
create policy "anon can insert subscribers"
  on subscribers for insert
  to anon, authenticated
  with check (true);

-- Only admins can read / update / delete
create policy "admin can read subscribers"
  on subscribers for select
  to authenticated
  using (
    exists (
      select 1 from admin_profiles where user_id = auth.uid()
    )
  );

create policy "admin can update subscribers"
  on subscribers for update
  to authenticated
  using (
    exists (
      select 1 from admin_profiles where user_id = auth.uid()
    )
  );

create policy "admin can delete subscribers"
  on subscribers for delete
  to authenticated
  using (
    exists (
      select 1 from admin_profiles where user_id = auth.uid()
    )
  );
