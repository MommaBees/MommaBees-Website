-- MBB-ADMIN-029 v1.19: Product types and non-food publication hard stop.
-- Existing catalog and product identifiers remain unchanged; no products are created.
begin;
alter table public.products
 add column if not exists product_type text not null default 'food';
alter table public.products
 add constraint products_product_type_check check (product_type in ('food','handmade','regulated'));
alter table public.products
 add constraint products_nonfood_unpublished_check check (not published or product_type='food');

create or replace function private.enforce_product_type_gate()
returns trigger
language plpgsql
set search_path = ''
as $fn$
declare category_slug text; category_active boolean; category_type text;
begin
 if new.category_id is null then
  if new.published then raise exception 'Published products must have a category';end if;
  return new;
 end if;
 select c.slug,c.active into category_slug,category_active
 from public.categories c where c.id=new.category_id;
 if not found then raise exception 'Product category not found';end if;
 if category_slug='natural-homemade-products' then category_type:='regulated';
 elsif category_slug in ('handmade','signs-decor') then category_type:='handmade';
 elsif category_slug in ('cookies','cakes','pies','cheesecakes','pastries',
                         'bars-brownies','breads','cake-pops','candies') then category_type:='food';
 elsif category_slug='seasonal' then
  if new.product_type not in ('food','handmade') then
   raise exception 'Seasonal category requires food or handmade classification';
  end if;
  category_type:=new.product_type;
 else raise exception 'Category needs a product-type classification before products can be saved';
 end if;
 if new.product_type <> category_type then
  raise exception 'Product type must match its selected category';
 end if;
 if new.published then
  if new.subcategory_id is not null and not exists (
   select 1 from public.subcategories s where s.id=new.subcategory_id
     and s.category_id=new.category_id and s.active
  ) then raise exception 'Published products require an active matching subcategory'; end if;
  if new.product_type <> 'food' then
   raise exception 'Non-food products are held from publication pending release review';
  end if;
  if not category_active then
   raise exception 'Products cannot be published into inactive categories';
  end if;
 end if;
 return new;
end
$fn$;

-- Drafts may reference inactive subcategories for classification and future review.
-- Published food products still require an active subcategory.
create or replace function private.check_product_subcategory()
returns trigger language plpgsql set search_path = ''
as $fn$
begin
 if new.subcategory_id is not null and not exists (
  select 1 from public.subcategories s where s.id=new.subcategory_id
   and s.category_id=new.category_id and (s.active or not new.published)
 ) then
  raise exception 'Product subcategory must belong to the category and be active when published';
 end if;
 return new;
end
$fn$;

drop trigger if exists enforce_product_type_gate on public.products;
create trigger enforce_product_type_gate before insert or update on public.products
for each row execute function private.enforce_product_type_gate();
commit;
