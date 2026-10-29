-- MBB-COMMERCE-043: immutable selling unit on order lines and inventory package-unit protection.
-- One stock quantity is one product selling unit (single, half-dozen, dozen, or other selected package).
alter table public.order_items add column if not exists selling_unit_at_purchase text;
create or replace function private.snapshot_order_selling_unit()
returns trigger language plpgsql set search_path=''
as $fn$
declare v_unit text;
begin
 select unit into v_unit from public.products where id=new.product_id;
 if v_unit is null then raise exception 'Order item product not found';end if;
 new.selling_unit_at_purchase:=v_unit;
 -- A named unit on the order line prevents later product edits from obscuring package size.
 if v_unit in ('each','single','half-dozen','dozen') then
  new.product_name:=new.product_name||' ('||
   case v_unit when 'half-dozen' then 'Half-Dozen' when 'dozen' then 'Dozen' else 'Single' end||')';
 else
  new.product_name:=new.product_name||' ('||v_unit||')';
 end if;
 return new;
end
$fn$;
drop trigger if exists snapshot_order_selling_unit on public.order_items;
create trigger snapshot_order_selling_unit before insert on public.order_items
 for each row execute function private.snapshot_order_selling_unit();
create or replace function private.prevent_product_selling_unit_drift()
returns trigger language plpgsql set search_path=''
as $fn$
begin
 if new.unit is distinct from old.unit and exists(
  select 1 from public.stock_batches b
   where b.product_id=old.id and b.quantity_available>0 and not b.disabled
 ) then raise exception 'Cannot change selling unit while ready-to-sell packages remain. Resolve inventory before changing unit';end if;
 return new;
end
$fn$;
drop trigger if exists prevent_product_selling_unit_drift on public.products;
create trigger prevent_product_selling_unit_drift before update of unit on public.products
 for each row execute function private.prevent_product_selling_unit_drift();