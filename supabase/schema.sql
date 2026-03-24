-- Enable extension
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type product_category as enum (
    'men',
    'women',
    'kids',
    'pottery',
    'accessories',
    'home_decor',
    'shoes'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type size_mode as enum (
    'none',
    'alpha',
    'numeric',
    'kids',
    'shoes_us',
    'custom'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type fulfillment_type as enum (
    'shipping',
    'pickup'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type order_status as enum (
    'PAID',
    'READY_FOR_PICKUP',
    'SHIPPED',
    'COMPLETED',
    'CANCELLED'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type custom_request_status as enum (
    'new',
    'reviewing',
    'contacted',
    'closed'
  );
exception
  when duplicate_object then null;
end $$;

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  sku text unique,
  name_en text not null,
  name_es text not null,
  description_en text,
  description_es text,
  category product_category not null,
  gender_tag text,
  size_mode size_mode not null default 'none',
  base_price_cents integer not null check (base_price_cents >= 0),
  compare_at_price_cents integer check (compare_at_price_cents is null or compare_at_price_cents >= base_price_cents),
  featured boolean not null default false,
  is_active boolean not null default true,
  material text,
  care_notes text,
  primary_image_url text,
  image_urls text[] not null default '{}',
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  -- Phase 2: optional product-level fit note (e.g. "Runs small. We recommend sizing up.")
  fit_note text,
  -- Phase 3: audience signals who the product is for — drives size label copy
  -- Run: ALTER TABLE public.products ADD COLUMN IF NOT EXISTS audience TEXT CHECK (audience IN ('mens','womens','kids','unisex')) NOT NULL DEFAULT 'unisex';
  audience text not null default 'unisex' check (audience in ('mens', 'womens', 'kids', 'unisex')),
  -- Phase 3: garment cut style — null for non-apparel
  -- Run: ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fit_style TEXT CHECK (fit_style IN ('fitted','relaxed','oversized'));
  fit_style text check (fit_style in ('fitted', 'relaxed', 'oversized')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Phase 3: one_size added to size_mode enum
-- Run: ALTER TYPE size_mode ADD VALUE IF NOT EXISTS 'one_size';

create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_featured on public.products(featured);
create index if not exists idx_products_active on public.products(is_active);

-- Product Variants
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_sku text unique,
  color_name text,
  color_hex text,
  size_label text not null,
  size_sort integer not null default 0,
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  price_override_cents integer check (price_override_cents is null or price_override_cents >= 0),
  is_default boolean not null default false,

  -- optional footwear conversions
  us_size text,
  eu_size text,
  uk_size text,
  mx_size text,
  jp_size text,

  -- optional apparel measurements (stored as JSON for flexibility)
  measurements_cm jsonb,
  measurements_in jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(product_id, size_label, color_name)
);

create index if not exists idx_variants_product_id on public.product_variants(product_id);
create index if not exists idx_variants_stock on public.product_variants(stock);

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  customer_name text not null,
  email text not null,
  phone text,
  fulfillment fulfillment_type not null,
  shipping_address jsonb,
  pickup_location text,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'usd',
  status order_status not null default 'PAID',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);

-- Order Items
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid references public.product_variants(id),
  product_name_snapshot text not null,
  variant_label_snapshot text,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  image_url_snapshot text,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);

-- Subscribers / popup leads
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  phone text,
  source text not null default 'popup',
  discount_code text,
  created_at timestamptz not null default now()
);

-- Custom Requests
create table if not exists public.custom_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  email text not null,
  phone text,
  description text not null,
  reference_image_url text,
  status custom_request_status not null default 'new',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional waitlist table because PDP logic uses "Get Notified"
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  unique(product_id, variant_id, email)
);

