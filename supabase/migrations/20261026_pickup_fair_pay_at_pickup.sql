-- Mamma Bee's Bakery 1.6 — pickup calendar, fair dates, and collect-at-pickup orders.
-- Customer-facing fee for dates outside the baking schedule is QUOTE ONLY pending bakery approval.
alter table public.baking_days
 add column if not exists day_type text not null default 'baking' check(day_type in ('baking','fair')),
 add column if not exists event_label text,
 add column if not exists pay_at_pickup_available boolean not null default false;

alter table public.site_settings
 add column if not exists pay_at_pickup_enabled boolean not null default false,
 add column if not exists pay_at_pickup_tax_reviewed boolean not null default false,
 add column if not exists pay_at_pickup_tax_rate_bps integer check(pay_at_pickup_tax_rate_bps between 0 and 2500),
 add column if not exists special_date_requests_enabled boolean not null default false,
 add column if not exists special_date_convenience_fee_cents integer not null default 0
   check(special_date_convenience_fee_cents between 0 and 20000);

alter table public.orders
 alter column email drop not null,
 add column if not exists payment_method text not null default 'stripe'
   check(payment_method in ('stripe','pay_at_pickup')),
 add column if not exists guest_contact_address jsonb,
 add column if not exists contact_channel text check(contact_channel in ('email','text')),
 add column if not exists balance_due_cents integer not null default 0 check(balance_due_cents>=0);
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
 check(payment_status in ('pending','awaiting_pickup','paid','refunded','failed','expired'));

-- Preserve strict payment field protection while permitting approved production steps
-- for pay-at-pickup orders. Completion still requires payment recorded.
create or replace function private.protect_order_payment_fields() returns trigger
language plpgsql set search_path='' as $$
begin
 if current_user<>'service_role'
 and new.status in ('confirmed','baking','ready','completed')
 and old.payment_status<>'paid'
 and not (old.payment_method='pay_at_pickup' and old.payment_status='awaiting_pickup'
          and new.status in ('confirmed','baking','ready'))
 then raise exception 'Unpaid orders cannot advance to production'; end if;
 if current_user<>'service_role' and new.status='cancelled' and old.status<>'cancelled'
 then raise exception 'Cancellation/refund workflow requires server approval'; end if;
 if current_user<>'service_role' and
 (new.payment_status is distinct from old.payment_status
 or new.total_cents is distinct from old.total_cents
 or new.subtotal_cents is distinct from old.subtotal_cents
 or new.discount_cents is distinct from old.discount_cents
 or new.delivery_cents is distinct from old.delivery_cents
 or new.tax_cents is distinct from old.tax_cents
 or new.checkout_session_id is distinct from old.checkout_session_id
 or new.customer_id is distinct from old.customer_id
 or new.reservation_released is distinct from old.reservation_released
 or new.payment_method is distinct from old.payment_method
 or new.balance_due_cents is distinct from old.balance_due_cents
 or new.guest_contact_address is distinct from old.guest_contact_address
 or new.contact_channel is distinct from old.contact_channel)
 then raise exception 'Payment and customer ownership fields are server managed'; end if;
 return new;
end $$;

-- Service-role-only transaction ensures full capacity, stock, contact, and tax checks on server.
create or replace function public.reserve_pickup_order(
 p_items jsonb,p_date date,p_window text,p_first_name text,p_last_name text,
 p_email text,p_phone text,p_address jsonb,p_contact_channel text,
 p_user_id uuid,p_note text,p_guest_hash text)
returns jsonb language plpgsql set search_path='' as $$
declare
 d public.baking_days%rowtype; cfg public.site_settings%rowtype;
 itm jsonb; r record; product public.products%rowtype; batch public.stock_batches%rowtype;
 v_today date:=(now() at time zone 'America/Chicago')::date;
 v_order uuid; v_quantity int; v_mode text; v_batch uuid;
 v_capacity int; v_limit int; v_total int:=0; v_tax int:=0;
