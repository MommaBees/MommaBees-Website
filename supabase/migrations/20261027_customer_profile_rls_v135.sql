-- MBB-SEC-046 v1.35 — close broad customer-profile RLS before exposing per-account idle choices.
-- Existing own-row and Owner/Admin policies remain unchanged.
begin;
alter table public.customer_profiles enable row level security;
drop policy if exists "active account only" on public.customer_profiles;
create policy "active account only" on public.customer_profiles
 as restrictive for all to authenticated
 using((select private.bakery_account_active()))
 with check((select private.bakery_account_active()));
comment on column public.customer_profiles.idle_timeout_minutes is
 'Each account holder selects 1/3/5/10/15/20/25/30/45/60 minutes of inactivity, default 5.';
commit;
