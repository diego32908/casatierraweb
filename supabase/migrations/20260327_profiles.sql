-- User profiles table
-- id = auth.uid() — one row per authenticated user
-- Linked to customers by email for order analytics
-- RLS: users read/update only their own row; admins read all

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  first_name  text,
  last_name   text,
  phone       text,
  birthday    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_email_idx on profiles(email);

alter table profiles enable row level security;

-- Users can read their own profile
create policy "user reads own profile"
  on profiles for select
  to authenticated
  using (id = auth.uid());

-- Users can insert their own profile (on sign-up)
create policy "user inserts own profile"
  on profiles for insert
  to authenticated
  with check (id = auth.uid());

-- Users can update their own profile
create policy "user updates own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admins can read all profiles
create policy "admin reads all profiles"
  on profiles for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- ── Extend orders RLS so users can read their own orders ─────────────────────
-- auth.jwt() ->> 'email' pulls the email directly from the user's JWT

create policy "user reads own orders"
  on orders for select
  to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

create policy "user reads own order items"
  on order_items for select
  to authenticated
  using (
    order_id in (
      select id from orders
      where lower(email) = lower(auth.jwt() ->> 'email')
    )
  );
