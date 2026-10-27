-- MBB-SEC-043: sitewide inactivity policy and optional catalogue photo carousel.
begin;
alter table public.customer_profiles add column if not exists idle_timeout_minutes integer not null default 5;
do $b$begin
 if not exists(select 1 from pg_constraint where conrelid='public.customer_profiles'::regclass and conname='customer_profiles_idle_minutes_check') then
  alter table public.customer_profiles add constraint customer_profiles_idle_minutes_check
   check(idle_timeout_minutes in(1,3,5,10,15,20,25,30,45,60));
 end if;
end$b$;
alter table public.site_settings
 add column if not exists home_carousel_bakery_items boolean not null default true,
 add column if not exists home_carousel_homestand_items boolean not null default true;
commit;
