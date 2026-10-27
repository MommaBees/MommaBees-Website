-- MBB-UI-037 v1.27 — shared website layout size, unrelated to carousel size.
-- RLS hardening: a broad active-account FOR ALL policy previously allowed
-- ordinary active users to change sitewide settings despite Owner/Admin policy.
begin;
alter table public.site_settings
 add column if not exists website_size text not null default 'medium';
do $size$
begin
 if not exists(
  select 1 from pg_constraint where conrelid='public.site_settings'::regclass
  and conname='site_settings_website_size_check'
 ) then
  alter table public.site_settings
   add constraint site_settings_website_size_check
   check (website_size in ('extra-small','small','medium','large'));
 end if;
end
$size$;
drop policy if exists "active account only" on public.site_settings;
comment on column public.site_settings.website_size is
 'Owner/Admin-managed uniform website layout size, independent from home_carousel_size.';
commit;
