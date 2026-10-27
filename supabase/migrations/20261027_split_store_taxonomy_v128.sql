-- MBB-CATALOG-038 v1.28: optional department storefront and searchable category/variety paths.
-- Taxonomy seed entries are NOT products and have no inventory or prices.
begin;
alter table public.site_settings add column if not exists split_store_enabled boolean not null default false;
alter table public.categories add column if not exists department text not null default 'bakery';
alter table public.products add column if not exists department text not null default 'bakery';
alter table public.products add column if not exists variety_id uuid;
do $c$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.categories'::regclass and conname='categories_department_check') then
  alter table public.categories add constraint categories_department_check check(department in ('bakery','homestand'));
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.products'::regclass and conname='products_department_check') then
  alter table public.products add constraint products_department_check check(department in ('bakery','homestand'));
 end if;
end $c$;
update public.categories set department='homestand' where slug in ('handmade','signs-decor','natural-homemade-products');
insert into public.categories(name,slug,description,sort_order,active,department)
values ('Vegetables','vegetables','',140,true,'homestand'),
       ('Fruits','fruits','',150,true,'homestand')
on conflict(slug) do update set department='homestand';
-- Provide requested paths while preserving all existing subcategories.
with additions(category_slug,name,slug,sort_order) as (
 values ('pies','Creme','creme',115),('cookies','Butter Cookies','butter-cookies',120),
        ('cookies','Holiday','holiday',130)
)
insert into public.subcategories(category_id,name,slug,sort_order,active)
select c.id,a.name,a.slug,a.sort_order,true
from additions a join public.categories c on c.slug=a.category_slug
on conflict(category_id,slug) do nothing;
create table if not exists public.catalog_varieties(
 id uuid primary key default gen_random_uuid(),
 category_id uuid not null references public.categories(id) on delete restrict,
 subcategory_id uuid references public.subcategories(id) on delete restrict,
 name text not null,
 slug text not null,
 active boolean not null default true,
 sort_order integer not null default 100,
 created_at timestamptz not null default now(),
 constraint catalog_varieties_name_required check(length(trim(name))>=2),
 constraint catalog_varieties_slug_required check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create unique index if not exists catalog_variety_path_unique on public.catalog_varieties
 (category_id,coalesce(subcategory_id,'00000000-0000-0000-0000-000000000000'::uuid),slug);
alter table public.products add constraint products_variety_id_fkey
 foreign key (variety_id) references public.catalog_varieties(id) on delete set null;
create index if not exists idx_products_department on public.products(department);
create index if not exists idx_categories_department on public.categories(department);
alter table public.catalog_varieties enable row level security;
revoke all on public.catalog_varieties from public,anon,authenticated;
grant select on public.catalog_varieties to anon,authenticated;
grant insert,update,delete on public.catalog_varieties to authenticated;
create policy "active varieties public" on public.catalog_varieties for select to anon,authenticated
 using(active and exists(select 1 from public.categories c where c.id=category_id and c.active));
create policy "staff manage varieties" on public.catalog_varieties for all to authenticated
 using(exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role in ('owner','admin')))
 with check(exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role in ('owner','admin')));
