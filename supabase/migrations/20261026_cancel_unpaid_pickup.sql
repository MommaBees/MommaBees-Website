-- Staff-only cancellation of unpaid pay-at-pickup orders; restore reserved ready stock.
create or replace function public.cancel_pickup_order(p_order_id uuid,p_actor_id uuid,p_reason text)
returns jsonb language plpgsql set search_path='' as $$
declare o public.orders%rowtype; row_item record;
begin
 if not exists(select 1 from public.staff_roles where user_id=p_actor_id and role in ('owner','admin'))
 then raise exception 'Owner/Admin required'; end if;
 if nullif(trim(coalesce(p_reason,'')),'') is null
 then raise exception 'Cancellation reason is required'; end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.payment_method<>'pay_at_pickup' or o.payment_status<>'awaiting_pickup'
 or o.reservation_released
 then raise exception 'Order cannot be cancelled with this workflow'; end if;
 for row_item in select batch_id,quantity from public.order_items
 where order_id=p_order_id and batch_id is not null loop
  update public.stock_batches set quantity_available=quantity_available+row_item.quantity
  where id=row_item.batch_id;
 end loop;
 update public.orders set status='cancelled',reservation_released=true,balance_due_cents=0
 where id=p_order_id;
 insert into public.order_events(order_id,actor_id,event,detail)
 values(p_order_id,p_actor_id,'pay_at_pickup_cancelled',left(p_reason,500));
 return jsonb_build_object('order_id',p_order_id,'cancelled',true);
end $$;
revoke all on function public.cancel_pickup_order(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.cancel_pickup_order(uuid,uuid,text) to service_role;
