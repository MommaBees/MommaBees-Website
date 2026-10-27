-- MBB-CATALOG-048 v1.36: Replace the low-resolution sprite with 19 unique owner-supplied WebP photographs.
-- Showcase pages are browsable; priced/published Supabase products and Stripe are untouched.
begin;
with new_cookie_varieties(name,slug,sort_order) as (
 values ('Chocolate Chip Cookies','chocolate-chip-cookies',150),
        ('Meringue Cookies','meringue-cookies',160),
        ('Old-Fashioned Oatmeal Cookies','oatmeal-old-fashioned-cookies',170),
        ('Pecan Dreams','pecan-dreams',180)
)
insert into public.catalog_varieties(category_id,subcategory_id,name,slug,sort_order,active)
select c.id,null,v.name,v.slug,v.sort_order,true
from new_cookie_varieties v join public.categories c on c.slug='cookies' and c.department='bakery'
on conflict do nothing;

with new_cookie_showcase(name,slug,sort_order) as (
 values ('Chocolate Chip Cookies','chocolate-chip-cookies',50),
        ('Meringue Cookies','meringue-cookies',60),
        ('Old-Fashioned Oatmeal Cookies','oatmeal-old-fashioned-cookies',70),
        ('Pecan Dreams','pecan-dreams',80)
)
insert into public.store_showcase_items(department,category_id,subcategory_id,variety_id,name,slug,sort_order,active)
select 'bakery',c.id,null,v.id,i.name,i.slug,i.sort_order,true
from new_cookie_showcase i
join public.categories c on c.slug='cookies' and c.department='bakery'
join public.catalog_varieties v on v.category_id=c.id and v.slug=i.slug and v.subcategory_id is null
on conflict(slug) do nothing;

with provided(slug,display_name,department) as (
 values
  ('banana-creme-pie','Banana Cream Pie','bakery'),
  ('cinnamon-swirl-bread','Cinnamon Swirl Bread','bakery'),
  ('dream-cookie-drommar','Dream Cookies (drömmar)','bakery'),
  ('ginger-bread','Gingerbread Cookies','bakery'),
  ('chocolate-chip-cookies','Chocolate Chip Cookies','bakery'),
  ('meringue-cookies','Meringue Cookies','bakery'),
  ('oatmeal-old-fashioned-cookies','Old-Fashioned Oatmeal Cookies','bakery'),
  ('pecan-dreams','Pecan Dreams','bakery'),
  ('blackberries','Blackberries','homestand'),
  ('broccoli','Broccoli','homestand'),
  ('cauliflower','Cauliflower','homestand'),
  ('green-beans','Green Beans','homestand'),
  ('jalapenos','Jalapeños','homestand'),
  ('mini-green-peppers','Mini Green Peppers','homestand'),
  ('salad-cucumbers','Salad Cucumbers','homestand'),
  ('spineless-okra','Spineless Okra','homestand'),
  ('tomatoes','Tomatoes','homestand'),
  ('yellow-summer-squash','Yellow Summer Squash','homestand'),
  ('zucchini','Zucchini','homestand')
)
update public.store_showcase_items s
set photo_url='https://mommabees-website.pages.dev/assets/showcase/'||p.slug||'.webp',
 name=p.display_name
from provided p where s.slug=p.slug and s.department=p.department;

-- No priced products, food-safety fields, Stripe objects or checkout eligibility are created.
comment on table public.store_showcase_items is
 'Owner-selected catalog items with individual photo-backed detail routes; fulfillment and checkout remain governed by separate public.products records.';
commit;