-- Prevent marking canceled pay-at-pickup orders as paid.
create or replace function public.confirm_pickup_payment(p_order_id uuid,p_actor_id uuid,p_method text)
 returns jsonb language plpgsql set search_path='' as $$
declare r public.orders%rowtype;
begin
 if p_method not in ('cash','external_card') then raise exception 'Invalid collection method'; end if;
 if not exists (select 1 from public.staff_roles where user_id=p_actor_id and role in ('owner','admin'))
 then raise exception 'Authorized staff account required'; end if;
 select * into r from public.orders where id=p_order_id for update;
 if not found or r.payment_method<>'pay_at_pickup' or r.payment_status<>'awaiting_pickup'
 or r.reservation_released or r.status='cancelled'
 then raise exception 'This order cannot be collected as pay at pickup'; end if;
 update public.orders set payment_status='paid',balance_due_cents=0 where id=r.id;
 insert into public.order_events(order_id,actor_id,event,detail)
 values(r.id,p_actor_id,'pickup_payment_collected',
   'Payment manually verified at pickup via '||p_method||'; amount '||r.balance_due_cents||' cents');
 return jsonb_build_object('order_id',r.id,'amount_paid_cents',r.balance_due_cents);
end $$;
revoke all on function public.confirm_pickup_payment(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.confirm_pickup_payment(uuid,uuid,text) to service_role;
