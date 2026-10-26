-- Mamma Bee's Bakery — independent Past Bakes and confirmed major-allergen checklist (2026-10-26)
-- Past bakes are portfolio material only: no product_id, price, inventory, or checkout link.
create table if not exists public.past_bakes (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 2 and 100),
 description text not null default '',
 image_url text not null check(length(trim(image_url)) > 10),
 sort_order integer not null default 100,
 published boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.past_bakes enable row level security;
revoke all on public.past_bakes from anon,authenticated;
grant select on public.past_bakes to anon,authenticated;
grant insert,update,delete on public.past_bakes to authenticated;
drop policy if exists "published past bakes are public" on public.past_bakes;
create policy "published past bakes are public" on public.past_bakes
 for select to anon,authenticated using(published);
drop policy if exists "bakery managers control past bakes" on public.past_bakes;
create policy "bakery managers control past bakes" on public.past_bakes
 for all to authenticated
 using (exists(select 1 from public.staff_roles sr
    where sr.user_id=(select auth.uid()) and sr.role in ('owner','admin')))
 with check (exists(select 1 from public.staff_roles sr
    where sr.user_id=(select auth.uid()) and sr.role in ('owner','admin')));
drop policy if exists "active account only" on public.past_bakes;
create policy "active account only" on public.past_bakes
 as restrictive for all to authenticated using(private.bakery_account_active())
 with check(private.bakery_account_active());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('past-bakes','past-bakes',true,5242880,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do update set public=true,file_size_limit=5242880,
 allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "staff upload past bakes" on storage.objects;
create policy "staff upload past bakes" on storage.objects for insert to authenticated
 with check(bucket_id='past-bakes' and exists(select 1 from public.staff_roles sr where
 sr.user_id=(select auth.uid()) and sr.role in ('owner','admin')));
drop policy if exists "staff edit past bakes" on storage.objects;
create policy "staff edit past bakes" on storage.objects for update to authenticated
 using(bucket_id='past-bakes' and exists(select 1 from public.staff_roles sr where
 sr.user_id=(select auth.uid()) and sr.role in ('owner','admin')))
 with check(bucket_id='past-bakes' and exists(select 1 from public.staff_roles sr where
 sr.user_id=(select auth.uid()) and sr.role in ('owner','admin')));
drop policy if exists "staff delete past bakes" on storage.objects;
create policy "staff delete past bakes" on storage.objects for delete to authenticated
 using(bucket_id='past-bakes' and exists(select 1 from public.staff_roles sr where
 sr.user_id=(select auth.uid()) and sr.role in ('owner','admin')));

-- Nine major FDA allergen groups. UI may suggest groups; approval is recipe-specific.
alter table public.products
 add column if not exists major_allergens text[] not null default array[]::text[],
 add column if not exists allergen_reviewed boolean not null default false;
alter table public.products drop constraint if exists products_major_allergens_only;
alter table public.products add constraint products_major_allergens_only
 check (major_allergens <@ array['Milk','Eggs','Fish','Crustacean shellfish','Tree nuts','Peanuts','Wheat','Soybeans','Sesame']::text[]);
create or replace function private.enforce_product_allergen_review()
 returns trigger language plpgsql set search_path='' as $$
begin
 if new.published then
   if not new.allergen_reviewed
      or nullif(trim(coalesce(new.ingredients,'')),'') is null
      or nullif(trim(coalesce(new.allergens,'')),'') is null then
      raise exception 'Published products require ingredient details and completed major-allergen review';
   end if;
   if tg_op='UPDATE' and
      (new.ingredients is distinct from old.ingredients or new.allergens is distinct from old.allergens
        or new.major_allergens is distinct from old.major_allergens)
      and new.allergen_reviewed is not true then
      raise exception 'Changed recipes must be rechecked for allergens';
   end if;
 end if;
 return new;
end $$;
revoke execute on function private.enforce_product_allergen_review() from public,anon,authenticated;
drop trigger if exists validate_allergens_before_publish on public.products;
create trigger validate_allergens_before_publish before insert or update on public.products
 for each row execute function private.enforce_product_allergen_review();
