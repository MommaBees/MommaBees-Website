-- MBB-UI-035 v1.25: Owner-selectable shared homepage carousel size.
-- Does not change slides, images, timing, order, product inventory or payments.
begin;
alter table public.site_settings
 add column if not exists home_carousel_size text not null default 'medium';
do $check$
begin
 if not exists (
  select 1 from pg_constraint
  where conrelid='public.site_settings'::regclass
    and conname='site_settings_home_carousel_size_check'
 ) then
  alter table public.site_settings
   add constraint site_settings_home_carousel_size_check
   check (home_carousel_size in ('extra-small','small','medium','large'));
 end if;
end
$check$;
comment on column public.site_settings.home_carousel_size is
 'Owner-selected uniform homepage carousel size: extra-small, small, medium or large.';
commit;
