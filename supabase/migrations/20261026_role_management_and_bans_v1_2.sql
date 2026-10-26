-- Mamma Bee's Bakery: owner-controlled account administration v1.2.
-- This migration does not create, ban, demote or delete any existing account.
alter table public.staff_roles drop constraint if exists staff_roles_role_check;
alter table public.staff_roles add constraint staff_roles_role_check
  check (role in ('owner','admin','moderator','staff'));
alter table public.customer_profiles
  add column if not exists banned_at timestamptz,
  add column if not exists ban_reason text;
-- Browser clients cannot update banned_at / ban_reason. The existing column-specific
-- customer_profiles UPDATE grant deliberately excludes them.
create table if not exists public.account_admin_audit(
 id bigint generated always as identity primary key,
 actor_id uuid not null,
 target_user_id uuid,
 operation text not null check(operation in ('invite','grant_role','remove_role','ban','unban','delete')),
 details jsonb not null default '{}'::jsonb,
 recorded_at timestamptz not null default now()
);
alter table public.account_admin_audit enable row level security;
revoke all on public.account_admin_audit from anon, authenticated;
grant select on public.account_admin_audit to authenticated;
drop policy if exists "owner sees account management audit" on public.account_admin_audit;
create policy "owner sees account management audit" on public.account_admin_audit
 for select to authenticated using(
 exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role='owner'));
-- A role grant to 'moderator' confers ONLY moderation read permissions.
-- Moderator writes are performed through server-validated endpoints, not broad browser grants.
drop policy if exists "moderators read messages" on public.messages;
create policy "moderators read messages" on public.messages for select to authenticated
 using(exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role='moderator'));
drop policy if exists "moderators read message photos" on public.message_photos;
create policy "moderators read message photos" on public.message_photos for select to authenticated
 using(exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role='moderator'));
drop policy if exists "moderators read reviews" on public.reviews;
create policy "moderators read reviews" on public.reviews for select to authenticated
 using(exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role='moderator'));
drop policy if exists "moderators read review photos" on public.review_photos;
create policy "moderators read review photos" on public.review_photos for select to authenticated
 using(exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role='moderator'));
drop policy if exists "moderators read private message images" on storage.objects;
create policy "moderators read private message images" on storage.objects for select to authenticated
 using(bucket_id='message-photos' and
  exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role='moderator'));
drop policy if exists "moderators read private review images" on storage.objects;
create policy "moderators read private review images" on storage.objects for select to authenticated
 using(bucket_id='review-photos' and
  exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role='moderator'));
-- A banned member's unexpired JWT must not continue authorizing the app's Data API.
-- A non-exposed, parameterless function avoids recursive RLS on customer_profiles.
create or replace function private.bakery_account_active() returns boolean
 language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null
    and exists(select 1 from public.customer_profiles p
               where p.id=(select auth.uid()) and p.banned_at is null);
$$;
revoke all on function private.bakery_account_active() from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.bakery_account_active() to authenticated;
-- Restrictive policies combine with existing permissive RLS policies.
-- For example, public catalog remains visible to anonymous visitors, but suspended
-- signed-in accounts cannot access customer data using still-valid tokens.
do $restrict$ declare t text; begin
 foreach t in array array['staff_roles','customer_profiles','categories','products','product_photos',
 'stock_batches','baking_days','product_day_limits','site_settings','promotions',
 'promotion_recipients','announcements','announcement_recipients','orders','order_items',
 'order_events','messages','reviews','review_photos','message_photos','notifications',
 'expenses','ingredients','recipes','recipe_ingredients','account_admin_audit'] loop
 execute format('drop policy if exists "active account only" on public.%I',t);
 execute format('create policy "active account only" on public.%I as restrictive for all to authenticated using (private.bakery_account_active()) with check (private.bakery_account_active())',t);
 end loop;
end $restrict$;
-- No one can remove the single established Owner by an accidental application action.
create or replace function private.protect_owner_role() returns trigger language plpgsql
 set search_path='' as $$
begin
 if old.role='owner' and (tg_op='DELETE' or new.role is distinct from 'owner') then
    raise exception 'Owner role cannot be removed from application account management';
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
drop trigger if exists protect_owner_role on public.staff_roles;
create trigger protect_owner_role before update or delete on public.staff_roles
 for each row execute function private.protect_owner_role();
