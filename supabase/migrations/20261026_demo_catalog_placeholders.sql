-- Mamma Bee's Bakery demo catalog / placeholder controls 2026-10-26
-- Sample items are staff-only, never real products or real orders.
alter table public.site_settings
 add column if not exists placeholder_empty_shop boolean not null default true,
 add column if not exists placeholder_empty_gallery boolean not null default true,
 add column if not exists placeholder_missing_image boolean not null default true,
 add column if not exists placeholder_featured boolean not null default true,
 add column if not exists demo_store_enabled boolean not null default false;
update public.site_settings set
 brand_subtitle='Iowa Roots. Faith-Filled Heart. Baked with Love.'
 where id=1 and brand_subtitle in ('Homemade in Nixa, Missouri','');
create table if not exists public.demo_catalog_items(
 id uuid primary key default gen_random_uuid(),
 name text not null,
 category text not null check(category in ('Cookies','Cakes','Pies','Cheesecakes','Pastries')),
 description text not null default '',
 price_cents integer not null check(price_cents between 50 and 100000),
 unit text not null default 'each',
 enabled boolean not null default true,
 sort_order integer not null default 0,
 created_at timestamptz not null default now()
);
alter table public.demo_catalog_items enable row level security;
revoke all on public.demo_catalog_items from anon,authenticated;
grant select,insert,update,delete on public.demo_catalog_items to authenticated;
drop policy if exists "bakery management only demo inventory" on public.demo_catalog_items;
create policy "bakery management only demo inventory" on public.demo_catalog_items
 for all to authenticated
 using(exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role in ('owner','admin')))
 with check(exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role in ('owner','admin')));
drop policy if exists "active account only" on public.demo_catalog_items;
create policy "active account only" on public.demo_catalog_items as restrictive
 for all to authenticated using(private.bakery_account_active())
 with check(private.bakery_account_active());
create table if not exists public.demo_checkout_tests(
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null references auth.users(id),
 item_id uuid,
 item_name text not null,
 amount_cents integer not null check(amount_cents>=50),
 currency text not null default 'usd' check(currency='usd'),
 stripe_session_id text unique,
 status text not null default 'created' check(status in ('created','paid','expired','failed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.demo_checkout_tests enable row level security;
revoke all on public.demo_checkout_tests from anon,authenticated;
grant select on public.demo_checkout_tests to authenticated;
drop policy if exists "bakery managers view sandbox payments" on public.demo_checkout_tests;
create policy "bakery managers view sandbox payments" on public.demo_checkout_tests
 for select to authenticated
 using(exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role in ('owner','admin'))
 and private.bakery_account_active());
-- Deterministic, clearly non-real sample fixtures; approximate local bakery price points.
insert into public.demo_catalog_items(name,category,description,price_cents,unit,sort_order)
select v.name,v.category,v.description,v.price_cents,v.unit,v.sort_order from (values
 ('Chocolate Chip Cookies','Cookies','TEST ITEM — illustrative box of twelve cookies, not for customer purchase.',2400,'dozen',10),
 ('Cinnamon Rolls','Pastries','TEST ITEM — single frosted cinnamon roll; no real inventory is reserved.',400,'each',20),
 ('Apple Pie','Pies','TEST ITEM — example whole nine-inch pie; not a bakery offer.',2400,'each',30),
 ('Carrot Cake','Cakes','TEST ITEM — example six- to eight-inch cake; no real cake is available.',3500,'each',40),
 ('Classic Cheesecake','Cheesecakes','TEST ITEM — illustrative whole cheesecake; not available for sale.',3800,'each',50),
 ('Brownie Box','Cookies','TEST ITEM — box of six brownies; not actual bakery stock.',1800,'box',60)
 ) as v(name,category,description,price_cents,unit,sort_order)
 where not exists(select 1 from public.demo_catalog_items d where d.name=v.name);
