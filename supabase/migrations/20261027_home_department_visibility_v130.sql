-- MBB-CATALOG-040 v1.30: Homepage-only section visibility for optional split store.
-- Defaults preserve both storefront sections when split mode is enabled.
begin;
alter table public.site_settings
 add column if not exists home_bakery_visible boolean not null default true;
alter table public.site_settings
 add column if not exists home_homestand_visible boolean not null default true;
comment on column public.site_settings.home_bakery_visible is
 'When split_store_enabled is true, display the Bakery product showcase on Home.';
comment on column public.site_settings.home_homestand_visible is
 'When split_store_enabled is true, display the Homestand product showcase on Home.';
commit;