begin
 select * into cfg from public.site_settings where id=1;
 if not found or not cfg.pay_at_pickup_enabled or not cfg.pickup_enabled
 then raise exception 'Pay at pickup is not currently offered'; end if;
 if not cfg.pay_at_pickup_tax_reviewed or cfg.pay_at_pickup_tax_rate_bps is null
 then raise exception 'The bakery must configure tax handling before accepting pay-at-pickup orders'; end if;
 if p_date<v_today or p_date>v_today+interval '180 days'
 then raise exception 'Choose a valid future pickup date'; end if;
 select * into d from public.baking_days where date=p_date and enabled for update;
 if not found or d.cutoff_at<=now() or not d.pickup_enabled
 or not d.pay_at_pickup_available or not (p_window=any(d.pickup_windows))
 then raise exception 'Selected pickup day or time is not available for pay at pickup'; end if;
 if trim(coalesce(p_first_name,''))='' or trim(coalesce(p_last_name,''))=''
 or trim(coalesce(p_address->>'street',''))='' or trim(coalesce(p_address->>'city',''))=''
 or trim(coalesce(p_address->>'state',''))='' or coalesce(p_address->>'zip','') !~ '^[0-9]{5}(-[0-9]{4})?$'
 then raise exception 'Provide your full name and complete contact address'; end if;
 if p_contact_channel not in ('email','text') then raise exception 'Select a contact method'; end if;
 if p_contact_channel='email' and (p_email is null or p_email !~ '^[^ @]+@[^ @]+\.[^ @]+$')
 then raise exception 'A valid email address is required'; end if;
 if p_contact_channel='text' and (p_phone is null or p_phone !~ '^\+?[0-9() .-]{10,22}$')
 then raise exception 'A valid text-capable phone number is required'; end if;
 if coalesce(p_email,'')<>'' and p_email !~ '^[^ @]+@[^ @]+\.[^ @]+$'
 then raise exception 'Email address is invalid'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 40
 then raise exception 'Choose at least one product'; end if;
 if length(coalesce(p_note,''))>1000 then raise exception 'Order note is too long'; end if;
 -- Consistent product locking. Day row lock serializes reservations for this date.
 for r in select distinct (x->>'product_id')::uuid as id
    from jsonb_array_elements(p_items) x order by 1 loop
   perform 1 from public.products where id=r.id for update;
 end loop;
 select coalesce(sum(oi.quantity),0) into v_capacity
 from public.order_items oi join public.orders o on o.id=oi.order_id
 where o.fulfillment_date=p_date and oi.mode='preorder'
 and o.payment_status in ('pending','paid','awaiting_pickup')
 and o.reservation_released=false;
 if v_capacity+(select coalesce(sum((x->>'quantity')::integer),0)
    from jsonb_array_elements(p_items) x where x->>'mode'='preorder')>d.capacity_total
 then raise exception 'This pickup date is fully booked'; end if;
 insert into public.orders(customer_id,email,customer_name,phone,fulfillment_method,fulfillment_date,
  fulfillment_window,delivery_address,guest_contact_address,contact_channel,payment_method,
  payment_status,status,note,guest_token_hash,reservation_expires_at)
 values(p_user_id,nullif(lower(trim(coalesce(p_email,''))),''),left(trim(p_first_name)||' '||trim(p_last_name),120),
   nullif(trim(coalesce(p_phone,'')),''),'pickup',p_date,p_window,null,p_address,p_contact_channel,
   'pay_at_pickup','awaiting_pickup','new',left(coalesce(p_note,''),1000),p_guest_hash,null)
 returning id into v_order;
 for itm in select * from jsonb_array_elements(p_items) loop
   v_mode:=itm->>'mode';v_quantity:=(itm->>'quantity')::int;
   v_batch:=nullif(itm->>'batch_id','')::uuid;
   if v_quantity not between 1 and 30 or v_mode not in ('ready','preorder')
   then raise exception 'Invalid item quantity or mode'; end if;
   select * into product from public.products
    where id=(itm->>'product_id')::uuid and published;
   if not found or (v_mode='ready' and product.mode not in ('ready','both'))
   or (v_mode='preorder' and product.mode not in ('preorder','both'))
   then raise exception 'Selected item is not available'; end if;
   if v_mode='ready' then
     select * into batch from public.stock_batches where id=v_batch and product_id=product.id
     and not disabled and baked_on<=v_today and best_before>=p_date
     and quantity_available>=v_quantity for update;
     if not found then raise exception 'Ready-to-sell quantity is unavailable'; end if;
     update public.stock_batches set quantity_available=quantity_available-v_quantity where id=v_batch;
   else
     if p_date<v_today+product.lead_days then raise exception 'Lead time is insufficient'; end if;
     select max_quantity into v_limit from public.product_day_limits
        where product_id=product.id and baking_date=p_date;
     if found and (select coalesce(sum(oi.quantity),0) from public.order_items oi
       join public.orders o on o.id=oi.order_id
       where oi.product_id=product.id and o.fulfillment_date=p_date
       and oi.mode='preorder' and o.payment_status in ('pending','paid','awaiting_pickup')
       and not o.reservation_released)+v_quantity>v_limit
     then raise exception 'Product capacity has been reached'; end if;
   end if;
   insert into public.order_items(order_id,product_id,batch_id,product_name,quantity,mode,unit_price_cents)
   values(v_order,product.id,case when v_mode='ready' then v_batch else null end,
   product.name,v_quantity,v_mode,product.price_cents);
   v_total:=v_total+product.price_cents*v_quantity;
 end loop;
 v_tax:=round(v_total*cfg.pay_at_pickup_tax_rate_bps/10000.0)::int;
 update public.orders set subtotal_cents=v_total,tax_cents=v_tax,
 total_cents=v_total+v_tax,balance_due_cents=v_total+v_tax where id=v_order;
 insert into public.order_events(order_id,event,detail)
 values(v_order,'pay_at_pickup_reserved','Payment due at pickup; no Stripe charge made');
 return jsonb_build_object('order_id',v_order,'amount_due_cents',v_total+v_tax,
   'payment_status','awaiting_pickup');
