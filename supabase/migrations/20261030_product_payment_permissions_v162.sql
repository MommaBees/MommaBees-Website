-- MommaBee v1.62 — Product-specific payment permissions.
-- Default deny: a published product does not become payable until explicitly enabled.
alter table public.products
 add column if not exists online_payment_enabled boolean not null default false;
alter table public.products
 add column if not exists pay_at_pickup_enabled boolean not null default false;
comment on column public.products.online_payment_enabled is
 'Item-level Stripe online checkout permission; global checkout and tax gates still apply.';
comment on column public.products.pay_at_pickup_enabled is
 'Item-level pay-at-pickup permission; global pickup, date, and tax review gates still apply.';

-- Inside the existing reserve_checkout/reserve_pickup_order transactions, reject an
-- unauthorized item and roll back any earlier capacity/inventory updates atomically.
create or replace function public.mommabees_validate_order_item_payment()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, public
as $$
declare
 v_method text;
 v_online boolean;
 v_pickup boolean;
begin
 select o.payment_method into v_method
 from public.orders o where o.id=new.order_id;
 select p.online_payment_enabled,p.pay_at_pickup_enabled into v_online,v_pickup
 from public.products p where p.id=new.product_id;
 if v_method='stripe' and v_online is true then return new; end if;
 if v_method='pay_at_pickup' and v_pickup is true then return new; end if;
 raise exception 'This product is not enabled for the selected payment method'
  using errcode='23514';
end;
$$;
drop trigger if exists mommabees_order_item_payment_guard on public.order_items;
create trigger mommabees_order_item_payment_guard
 before insert on public.order_items
 for each row execute function public.mommabees_validate_order_item_payment();
