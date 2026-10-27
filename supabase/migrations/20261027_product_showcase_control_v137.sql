-- MBB-CATALOG-049 v1.37. Product Showcase is presentation-only; checkout products remain independent.
begin;
alter table public.site_settings add column if not exists product_showcase_enabled boolean not null default true;
alter table public.store_showcase_items
 add column if not exists description text,
 add column if not exists price_cents integer,
 add column if not exists price_unit text,
 add column if not exists availability_note text,
 add column if not exists ingredients text,
 add column if not exists allergens text,
 add column if not exists storage_notes text,
 add column if not exists fulfillment_note text;
do $constraints$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.store_showcase_items'::regclass and conname='store_showcase_positive_price') then
   alter table public.store_showcase_items add constraint store_showcase_positive_price check(price_cents is null or price_cents > 0);
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.store_showcase_items'::regclass and conname='store_showcase_price_unit_check') then
   alter table public.store_showcase_items add constraint store_showcase_price_unit_check
   check(price_unit is null or price_unit in ('each','dozen','box','tray','bag','bunch','basket','pint','quart','pound','loaf','slice'));
 end if;
end $constraints$;
-- Only owner-supplied facts: local origin, homemade baked goods, homegrown chemical-spray-free produce.
-- Do not insert recipe ingredients, allergen clearance, quantities, or sale prices.
with facts(slug, description) as (
 values
 ('banana-creme-pie','Homemade banana cream pie prepared in Nixa, Missouri. A classic banana cream dessert.'),
 ('cinnamon-swirl-bread','Homemade cinnamon swirl bread baked in Nixa, Missouri. A loaf with a cinnamon swirl.'),
 ('dream-cookie-drommar','Homemade Dream Cookies (drömmar) prepared in Nixa, Missouri.'),
 ('ginger-bread','Homemade gingerbread cookies baked in Nixa, Missouri.'),
 ('chocolate-chip-cookies','Homemade chocolate chip cookies baked in Nixa, Missouri.'),
 ('meringue-cookies','Homemade meringue cookies prepared in Nixa, Missouri.'),
 ('oatmeal-old-fashioned-cookies','Homemade old-fashioned oatmeal cookies baked in Nixa, Missouri.'),
 ('pecan-dreams','Homemade Pecan Dreams prepared in Nixa, Missouri.'),
 ('green-beans','Homegrown green beans raised in Nixa, Missouri without chemical sprays.'),
 ('blackberries','Homegrown blackberries raised in Nixa, Missouri without chemical sprays.'),
 ('broccoli','Homegrown broccoli raised in Nixa, Missouri without chemical sprays.'),
 ('cauliflower','Homegrown cauliflower raised in Nixa, Missouri without chemical sprays.'),
 ('jalapenos','Homegrown jalapeños raised in Nixa, Missouri without chemical sprays.'),
 ('mini-green-peppers','Homegrown mini green peppers raised in Nixa, Missouri without chemical sprays.'),
 ('salad-cucumbers','Homegrown salad cucumbers raised in Nixa, Missouri without chemical sprays.'),
 ('spineless-okra','Homegrown spineless okra raised in Nixa, Missouri without chemical sprays.'),
 ('tomatoes','Homegrown tomatoes raised in Nixa, Missouri without chemical sprays.'),
 ('yellow-summer-squash','Homegrown yellow summer squash raised in Nixa, Missouri without chemical sprays.'),
 ('zucchini','Homegrown zucchini raised in Nixa, Missouri without chemical sprays.')
)
update public.store_showcase_items s set description=f.description
from facts f where s.slug=f.slug and (s.description is null or btrim(s.description)='');
update public.store_showcase_items set availability_note =
 case when department='homestand' then 'Seasonal harvest. Please confirm current availability.'
 else 'Please confirm preparation dates and availability.' end
where availability_note is null or btrim(availability_note)='';
-- Stronger RLS guard: when showcase is off, public REST reads do not expose it.
-- Owner/Admin retain their separate privileged policy and can re-enable the showcase.
drop policy if exists "public visible store showcase items" on public.store_showcase_items;
create policy "public visible store showcase items" on public.store_showcase_items
 for select to anon,authenticated
 using(
   active
   and exists(select 1 from public.site_settings ss where ss.id=1 and ss.product_showcase_enabled)
   and exists(select 1 from public.categories c where c.id=category_id and c.active and c.department=store_showcase_items.department)
 );
comment on column public.site_settings.product_showcase_enabled is
 'Master visibility for promotional Product Showcase in Home, Store pages, Detail routes and automatic carousel. Does not affect priced inventory.';
comment on column public.store_showcase_items.price_cents is
 'Optional owner-entered presentation price; never permits checkout or generates Stripe catalog products.';
commit;