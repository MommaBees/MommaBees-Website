-- Mamma Bee's Bakery: customer registration profiles and private photo messaging.
-- Existing Owner accounts are preserved. No passwords or secret keys are stored here.
alter table public.customer_profiles
  add column if not exists account_code text not null default ('MB-' || upper(left(replace(gen_random_uuid()::text,'-',''),12))),
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists username text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists country text default 'US',
  add column if not exists postal_code text,
  add column if not exists billing_same boolean not null default true,
  add column if not exists billing_line1 text,
  add column if not exists billing_line2 text,
  add column if not exists billing_city text,
  add column if not exists billing_state text,
  add column if not exists billing_country text default 'US',
  add column if not exists billing_postal_code text;
create unique index if not exists customer_profiles_account_code_unique on public.customer_profiles(account_code);
create unique index if not exists customer_profiles_username_ci_unique on public.customer_profiles(lower(username)) where username is not null;
alter table public.customer_profiles drop constraint if exists customer_profiles_username_valid;
alter table public.customer_profiles add constraint customer_profiles_username_valid check(username is null or username ~ '^[A-Za-z0-9_]{3,30}$');
-- Customers can edit contact/billing information, never their permanent Account ID or owner/staff role.
revoke insert, update, delete on public.customer_profiles from authenticated;
grant select on public.customer_profiles to authenticated;
grant update(full_name,first_name,last_name,username,phone,address_line1,address_line2,city,state,country,postal_code,
billing_same,billing_line1,billing_line2,billing_city,billing_state,billing_country,billing_postal_code,marketing_opt_in)
on public.customer_profiles to authenticated;
-- Supabase signup user metadata is customer-submitted profile DATA, not authorization metadata.
create or replace function private.create_profile() returns trigger
language plpgsql security definer set search_path='' as $$
declare m jsonb:=coalesce(new.raw_user_meta_data,'{}'::jsonb);
begin
 insert into public.customer_profiles(id,full_name,first_name,last_name,username,phone,address_line1,address_line2,city,state,country,postal_code,
 billing_same,billing_line1,billing_line2,billing_city,billing_state,billing_country,billing_postal_code)
 values(new.id, left(concat_ws(' ',nullif(m->>'first_name',''),nullif(m->>'last_name','')),150),
 nullif(left(m->>'first_name',70),''),
 nullif(left(m->>'last_name',70),''),
 nullif(left(m->>'username',30),''),
 nullif(left(m->>'phone',35),''),
 nullif(left(m->>'address_line1',160),''),
 nullif(left(m->>'address_line2',160),''),
 nullif(left(m->>'city',100),''),
 nullif(left(m->>'state',80),''),
 nullif(left(m->>'country',2),''),
 nullif(left(m->>'postal_code',15),''),
 coalesce((m->>'billing_same')::boolean,true),
 nullif(left(m->>'billing_line1',160),''),
 nullif(left(m->>'billing_line2',160),''),
 nullif(left(m->>'billing_city',100),''),
 nullif(left(m->>'billing_state',80),''),
 nullif(left(m->>'billing_country',2),''),
 nullif(left(m->>'billing_postal_code',15),''))
 on conflict(id) do nothing;
 return new;
end $$;
-- Message subject categories and private up-to-5-image attachments.
alter table public.messages add column if not exists subject_type text,
 add column if not exists subject_custom text;
alter table public.messages drop constraint if exists messages_subject_type_valid;
alter table public.messages add constraint messages_subject_type_valid check
(subject_type is null or subject_type in ('order','custom_order','pickup_delivery','product_allergens','payment','feedback','other'));
create table if not exists public.message_photos (
 id uuid primary key default gen_random_uuid(),
 message_id uuid not null references public.messages(id) on delete cascade,
 storage_path text not null unique,
 created_at timestamptz not null default now()
);
alter table public.message_photos enable row level security;
revoke all on public.message_photos from anon,authenticated;
grant select,insert on public.message_photos to authenticated;
create policy "message photo owner read" on public.message_photos for select to authenticated
 using(exists(select 1 from public.messages m where m.id=message_id and m.customer_id=(select auth.uid())));
create policy "message photo owner add" on public.message_photos for insert to authenticated
 with check(exists(select 1 from public.messages m where m.id=message_id and m.customer_id=(select auth.uid())));
create policy "message photo staff manage" on public.message_photos for all to authenticated
 using(exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role in ('owner','admin')))
 with check(exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role in ('owner','admin')));
create or replace function private.limit_message_photos() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.messages where id=new.message_id for update;
 if not found then raise exception 'Message not found'; end if;
 if (select count(*) from public.message_photos where message_id=new.message_id)>=5
 then raise exception 'Maximum five photos per message'; end if;
 return new;
end $$;
create trigger enforce_five_message_photos before insert on public.message_photos
 for each row execute function private.limit_message_photos();
drop policy if exists "customers send messages" on public.messages;
create policy "customers send messages" on public.messages for insert to authenticated
 with check(customer_id=(select auth.uid()) and is_staff_reply=false
 and (parent_id is null or exists(
 select 1 from public.messages root where root.id=parent_id and root.parent_id is null
 and root.customer_id=(select auth.uid()))));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('message-photos','message-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do nothing;
create policy "message image owner upload" on storage.objects for insert to authenticated with check
 (bucket_id='message-photos'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.messages m where m.id::text=(storage.foldername(name))[2]
 and m.customer_id=(select auth.uid())));
create policy "message image owner view" on storage.objects for select to authenticated using
 (bucket_id='message-photos' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.messages m where m.id::text=(storage.foldername(name))[2]
 and m.customer_id=(select auth.uid())));
create policy "message image staff view" on storage.objects for select to authenticated using
 (bucket_id='message-photos' and exists(select 1 from public.staff_roles s
 where s.user_id=(select auth.uid()) and s.role in ('owner','admin')));
