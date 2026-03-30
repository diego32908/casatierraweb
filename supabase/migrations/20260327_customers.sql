-- Customer profiles table
-- Created on first successful order; linked by email
-- Provides foundation for order history, birthday promos, first-order tracking

create table if not exists customers (
  id                     uuid primary key default gen_random_uuid(),
  email                  text not null,
  full_name              text,
  phone                  text, 
  birthday               date,
  first_order_at         timestamptz,
  first_order_completed  boolean not null default false,
  order_count            integer not null default 0,
  total_spent_cents      integer not null default 0,
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint customers_email_key unique (email)
);

create index if not exists customers_email_idx      on customers(email);
create index if not exists customers_created_at_idx on customers(created_at desc);

alter table customers enable row level security;

create policy "admin full access on customers"
  on customers for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create trigger customers_updated_at
  before update on customers
  for each row execute function update_updated_at();
