-- Orders and order items tables
-- Created by Stripe webhook on checkout.session.completed

create table if not exists orders (
  id                           uuid primary key default gen_random_uuid(),
  stripe_checkout_session_id   text unique,
  stripe_payment_intent_id     text,
  customer_name                text not null,
  email                        text not null,
  phone                        text,
  fulfillment                  text not null default 'shipping',  -- 'shipping' | 'pickup'
  shipping_address             jsonb,
  pickup_location              text,
  subtotal_cents               integer not null default 0,
  shipping_cents               integer not null default 0,
  discount_cents               integer not null default 0,
  total_cents                  integer not null default 0,
  currency                     text not null default 'usd',
  status                       text not null default 'PAID',
  -- status values: PAID | PREPARING | READY_FOR_PICKUP | SHIPPED | COMPLETED | CANCELLED
  notes                        text,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

create table if not exists order_items (
  id                           uuid primary key default gen_random_uuid(),
  order_id                     uuid not null references orders(id) on delete cascade,
  product_id                   uuid,
  variant_id                   uuid,
  product_name_snapshot        text not null,
  variant_label_snapshot       text,
  unit_price_cents             integer not null,
  quantity                     integer not null,
  line_total_cents             integer not null,
  image_url_snapshot           text,
  created_at                   timestamptz not null default now()
);

-- Indexes
create index if not exists orders_email_idx       on orders(email);
create index if not exists orders_status_idx      on orders(status);
create index if not exists orders_created_at_idx  on orders(created_at desc);
create index if not exists order_items_order_idx  on order_items(order_id);

-- RLS
alter table orders      enable row level security;
alter table order_items enable row level security;

-- Admin can read/update/delete orders
create policy "admin full access on orders"
  on orders for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "admin full access on order_items"
  on order_items for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();
