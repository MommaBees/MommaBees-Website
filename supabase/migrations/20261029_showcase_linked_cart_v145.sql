-- MBB-CATALOG-057: optional explicit link from Product Showcase to real, purchasable Product.
-- No showcase records are auto-converted to products; checkout continues to use products and reserve_checkout.
alter table public.store_showcase_items
  add column if not exists product_id uuid references public.products(id) on delete set null;
create index if not exists idx_store_showcase_items_product_id
  on public.store_showcase_items(product_id) where product_id is not null;

create or replace function private.enforce_showcase_product_match()
returns trigger language plpgsql set search_path=''
as $$
declare v_department text; v_category_id uuid;
begin
  if new.product_id is null then return new; end if;
  select p.department,p.category_id into v_department,v_category_id
  from public.products p where p.id=new.product_id;
  if not found or v_department is distinct from new.department
    or v_category_id is distinct from new.category_id then
    raise exception 'Linked sale product must belong to the same department and category as the Showcase item';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_showcase_product_match on public.store_showcase_items;
create trigger enforce_showcase_product_match before insert or update of product_id,department,category_id
on public.store_showcase_items for each row execute function private.enforce_showcase_product_match();
