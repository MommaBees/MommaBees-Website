-- MBB-ADMIN-030 v1.20 — Managed homepage carousel and staff-protected media.
-- Existing hero_heading, home_intro and hero_url are migrated as the initial real slide.
begin;
alter table public.site_settings add column if not exists home_carousel_enabled boolean not null default false;
create table if not exists public.home_carousel_slides (
 id uuid primary key default gen_random_uuid(),
 eyebrow text not null default '',
 title text not null,
 description text not null default '',
 image_url text not null,
 image_alt text not null default '',
 primary_label text not null default 'Shop ready-to-sell',
 primary_href text not null default '#ready',
 secondary_label text not null default 'Schedule a preorder',
 secondary_href text not null default '#preorder',
 sort_order integer not null default 10,
 published boolean not null default false,
 starts_at timestamptz,
 ends_at timestamptz,
 created_at timestamptz not null default now(),
 constraint carousel_title_length check (length(trim(title)) between 3 and 160),
 constraint carousel_image_secure check (image_url ~ '^https://[^/]+/storage/v1/object/public/(carousel-photos|product-photos|past-bakes)/[^?#]+$'),
 constraint carousel_buttons_safe check (primary_href in ('#shop','#ready','#preorder','#gallery','#contact','#faq') and (secondary_href in ('#shop','#ready','#preorder','#gallery','#contact','#faq') or secondary_label='')),
 constraint carousel_schedule_check check (ends_at is null or starts_at is null or ends_at>starts_at)
);
create index if not exists home_carousel_order_idx on public.home_carousel_slides (sort_order,id);
alter table public.home_carousel_slides enable row level security;
revoke all on public.home_carousel_slides from public,anon,authenticated;
grant select on public.home_carousel_slides to anon,authenticated;
grant insert,update,delete on public.home_carousel_slides to authenticated;
create policy "public active homepage slides" on public.home_carousel_slides
 for select to anon,authenticated using (published and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()));
create policy "owner and admin manage homepage slides" on public.home_carousel_slides
 for all to authenticated
 using (private.bakery_account_active() and exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role in ('owner','admin')))
 with check (private.bakery_account_active() and exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role in ('owner','admin')));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('carousel-photos','carousel-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do nothing;
create policy "owner and admin upload carousel photographs" on storage.objects
 for insert to authenticated
 with check(bucket_id='carousel-photos' and private.bakery_account_active() and exists
 (select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role in ('owner','admin')));
create policy "owner and admin delete carousel photographs" on storage.objects
 for delete to authenticated
 using(bucket_id='carousel-photos' and private.bakery_account_active() and exists
 (select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role in ('owner','admin')));
insert into public.home_carousel_slides
 (eyebrow,title,description,image_url,image_alt,primary_label,primary_href,secondary_label,secondary_href,sort_order,published)
select 'Rooted in Faith · Baked with Love',coalesce(nullif(trim(s.home_heading),''),'A Little Country. A Whole Lot of Homemade.'),
coalesce(s.home_intro,''),s.hero_url,'An original bakery creation by MommaBee Bakery&Farmstand',
'Shop ready-to-sell','#ready','Schedule a preorder','#preorder',10,true
from public.site_settings s where s.id=1 and coalesce(s.hero_url,'')<>''
and not exists(select 1 from public.home_carousel_slides);
update public.site_settings set home_carousel_enabled=true where id=1;
commit;
