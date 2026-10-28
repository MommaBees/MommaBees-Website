-- MBB-UI-052 v1.40: configurable homepage product grid dimensions.
begin;
alter table public.site_settings
 add column if not exists home_both_columns smallint not null default 3 check (home_both_columns between 1 and 6),
 add column if not exists home_both_rows smallint not null default 3 check (home_both_rows between 1 and 6),
 add column if not exists home_single_columns smallint not null default 5 check (home_single_columns between 1 and 6),
 add column if not exists home_single_rows smallint not null default 2 check (home_single_rows between 1 and 6);
comment on column public.site_settings.home_both_columns is 'Desktop columns per department when both departments are visible.';
comment on column public.site_settings.home_both_rows is 'Desktop rows per department when both departments are visible.';
comment on column public.site_settings.home_single_columns is 'Desktop columns when only one department is visible.';
comment on column public.site_settings.home_single_rows is 'Desktop rows when only one department is visible.';
commit;
