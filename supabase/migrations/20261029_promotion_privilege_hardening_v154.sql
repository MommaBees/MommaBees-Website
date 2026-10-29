-- MBB-SEC-154: prevent direct signed-in invocation of privileged promotion delivery.
revoke all on function public.deliver_promotion(uuid) from public,anon,authenticated;
create or replace function public.mommabees_deliver_promotion_admin(p_promo_id uuid,p_actor_id uuid)
returns integer language plpgsql security definer set search_path=''
as $$
declare n integer;
begin
 if p_actor_id is null or not exists (
  select 1 from public.staff_roles s join public.customer_profiles c on c.id=s.user_id
  where s.user_id=p_actor_id and s.role in ('owner','admin') and c.banned_at is null
 ) then raise exception 'Management authorization required';end if;
 if not exists(select 1 from public.promotions
  where id=p_promo_id and published and starts_at<=now() and ends_at>now())
 then raise exception 'Promotion not active';end if;
 insert into public.notifications(customer_id,kind,title,body,promotion_id)
 select cp.id,'marketing',p.title,'A bakery promotion is available in your account.',p.id
 from public.customer_profiles cp cross join public.promotions p
 where p.id=p_promo_id and cp.marketing_opt_in and cp.banned_at is null and (
  p.audience='all' or
  (p.audience='selected' and exists(select 1 from public.promotion_recipients x where x.promotion_id=p.id and x.customer_id=cp.id)) or
  (p.audience='returning' and exists(select 1 from public.orders o where o.customer_id=cp.id and o.payment_status='paid'))
 ) on conflict do nothing;
 get diagnostics n=row_count;
 return n;
end
$$;
revoke all on function public.mommabees_deliver_promotion_admin(uuid,uuid) from public,anon,authenticated;
grant execute on function public.mommabees_deliver_promotion_admin(uuid,uuid) to service_role;
