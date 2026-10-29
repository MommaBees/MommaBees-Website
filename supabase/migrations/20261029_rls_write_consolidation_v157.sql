-- MBB-PERF-157: preserve OR-aggregated customer/staff write access with
-- a single permissive rule for each affected table/action. Fail closed on unexpected policy shapes.
do $mb$
declare item record; rec record; using_expr text; check_expr text; n integer;
begin
 for item in select * from (values
 ('customer_profiles','INSERT'),
 ('customer_profiles','UPDATE'),
 ('message_photos','INSERT'),
 ('messages','INSERT'),
 ('notifications','UPDATE'),
 ('review_photos','INSERT'),
 ('reviews','INSERT')) as v(t,action)
 loop
  select count(*) into n from pg_policies where schemaname='public' and tablename=item.t
   and cmd=item.action and permissive='PERMISSIVE'
   and roles=array['authenticated']::name[];
  if n<>2 then raise exception 'Unexpected write policy shape for %.%: %',item.t,item.action,n;end if;
  insert into private.mommabees_rls_policy_audit(migration,table_name,snapshot)
  select 'v157',item.t,jsonb_agg(to_jsonb(p) order by p.policyname)
  from pg_policies p where p.schemaname='public' and p.tablename=item.t
   and p.cmd=item.action and p.permissive='PERMISSIVE'
  on conflict(migration,table_name) do nothing;
  select string_agg('('||qual||')',' OR ' order by policyname),
   string_agg('('||coalesce(with_check,qual)||')',' OR ' order by policyname)
   into using_expr,check_expr from pg_policies where schemaname='public'
   and tablename=item.t and cmd=item.action and permissive='PERMISSIVE'
   and roles=array['authenticated']::name[];
  for rec in select policyname from pg_policies where schemaname='public' and tablename=item.t
   and cmd=item.action and permissive='PERMISSIVE' and roles=array['authenticated']::name[]
  loop
   execute format('drop policy %I on public.%I',rec.policyname,item.t);
  end loop;
  if item.action='INSERT' then
   execute format('create policy %I on public.%I as permissive for insert to authenticated with check (%s)',
    'mb_insert_v157',item.t,check_expr);
  else
   execute format('create policy %I on public.%I as permissive for update to authenticated using (%s) with check (%s)',
    'mb_update_v157',item.t,using_expr,check_expr);
  end if;
 end loop;
end
$mb$;
