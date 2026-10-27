-- MBB-CATALOG-050 v1.38: average showcase prices and calendar availability.
-- Product Showcase is display-only; no Stripe products, prices, stock or orders changed.
begin;
alter table public.store_showcase_items
 add column if not exists availability_date date,
 add column if not exists price_kind text not null default 'owner';
do $constraint$begin
 if not exists(select 1 from pg_constraint where conrelid='public.store_showcase_items'::regclass and conname='showcase_price_kind_check') then
  alter table public.store_showcase_items add constraint showcase_price_kind_check
   check(price_kind in ('owner','market_average'));
 end if;
end $constraint$;
-- Existing owner-entered prices always win. These are reference figures, not checkout authorization.
with market_reference(slug,amount_cents,unit) as (
 values
 ('banana-creme-pie',2800,'each'),
 ('cinnamon-swirl-bread',950,'loaf'),
 ('dream-cookie-drommar',250,'each'),
 ('ginger-bread',250,'each'),
 ('chocolate-chip-cookies',275,'each'),
 ('meringue-cookies',150,'each'),
 ('oatmeal-old-fashioned-cookies',275,'each'),
 ('pecan-dreams',275,'each'),
 ('green-beans',397,'pound'),
 ('blackberries',494,'pint'),
 ('broccoli',345,'bunch'),
 ('cauliflower',388,'each'),
 ('jalapenos',39,'each'),
 ('mini-green-peppers',65,'each'),
 ('salad-cucumbers',80,'each'),
 ('spineless-okra',345,'pound'),
 ('tomatoes',330,'pound'),
 ('yellow-summer-squash',95,'each'),
 ('zucchini',136,'each')
)
update public.store_showcase_items p
set price_cents=m.amount_cents,
    price_unit=m.unit,
    price_kind='market_average'
from market_reference m
where p.slug=m.slug and p.price_cents is null;
-- Legacy generic availability sentences are replaced by a precise selected calendar date.
-- Existing date choices are never overwritten. NULL means no date has been selected yet.
update public.store_showcase_items set availability_note=null
where availability_note in (
 'Please confirm preparation dates and availability.',
 'Seasonal harvest. Please confirm current availability.'
);
comment on column public.store_showcase_items.availability_date is
 'Owner-selected local calendar availability date (YYYY-MM-DD), displayed as Aug. 23, 2026. No date is fabricated.';
comment on column public.store_showcase_items.price_kind is
 'market_average means reference price; owner means manually approved selling price. Neither enables showcase checkout.';
commit;