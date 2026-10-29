-- MBB-PERF-156: combine 28 redundant authenticated SELECT-policy groups.
-- Preserve each original SELECT expression using OR, every anon policy using TO anon,
-- and every staff ALL access via equivalent INSERT/UPDATE/DELETE expressions.
-- PostgreSQL DDL is transactional; any unexpected policy shape aborts the whole migration.
create table if not exists private.mommabees_rls_policy_audit (
 id bigint generated always as identity primary key,
 migration text not null,
 table_name text not null,
 snapshot jsonb not null,
 created_at timestamptz not null default now(),
 unique(migration,table_name)
);
revoke all on private.mommabees_rls_policy_audit from public,anon,authenticated;
grant select on private.mommabees_rls_policy_audit to service_role;
do $mb$
declare
 t text;
 p record;
 staff record;
 combined text;
 relevant_count integer;
 all_count integer;
begin
 foreach t in array array['announcement_recipients','announcements','baking_days','catalog_product_types','catalog_varieties','categories','customer_profiles','home_carousel_slides','message_photos','messages','notifications','order_events','order_items','orders','past_bakes','photo_presets','product_day_limits','product_photos','products','promotion_recipients','promotions','review_photos','reviews','site_settings','special_date_requests','stock_batches','store_showcase_items','subcategories'] loop
  select count(*) into all_count from pg_policies where schemaname='public'
   and tablename=t and cmd='ALL' and permissive='PERMISSIVE'
   and 'authenticated'::name=any(roles) and cardinality(roles)=1;
  if all_count<>1 then raise exception 'Unexpected staff policy count for %: %',t,all_count;end if;
  select count(*) into relevant_count from pg_policies where schemaname='public'
   and tablename=t and cmd in ('SELECT','ALL') and permissive='PERMISSIVE'
   and 'authenticated'::name=any(roles);
  if relevant_count<2 then raise exception 'No policy overlap for %',t;end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename=t
    and cmd in ('SELECT','ALL') and permissive='PERMISSIVE'
    and 'authenticated'::name=any(roles) and (qual is null or
     roles::text[] && array['public']::text[]))
  then raise exception 'Unsupported authenticated SELECT policy shape for %',t;end if;
  insert into private.mommabees_rls_policy_audit(migration,table_name,snapshot)
  select 'v156',t,jsonb_agg(to_jsonb(z) order by z.policyname)
  from pg_policies z where z.schemaname='public' and z.tablename=t
  on conflict(migration,table_name) do nothing;
  select string_agg('('||qual||')',' OR ' order by cmd,policyname) into combined
  from pg_policies where schemaname='public' and tablename=t
    and permissive='PERMISSIVE' and cmd in ('ALL','SELECT')
    and 'authenticated'::name=any(roles);
  select * into staff from pg_policies where schemaname='public' and tablename=t
    and permissive='PERMISSIVE' and cmd='ALL' and roles=array['authenticated']::name[];
  if staff.qual is null then raise exception 'Staff condition absent for %',t;end if;
  for p in select * from pg_policies where schemaname='public' and tablename=t
    and permissive='PERMISSIVE' and cmd='SELECT' and 'authenticated'::name=any(roles)
  loop
   if 'anon'::name=any(p.roles) then
    execute format('alter policy %I on public.%I to anon',p.policyname,t);
   else
    execute format('drop policy %I on public.%I',p.policyname,t);
   end if;
  end loop;
  execute format('drop policy %I on public.%I',staff.policyname,t);
  execute format('create policy %I on public.%I as permissive for select to authenticated using (%s)',
    'mb_auth_select_v156',t,combined);
  execute format('create policy %I on public.%I as permissive for insert to authenticated with check (%s)',
    'mb_staff_insert_v156',t,coalesce(staff.with_check,staff.qual));
  execute format('create policy %I on public.%I as permissive for update to authenticated using (%s) with check (%s)',
    'mb_staff_update_v156',t,staff.qual,coalesce(staff.with_check,staff.qual));
  execute format('create policy %I on public.%I as permissive for delete to authenticated using (%s)',
    'mb_staff_delete_v156',t,staff.qual);
 end loop;
end
$mb$;
