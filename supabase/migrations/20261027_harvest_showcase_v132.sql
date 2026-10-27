-- MBB-CATALOG-042 v1.32 — vegetables for the Owner's next-harvest photo library.
-- Adds catalog/showcase names only; no prices, published product records, or stock.
begin;
with incoming(name,slug,sort_order) as (
 values
 ('Broccoli','broccoli',30),
 ('Cauliflower','cauliflower',40),
 ('Jalapeños','jalapenos',50),
 ('Mini Green Peppers','mini-green-peppers',60),
 ('Salad Cucumbers','salad-cucumbers',70),
 ('Spineless Okra','spineless-okra',80),
 ('Tomatoes','tomatoes',90),
 ('Yellow Summer Squash','yellow-summer-squash',100),
 ('Zucchini','zucchini',110)
)
insert into public.catalog_varieties(category_id,subcategory_id,name,slug,sort_order,active)
select c.id,null,i.name,i.slug,i.sort_order,true
from incoming i cross join public.categories c where c.slug='vegetables' and c.department='homestand'
on conflict do nothing;

with incoming(name,slug,sort_order) as (
 values
 ('Broccoli','broccoli',30),
 ('Cauliflower','cauliflower',40),
 ('Jalapeños','jalapenos',50),
 ('Mini Green Peppers','mini-green-peppers',60),
 ('Salad Cucumbers','salad-cucumbers',70),
 ('Spineless Okra','spineless-okra',80),
 ('Tomatoes','tomatoes',90),
 ('Yellow Summer Squash','yellow-summer-squash',100),
 ('Zucchini','zucchini',110)
)
insert into public.store_showcase_items(department,category_id,subcategory_id,variety_id,name,slug,sort_order,active)
select 'homestand',c.id,null,v.id,i.name,i.slug,i.sort_order,true
from incoming i join public.categories c on c.slug='vegetables' and c.department='homestand'
join public.catalog_varieties v on v.category_id=c.id and v.subcategory_id is null and v.slug=i.slug
on conflict(slug) do nothing;
-- Preserve the previously seeded Green Beans entry and its existing photo/status.
update public.store_showcase_items s
set variety_id=v.id
from public.catalog_varieties v
join public.categories c on c.id=v.category_id and c.slug='vegetables'
where s.slug='green-beans' and s.department='homestand' and v.slug='green-beans'
 and s.variety_id is null;

comment on table public.store_showcase_items is
 'Owner-controlled homepage/store catalog showcases. They are not priced products; photos may describe planned future offerings.';
commit;