with seeds(category_slug,sub_slug,name,slug,sort_order) as (
 values
 ('pies','creme','Banana','banana',10),
 ('breads',null,'Cinnamon Swirl','cinnamon-swirl',10),
 ('cookies','butter-cookies','Dream Cookie (drömmar)','dream-cookie-drommar',10),
 ('cookies','holiday','Ginger Bread','ginger-bread',10),
 ('vegetables',null,'Green Beans','green-beans',10),
 ('fruits',null,'Blackberries','blackberries',10)
)
insert into public.catalog_varieties(category_id,subcategory_id,name,slug,sort_order)
select c.id,s.id,t.name,t.slug,t.sort_order
from seeds t join public.categories c on c.slug=t.category_slug
left join public.subcategories s on s.category_id=c.id and s.slug=t.sub_slug
on conflict do nothing;
create or replace function private.validate_catalog_department()
returns trigger language plpgsql set search_path=''
as $fn$
declare actual_department text; path_category uuid; path_subcategory uuid; path_active boolean;
begin
 select c.department into actual_department from public.categories c where c.id=new.category_id;
 if actual_department is null then raise exception 'Select an existing category';end if;
 if new.department<>actual_department then raise exception 'Product department must match category department';end if;
 if new.variety_id is not null then
  select v.category_id,v.subcategory_id,v.active into path_category,path_subcategory,path_active
  from public.catalog_varieties v where v.id=new.variety_id;
  if not found or path_category<>new.category_id or path_subcategory is distinct from new.subcategory_id then
   raise exception 'Selected variety must belong to the chosen category and subcategory';
  end if;
  if new.published and not path_active then raise exception 'Inactive varieties cannot be published';end if;
 end if;
 return new;
end
$fn$;
drop trigger if exists validate_catalog_department on public.products;
create trigger validate_catalog_department before insert or update on public.products
 for each row execute function private.validate_catalog_department();
create or replace function private.validate_catalog_variety()
returns trigger language plpgsql set search_path=''
as $fn$
begin
 if new.subcategory_id is not null and not exists(
   select 1 from public.subcategories s where s.id=new.subcategory_id and s.category_id=new.category_id
 ) then raise exception 'Variety must belong to the selected category/subcategory path'; end if;
 return new;
end
$fn$;
drop trigger if exists validate_catalog_variety on public.catalog_varieties;
create trigger validate_catalog_variety before insert or update on public.catalog_varieties
 for each row execute function private.validate_catalog_variety();

-- Continue treating fresh produce as food; preserve the existing allergen and
-- non-food publication gate rather than replacing it with department routing.
create or replace function private.enforce_product_type_gate()
returns trigger language plpgsql set search_path=''
as $fn$
declare category_slug text; category_active boolean; category_type text;
begin
 if new.category_id is null then
  if new.published then raise exception 'Published products must have a category';end if;
  return new;
 end if;
 select c.slug,c.active into category_slug,category_active
 from public.categories c where c.id=new.category_id;
 if not found then raise exception 'Product category not found'; end if;
 if category_slug='natural-homemade-products' then category_type:='regulated';
 elsif category_slug in ('handmade','signs-decor') then category_type:='handmade';
 elsif category_slug in ('cookies','cakes','pies','cheesecakes','pastries',
                        'bars-brownies','breads','cake-pops','candies','fruits','vegetables') then category_type:='food';
 elsif category_slug='seasonal' then
  if new.product_type not in ('food','handmade') then
   raise exception 'Seasonal category requires food or handmade classification';
  end if;
  category_type:=new.product_type;
 else raise exception 'Category needs a product-type classification before products can be saved';
 end if;
 if new.product_type<>category_type then raise exception 'Product type must match its selected category'; end if;
 if new.published then
  if new.subcategory_id is not null and not exists(
   select 1 from public.subcategories s where s.id=new.subcategory_id
    and s.category_id=new.category_id and s.active
  ) then raise exception 'Published products require an active matching subcategory';end if;
  if new.product_type<>'food' then
   raise exception 'Non-food products are held from publication pending release review';
  end if;
  if not category_active then raise exception 'Products cannot be published into inactive categories';end if;
 end if;
 return new;
end
$fn$;
-- Category movement is prohibited when it would orphan a product's department.
create or replace function private.prevent_category_department_drift()
returns trigger language plpgsql set search_path=''
as $fn$
begin
 if new.department is distinct from old.department and exists(
  select 1 from public.products p where p.category_id=new.id and p.department<>new.department
 ) then raise exception 'Reclassify existing products before moving category departments';end if;
 return new;
end
$fn$;
drop trigger if exists prevent_category_department_drift on public.categories;
create trigger prevent_category_department_drift before update of department on public.categories
 for each row execute function private.prevent_category_department_drift();
commit;