end $$;
revoke all on function public.reserve_pickup_order(jsonb,date,text,text,text,text,text,jsonb,text,uuid,text,text)
 from public,anon,authenticated;
grant execute on function public.reserve_pickup_order(jsonb,date,text,text,text,text,text,jsonb,text,uuid,text,text)
 to service_role;

create or replace function public.confirm_pickup_payment(p_order_id uuid,p_actor_id uuid,p_method text)
 returns jsonb language plpgsql set search_path='' as $$
declare r public.orders%rowtype;
begin
 if p_method not in ('cash','external_card') then raise exception 'Invalid collection method'; end if;
 if not exists (select 1 from public.staff_roles where user_id=p_actor_id and role in ('owner','admin'))
 then raise exception 'Authorized staff account required'; end if;
 select * into r from public.orders where id=p_order_id for update;
 if not found or r.payment_method<>'pay_at_pickup' or r.payment_status<>'awaiting_pickup'
 then raise exception 'This order cannot be collected as pay at pickup'; end if;
 update public.orders set payment_status='paid',balance_due_cents=0 where id=r.id;
 insert into public.order_events(order_id,actor_id,event,detail)
 values(r.id,p_actor_id,'pickup_payment_collected',
   'Payment manually verified at pickup via '||p_method||'; amount '||r.balance_due_cents||' cents');
 return jsonb_build_object('order_id',r.id,'amount_paid_cents',r.balance_due_cents);
end $$;
revoke all on function public.confirm_pickup_payment(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.confirm_pickup_payment(uuid,uuid,text) to service_role;

-- Store off-calendar interest without fabricating a confirmed order or charging a fee.
create table if not exists public.special_date_requests(
 id uuid primary key default gen_random_uuid(),
 customer_id uuid references auth.users(id),
 requested_date date not null,
 first_name text not null, last_name text not null,
 email text,phone text,contact_channel text not null check(contact_channel in ('email','text')),
 note text not null, estimated_convenience_fee_cents integer not null default 0,
 status text not null default 'pending' check(status in ('pending','reviewing','approved','declined')),
 created_at timestamptz not null default now()
);
alter table public.special_date_requests enable row level security;
revoke all on public.special_date_requests from anon,authenticated;
grant select,update on public.special_date_requests to authenticated;
create policy "bakery managers review special requests" on public.special_date_requests
 for all to authenticated using(exists(select 1 from public.staff_roles
 where user_id=(select auth.uid()) and role in ('owner','admin')))
 with check(exists(select 1 from public.staff_roles
 where user_id=(select auth.uid()) and role in ('owner','admin')));
create policy "customers see their own special date requests" on public.special_date_requests
 for select to authenticated using(customer_id=(select auth.uid()));
create policy "active account only" on public.special_date_requests as restrictive
 for all to authenticated using(private.bakery_account_active())
 with check(private.bakery_account_active());
