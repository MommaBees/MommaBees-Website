-- MBB-CATALOG-039 v1.29 — MommaBees-only Stripe TEST catalog synchronization.
-- Source of truth: public.products; does not authorize LIVE product/payment activation.
begin;
create table if not exists public.product_stripe_test_sync (
  product_id uuid primary key references public.products(id) on delete cascade,
  stripe_product_id text unique,
  stripe_price_id text,
  synced_amount_cents integer,
  synced_fingerprint text,
  status text not null default 'pending'
    check(status in ('pending','synced','error')),
  error_message text,
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz,
  constraint stripe_id_format check(stripe_product_id is null or stripe_product_id ~ '^prod_[A-Za-z0-9]+$'),
  constraint stripe_price_format check(stripe_price_id is null or stripe_price_id ~ '^price_[A-Za-z0-9]+$'),
  constraint synced_amount_nonnegative check(synced_amount_cents is null or synced_amount_cents>=0)
);
alter table public.product_stripe_test_sync enable row level security;
revoke all on public.product_stripe_test_sync from public,anon,authenticated;
-- Backend service-role key manages this table; never expose writes to the browser.
grant select,insert,update,delete on public.product_stripe_test_sync to service_role;
comment on table public.product_stripe_test_sync is
 'Private MommaBees TEST Stripe catalog mapping; LIVE sale eligibility and payment handling are separate.';
commit;