-- Site-wide layout selection and strictly test-only showcase package quantities.
-- Do NOT create stock batches, sale products, orders or payment entitlements.
alter table public.site_settings
 add column if not exists site_card_style text not null default 'cards';
alter table public.site_settings
 drop constraint if exists site_card_style_valid;
alter table public.site_settings
 add constraint site_card_style_valid check(site_card_style in ('cards','open'));
alter table public.store_showcase_items
 add column if not exists preview_quantity integer not null default 30;
alter table public.store_showcase_items
 drop constraint if exists preview_quantity_in_range;
alter table public.store_showcase_items
 add constraint preview_quantity_in_range check(preview_quantity between 0 and 100000);
