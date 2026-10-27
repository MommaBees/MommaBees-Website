-- MBB-CATALOG-041 — customer showcase selections, separate from transactional inventory.
begin;
create table if not exists public.store_showcase_items(
 id uuid primary key default gen_random_uuid(),
 slug text unique not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 department text not null check(department in ('bakery','homestand')),
 category_id uuid not null references public.categories(id) on delete restrict,
 subcategory_id uuid references public.subcategories(id) on delete restrict,
 variety_id uuid references public.catalog_varieties(id) on delete set null,
 name text not null check(length(btrim(name))>1),
 photo_url text,
 active boolean not null default true,
 sort_order integer not null default 100,
 created_at timestamptz not null default now()
);
create index if not exists store_showcase_department_idx on public.store_showcase_items(department,active,sort_order);
alter table public.store_showcase_items enable row level security;
grant select on public.store_showcase_items to anon,authenticated;
grant insert,update,delete on public.store_showcase_items to authenticated;
create policy "public visible store showcase items" on public.store_showcase_items
 for select to anon,authenticated
 using(active and exists(select 1 from public.categories c where c.id=category_id and c.active and c.department=department));
create policy "owner admin manage store showcase items" on public.store_showcase_items
 for all to authenticated
 using(exists(select 1 from public.staff_roles r where r.user_id=(select auth.uid()) and r.role in ('owner','admin')))
 with check(exists(select 1 from public.staff_roles r where r.user_id=(select auth.uid()) and r.role in ('owner','admin')));
create or replace function private.validate_store_showcase_item()
returns trigger language plpgsql set search_path=''
as $fn$
declare expected text;
begin
 select c.department into expected from public.categories c where c.id=new.category_id;
 if expected is distinct from new.department then
  raise exception 'Store showcase department and category do not match';
 end if;
 if new.subcategory_id is not null and not exists(
  select 1 from public.subcategories s where s.id=new.subcategory_id and s.category_id=new.category_id
 ) then raise exception 'Showcase subcategory must belong to category';end if;
 if new.variety_id is not null and not exists(
  select 1 from public.catalog_varieties v where v.id=new.variety_id
   and v.category_id=new.category_id and v.subcategory_id is not distinct from new.subcategory_id
 ) then raise exception 'Showcase variety must belong to the selected category and subcategory';end if;
 return new;
end $fn$;
drop trigger if exists validate_store_showcase_item on public.store_showcase_items;
create trigger validate_store_showcase_item
 before insert or update on public.store_showcase_items
 for each row execute function private.validate_store_showcase_item();
with examples(department,category_slug,subcategory_slug,variety_slug,slug,name,sort_order) as (
 values
 ('bakery','pies','creme','banana','banana-creme-pie','Banana Creme Pie',10),
 ('bakery','breads',null,'cinnamon-swirl','cinnamon-swirl-bread','Cinnamon Swirl Bread',20),
 ('bakery','cookies','butter-cookies','dream-cookie-drommar','dream-cookie-drommar','Dream Cookie (drömmar)',30),
 ('bakery','cookies','holiday','ginger-bread','ginger-bread','Ginger Bread',40),
 ('homestand','vegetables',null,'green-beans','green-beans','Green Beans',10),
 ('homestand','fruits',null,'blackberries','blackberries','Blackberries',20)
)
insert into public.store_showcase_items(department,category_id,subcategory_id,variety_id,slug,name,sort_order,active)
select e.department,c.id,s.id,v.id,e.slug,e.name,e.sort_order,true
from examples e join public.categories c on c.slug=e.category_slug and c.department=e.department
left join public.subcategories s on s.category_id=c.id and s.slug=e.subcategory_slug
left join public.catalog_varieties v on v.category_id=c.id and v.slug=e.variety_slug
 and v.subcategory_id is not distinct from s.id
on conflict(slug) do nothing;
comment on table public.store_showcase_items is
 'Visual catalog showcases of Owner-named offerings; never implies an active product, price, stock, or payment entitlement.';
commit;