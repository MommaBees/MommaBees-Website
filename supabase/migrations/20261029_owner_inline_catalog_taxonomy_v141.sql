-- MBB-CATALOG-041: owner-editable product types and category classification.
create table if not exists public.catalog_product_types (
 code text primary key check(code ~ '^[a-z][a-z0-9-]{1,63}$'),
 name text not null unique check(length(trim(name)) between 2 and 80),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
insert into public.catalog_product_types(code,name,active) values
 ('food','Food',true),('handmade','Handmade',true),('regulated','Regulated',true)
on conflict(code) do nothing;
alter table public.catalog_product_types enable row level security;
revoke all on public.catalog_product_types from anon,authenticated;
grant select on public.catalog_product_types to anon,authenticated;
grant insert,update,delete on public.catalog_product_types to authenticated;
drop policy if exists "active product types public" on public.catalog_product_types;
create policy "active product types public" on public.catalog_product_types for select to anon,authenticated using(active);
drop policy if exists "owner admin manage product types" on public.catalog_product_types;
create policy "owner admin manage product types" on public.catalog_product_types for all to authenticated
 using(exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role in ('owner','admin')))
 with check(exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role in ('owner','admin')));
alter table public.categories add column if not exists product_type text;
update public.categories set product_type=case
 when slug='natural-homemade-products' then 'regulated'
 when slug in ('handmade','signs-decor') then 'handmade'
 when slug in ('cookies','cakes','pies','cheesecakes','pastries','bars-brownies','breads','cake-pops','candies','fruits','vegetables') then 'food'
 else null end where product_type is null;
alter table public.categories drop constraint if exists categories_product_type_fkey;
alter table public.categories add constraint categories_product_type_fkey
 foreign key(product_type) references public.catalog_product_types(code);
alter table public.products drop constraint if exists products_product_type_check;
alter table public.products add constraint products_product_type_fkey
 foreign key(product_type) references public.catalog_product_types(code);
-- Preserve the food allergen review and non-food publication prohibition.
create or replace function private.enforce_product_type_gate()
returns trigger language plpgsql set search_path=''
as $fn$
declare category_slug text; category_active boolean; category_type text;
begin
 if new.category_id is null then
  if new.published then raise exception 'Published products must have a category';end if;
  return new;
 end if;
 select c.slug,c.active,c.product_type into category_slug,category_active,category_type
 from public.categories c where c.id=new.category_id;
 if not found then raise exception 'Product category not found'; end if;
 if category_type is null then
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