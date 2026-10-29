-- MBB-CATALOG-042: numeric variety count without damaging named variety relationships.
alter table public.products add column if not exists variety_count integer;
alter table public.store_showcase_items add column if not exists variety_count integer;
alter table public.products drop constraint if exists products_variety_count_nonnegative;
alter table public.products add constraint products_variety_count_nonnegative
 check(variety_count is null or variety_count>=0);
alter table public.store_showcase_items drop constraint if exists showcase_variety_count_nonnegative;
alter table public.store_showcase_items add constraint showcase_variety_count_nonnegative
 check(variety_count is null or variety_count>=0);
-- Prevent retroactive classification changes that contradict existing product records.
create or replace function private.prevent_category_product_type_drift()
returns trigger language plpgsql set search_path=''
as $fn$
begin
 if new.product_type is distinct from old.product_type and exists(
  select 1 from public.products p where p.category_id=new.id
   and p.product_type is distinct from new.product_type
 ) then raise exception 'Cannot change the category product type while existing products use a different type';end if;
 return new;
end
$fn$;
drop trigger if exists prevent_category_product_type_drift on public.categories;
create trigger prevent_category_product_type_drift
 before update of product_type on public.categories
 for each row execute function private.prevent_category_product_type_drift();