-- MommaBee v1.60 — Owner Stripe runtime mode; LIVE stays disabled until release gates pass.
-- This is an application runtime selection, not a Cloudflare secret or override of emergency kill switches.
alter table public.site_settings
  add column if not exists stripe_payment_mode text not null default 'test';
alter table public.site_settings
  drop constraint if exists mommabees_stripe_payment_mode_check;
alter table public.site_settings
  add constraint mommabees_stripe_payment_mode_check check (stripe_payment_mode in ('test','live'));
update public.site_settings set stripe_payment_mode='test', checkout_enabled=false
where id=1 and (stripe_payment_mode is distinct from 'test' or checkout_enabled is distinct from false);
comment on column public.site_settings.stripe_payment_mode is
  'Owner-managed effective storefront payment mode; TEST default. LIVE is subordinate to Cloudflare LIVE_PAYMENT_ALLOWED and tax release controls, verified Stripe account and inventory gates.';
