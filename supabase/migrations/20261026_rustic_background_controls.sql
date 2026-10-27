-- Mamma Bee's Bakery — secure owner-managed rustic website backgrounds, v1.9.
-- A public bucket serves published background images; uploads are Owner/Admin only.
alter table public.site_settings
  add column if not exists background_enabled boolean not null default true,
  add column if not exists background_style text not null default 'prairie_doors',
  add column if not exists background_image_url text,
  add column if not exists background_position text not null default 'center',
  add column if not exists background_overlay_percent integer not null default 76,
  add column if not exists background_solid_color text not null default '#f8efdf';
alter table public.site_settings drop constraint if exists site_settings_background_style_check;
alter table public.site_settings add constraint site_settings_background_style_check
  check (background_style in ('prairie_doors','barnwood','linen','solid','photo'));
alter table public.site_settings drop constraint if exists site_settings_background_position_check;
alter table public.site_settings add constraint site_settings_background_position_check
  check (background_position in ('center','top','bottom','left','right'));
alter table public.site_settings drop constraint if exists site_settings_background_overlay_check;
alter table public.site_settings add constraint site_settings_background_overlay_check
  check (background_overlay_percent between 30 and 95);
alter table public.site_settings drop constraint if exists site_settings_background_solid_color_check;
alter table public.site_settings add constraint site_settings_background_solid_color_check
  check (background_solid_color ~ '^#[0-9a-fA-F]{6}$');
alter table public.site_settings drop constraint if exists site_settings_background_image_url_check;
alter table public.site_settings add constraint site_settings_background_image_url_check
  check (background_image_url is null or (
     background_image_url ~ '^https://ryqcfojzdncrshinlpue[.]supabase[.]co/storage/v1/object/public/bakery-backgrounds/[0-9a-f-]+[.](jpg|png|webp)$'
  ));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('bakery-backgrounds','bakery-backgrounds',true,5242880,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do update set public=true,file_size_limit=5242880,
 allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "bakery management upload website backgrounds" on storage.objects;
create policy "bakery management upload website backgrounds"
 on storage.objects for insert to authenticated
 with check(bucket_id='bakery-backgrounds' and
    exists(select 1 from public.staff_roles s
      where s.user_id=(select auth.uid()) and s.role in ('owner','admin'))
    and private.bakery_account_active());
-- Version 1 uploads use unique filenames with upsert=false. No update/delete policy is
-- needed for browsers and no other account can upload or replace the published image.
