-- Bakery taxonomy and provenance-aware image reference library (v1.7)
create table if not exists public.subcategories(
 id uuid primary key default gen_random_uuid(),
 category_id uuid not null references public.categories(id) on delete cascade,
 name text not null check(length(trim(name)) between 2 and 100),
 slug text not null check(length(trim(slug)) between 2 and 110),
 description text not null default '',
 photo_url text,
 sort_order integer not null default 100,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(category_id,slug)
);
create index if not exists subcategories_parent_idx on public.subcategories(category_id,active,sort_order);
alter table public.subcategories enable row level security;
grant select on public.subcategories to anon,authenticated;
grant insert,update,delete on public.subcategories to authenticated;
drop policy if exists "subcategories visible" on public.subcategories;
create policy "subcategories visible" on public.subcategories for select to anon,authenticated using(active);
drop policy if exists "managers edit subcategories" on public.subcategories;
create policy "managers edit subcategories" on public.subcategories for all to authenticated
 using(exists(select 1 from public.staff_roles r where r.user_id=(select auth.uid()) and r.role in ('owner','admin')))
 with check(exists(select 1 from public.staff_roles r where r.user_id=(select auth.uid()) and r.role in ('owner','admin')));
drop policy if exists "active account only" on public.subcategories;
create policy "active account only" on public.subcategories as restrictive for all to authenticated
 using(private.bakery_account_active()) with check(private.bakery_account_active());

alter table public.products add column if not exists subcategory_id uuid references public.subcategories(id) on delete set null;

create or replace function private.check_product_subcategory() returns trigger language plpgsql
 set search_path='' as $$
begin
 if new.subcategory_id is not null and not exists(
 select 1 from public.subcategories s where s.id=new.subcategory_id
 and s.category_id=new.category_id and s.active
 ) then raise exception 'Product subcategory must be active and belong to the selected category';end if;
 return new;
end $$;
drop trigger if exists product_subcategory_consistency on public.products;
create trigger product_subcategory_consistency before insert or update of category_id,subcategory_id
 on public.products for each row execute function private.check_product_subcategory();

create table if not exists public.photo_presets(
 id uuid primary key default gen_random_uuid(),
 name text not null,
 category_id uuid references public.categories(id) on delete set null,
 subcategory_id uuid references public.subcategories(id) on delete set null,
 image_url text not null,
 source_url text not null,
 license text not null,
 photo_type text not null check(photo_type in ('bakery_original','licensed_reference')),
 active boolean not null default true,
 sort_order integer not null default 100,
 created_at timestamptz not null default now()
);
alter table public.photo_presets enable row level security;
grant select on public.photo_presets to anon,authenticated;
grant insert,update,delete on public.photo_presets to authenticated;
drop policy if exists "photo presets public" on public.photo_presets;
create policy "photo presets public" on public.photo_presets for select to anon,authenticated using(active);
drop policy if exists "managers edit photo presets" on public.photo_presets;
create policy "managers edit photo presets" on public.photo_presets for all to authenticated
 using(exists(select 1 from public.staff_roles r where r.user_id=(select auth.uid()) and r.role in ('owner','admin')))
 with check(exists(select 1 from public.staff_roles r where r.user_id=(select auth.uid()) and r.role in ('owner','admin')));
drop policy if exists "active account only" on public.photo_presets;
create policy "active account only" on public.photo_presets as restrictive for all to authenticated
 using(private.bakery_account_active()) with check(private.bakery_account_active());

alter table public.products add column if not exists photo_preset_id uuid references public.photo_presets(id) on delete set null;
alter table public.categories add column if not exists photo_preset_id uuid references public.photo_presets(id) on delete set null;
alter table public.subcategories add column if not exists photo_preset_id uuid references public.photo_presets(id) on delete set null;

