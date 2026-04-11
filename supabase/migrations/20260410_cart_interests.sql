-- Cart interest tracking: each row = one "add to cart" event per product+variant.
-- Used to surface demand signals in admin without requiring authentication.

create table if not exists public.cart_interests (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  variant_id    uuid references public.product_variants(id) on delete cascade,
  product_name  text,
  variant_label text,
  created_at    timestamptz not null default now()
);

create index if not exists cart_interests_product_id_idx on public.cart_interests(product_id);
create index if not exists cart_interests_created_at_idx on public.cart_interests(created_at desc);

-- No RLS — service role only; not user-accessible.
alter table public.cart_interests enable row level security;
-- Allow insert from server (service role bypasses RLS anyway, but this documents intent)
create policy "service_role_all" on public.cart_interests
  for all using (true);