-- Site settings key-value store
-- Each row is one editable content block. value is JSONB for flexibility.
-- Phase 3: Run the following to create this table:
-- CREATE TABLE IF NOT EXISTS public.site_settings (
--   key TEXT PRIMARY KEY,
--   label TEXT NOT NULL,
--   value JSONB NOT NULL DEFAULT '{}',
--   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );
create table if not exists public.site_settings (
  key text primary key,
  label text not null,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Admin profile table
create table if not exists public.admin_profiles (
  id uuid primary key,
  email text not null unique,
  full_name text,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_variants_updated_at on public.product_variants;
create trigger trg_variants_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_custom_requests_updated_at on public.custom_requests;
create trigger trg_custom_requests_updated_at
before update on public.custom_requests
for each row execute function public.set_updated_at();

drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

-- RLS
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.subscribers enable row level security;
alter table public.custom_requests enable row level security;
alter table public.waitlist enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.site_settings enable row level security;

-- Public read for site settings (homepage needs unauthenticated access)
drop policy if exists "public can read site settings" on public.site_settings;
create policy "public can read site settings"
on public.site_settings
for select
using (true);

-- Admin write for site settings
drop policy if exists "admins manage site settings" on public.site_settings;
create policy "admins manage site settings"
on public.site_settings
for all
using (exists (select 1 from public.admin_profiles a where a.id = auth.uid()))
with check (exists (select 1 from public.admin_profiles a where a.id = auth.uid()));

-- Seed initial content blocks (idempotent)
insert into public.site_settings (key, label, value) values
  ('hero', 'Homepage Hero', '{"image_url": null, "heading": null, "subheading": null, "cta_label": "Shop Now", "cta_url": "/shop"}'),
  ('editorial_break', 'Editorial Break Image', '{"image_url": null}'),
  ('popup', 'Popup / Signup Overlay', '{"image_url": null, "enabled": false}')
on conflict (key) do nothing;

-- Public read for active products + variants
drop policy if exists "public can read active products" on public.products;
create policy "public can read active products"
on public.products
for select
using (is_active = true);

drop policy if exists "public can read variants for active products" on public.product_variants;
create policy "public can read variants for active products"
on public.product_variants
for select
using (
  exists (
    select 1
    from public.products p
    where p.id = product_variants.product_id
      and p.is_active = true
  )
);

-- Public insert for subscribers/custom requests/waitlist
drop policy if exists "public can insert subscribers" on public.subscribers;
create policy "public can insert subscribers"
on public.subscribers
for insert
with check (true);

drop policy if exists "public can insert custom requests" on public.custom_requests;
create policy "public can insert custom requests"
on public.custom_requests
for insert
with check (true);

drop policy if exists "public can insert waitlist" on public.waitlist;
create policy "public can insert waitlist"
on public.waitlist
for insert
with check (true);

-- Admin full access via auth.uid() match
drop policy if exists "admins manage products" on public.products;
create policy "admins manage products"
on public.products
for all
using (exists (select 1 from public.admin_profiles a where a.id = auth.uid()))
with check (exists (select 1 from public.admin_profiles a where a.id = auth.uid()));

drop policy if exists "admins manage variants" on public.product_variants;
create policy "admins manage variants"
on public.product_variants
for all
using (exists (select 1 from public.admin_profiles a where a.id = auth.uid()))
with check (exists (select 1 from public.admin_profiles a where a.id = auth.uid()));

drop policy if exists "admins manage orders" on public.orders;
create policy "admins manage orders"
on public.orders
for all
using (exists (select 1 from public.admin_profiles a where a.id = auth.uid()))
with check (exists (select 1 from public.admin_profiles a where a.id = auth.uid()));

drop policy if exists "admins manage order_items" on public.order_items;
create policy "admins manage order_items"
on public.order_items
for all
using (exists (select 1 from public.admin_profiles a where a.id = auth.uid()))
with check (exists (select 1 from public.admin_profiles a where a.id = auth.uid()));

drop policy if exists "admins read subscribers" on public.subscribers;
create policy "admins read subscribers"
on public.subscribers
for all
using (exists (select 1 from public.admin_profiles a where a.id = auth.uid()))
with check (exists (select 1 from public.admin_profiles a where a.id = auth.uid()));

drop policy if exists "admins manage custom requests" on public.custom_requests;
create policy "admins manage custom requests"
on public.custom_requests
for all
using (exists (select 1 from public.admin_profiles a where a.id = auth.uid()))
with check (exists (select 1 from public.admin_profiles a where a.id = auth.uid()));

drop policy if exists "admins manage waitlist" on public.waitlist;
create policy "admins manage waitlist"
on public.waitlist
for all
using (exists (select 1 from public.admin_profiles a where a.id = auth.uid()))
with check (exists (select 1 from public.admin_profiles a where a.id = auth.uid()));

drop policy if exists "admins manage admin profiles" on public.admin_profiles;
create policy "admins manage admin profiles"
on public.admin_profiles
for all
using (exists (select 1 from public.admin_profiles a where a.id = auth.uid()))
with check (exists (select 1 from public.admin_profiles a where a.id = auth.uid()));