-- Initialize organizational taxonomy; empty categories and subcategories remain hidden from storefront.
insert into public.categories(name,slug,description,active,sort_order) select 'Cookies','cookies','Browse cookies made available by the bakery',true,10 where not exists(select 1 from public.categories where slug='cookies');
insert into public.categories(name,slug,description,active,sort_order) select 'Cakes','cakes','Browse cakes made available by the bakery',true,20 where not exists(select 1 from public.categories where slug='cakes');
insert into public.categories(name,slug,description,active,sort_order) select 'Pies','pies','Browse pies made available by the bakery',true,30 where not exists(select 1 from public.categories where slug='pies');
insert into public.categories(name,slug,description,active,sort_order) select 'Cheesecakes','cheesecakes','Browse cheesecakes made available by the bakery',true,40 where not exists(select 1 from public.categories where slug='cheesecakes');
insert into public.categories(name,slug,description,active,sort_order) select 'Pastries','pastries','Browse pastries made available by the bakery',true,50 where not exists(select 1 from public.categories where slug='pastries');
insert into public.categories(name,slug,description,active,sort_order) select 'Bars & Brownies','bars-brownies','Browse bars & brownies made available by the bakery',true,60 where not exists(select 1 from public.categories where slug='bars-brownies');
insert into public.categories(name,slug,description,active,sort_order) select 'Breads','breads','Browse breads made available by the bakery',true,70 where not exists(select 1 from public.categories where slug='breads');
with names(cat_slug,name,slug,sort_order) as (values
('cookies','Chocolate Chip','chocolate-chip',10),
('cookies','Sugar Cookies','sugar-cookies',20),
('cookies','Peanut Butter','peanut-butter',30),
('cookies','Oatmeal & Raisin','oatmeal-and-raisin',40),
('cookies','Snickerdoodles','snickerdoodles',50),
('cookies','Shortbread','shortbread',60),
('cookies','Chocolate Cookies','chocolate-cookies',70),
('cookies','Sandwich Cookies','sandwich-cookies',80),
('cookies','Stuffed Cookies','stuffed-cookies',90),
('cookies','Holiday Cookies','holiday-cookies',100),
('cakes','Layer Cakes','layer-cakes',10),
('cakes','Carrot Cakes','carrot-cakes',20),
('cakes','Chocolate Cakes','chocolate-cakes',30),
('cakes','Vanilla Cakes','vanilla-cakes',40),
('cakes','Red Velvet Cakes','red-velvet-cakes',50),
('cakes','Bundt Cakes','bundt-cakes',60),
('cakes','Pound Cakes','pound-cakes',70),
('cakes','Sheet Cakes','sheet-cakes',80),
('cakes','Birthday & Celebration Cakes','birthday-and-celebration-cakes',90),
('pies','Apple Pies','apple-pies',10),
('pies','Berry & Fruit Pies','berry-and-fruit-pies',20),
('pies','Peach Pies','peach-pies',30),
('pies','Cherry Pies','cherry-pies',40),
('pies','Cream Pies','cream-pies',50),
('pies','Chocolate Cream Pies','chocolate-cream-pies',60),
('pies','Coconut Cream Pies','coconut-cream-pies',70),
('pies','Lemon Meringue Pies','lemon-meringue-pies',80),
('pies','Nut & Pecan Pies','nut-and-pecan-pies',90),
('pies','Pumpkin & Seasonal Pies','pumpkin-and-seasonal-pies',100),
('cheesecakes','Classic Cheesecakes','classic-cheesecakes',10),
('cheesecakes','Fruit Cheesecakes','fruit-cheesecakes',20),
('cheesecakes','Caramel & Pecan Cheesecakes','caramel-and-pecan-cheesecakes',30),
('cheesecakes','Candy-Topped Cheesecakes','candy-topped-cheesecakes',40),
('cheesecakes','Cinnamon-Roll Cheesecakes','cinnamon-roll-cheesecakes',50),
('pastries','Cinnamon Rolls','cinnamon-rolls',10),
('pastries','Danish','danish',20),
('pastries','Donuts','donuts',30),
('pastries','Turnovers','turnovers',40),
('pastries','Sweet Rolls','sweet-rolls',50),
('pastries','Muffins','muffins',60),
('bars-brownies','Brownies','brownies',10),
('bars-brownies','Blondies','blondies',20),
('bars-brownies','Lemon Bars','lemon-bars',30),
('bars-brownies','Cookie Bars','cookie-bars',40),
('breads','Banana Bread','banana-bread',10),
('breads','Zucchini Bread','zucchini-bread',20),
('breads','Quick Breads','quick-breads',30),
('breads','Loaves','loaves',40)
)
insert into public.subcategories(category_id,name,slug,sort_order)
select c.id,n.name,n.slug,n.sort_order from names n join public.categories c on c.slug=n.cat_slug
where not exists(select 1 from public.subcategories x where x.category_id=c.id and x.slug=n.slug);
