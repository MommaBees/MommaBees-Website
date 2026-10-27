-- MBB-BRAND-025 v1.15: Owner-selected original watercolor chickens house-style
-- Constrained extension of allowed presets. Existing photo uploads remain supported.
begin;
alter table public.site_settings drop constraint if exists site_settings_background_style_check;
alter table public.site_settings add constraint site_settings_background_style_check
 check (background_style = any (array['chickens','prairie_doors','barnwood','linen','solid','photo']));
update public.site_settings
 set background_enabled=true, background_style='chickens', background_overlay_percent=35, background_position='center'
 where id=1;
commit;
