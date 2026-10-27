-- MBB-ADMIN-033 v1.23 — Owner-controlled homepage carousel rotation interval.
-- Does not alter slide publication, scheduling, images, text, or checkout.
begin;
alter table public.site_settings add column if not exists
 home_carousel_interval_seconds numeric(4,1) not null default 6.5;
do $block$
begin
 if not exists (
  select 1 from pg_constraint where conrelid='public.site_settings'::regclass
  and conname='site_settings_home_carousel_interval_seconds_check'
 ) then
  alter table public.site_settings
   add constraint site_settings_home_carousel_interval_seconds_check
    check (home_carousel_interval_seconds between 3 and 60);
 end if;
end
$block$;
comment on column public.site_settings.home_carousel_interval_seconds is
 'Owner/Admin-managed seconds between publicly published homepage carousel slides (3–60).';
commit;
