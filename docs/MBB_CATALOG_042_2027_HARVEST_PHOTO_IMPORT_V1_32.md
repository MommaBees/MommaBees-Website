# Homestand Harvest WebP Conversion and Photo Bulk Upload

**Document ID:** MBB-CATALOG-042  
**Project:** MommaBee Bakery&Farmstand  
**Version:** 1.32  
**Date:** 2026-10-27  
**Status:** Engineering implementation; CI and deployment to be verified  
**Filename:** `docs/MBB_CATALOG_042_2027_HARVEST_PHOTO_IMPORT_V1_32.md`  
**Type:** Markdown  
**Google Drive folder:** Not established. Canonical source is `MommaBees/MommaBees-Website`, `main`.

## Owner source
11 uploaded JPEG photographs: Broccoli, Cauliflower, Cherry tomatoes, Green Beans, Jalapenos, Mini Green Peppers, Salad Cucumbers, Spineless Okra (uploaded as Spineless_Orka), Tomatos, Yellow Summer Squash and Zucchini.

Converted source files to WebP (quality 82) preserving natural aspect ratio; generated 440×440 cropped WebP store cards (quality 76), and a contact sheet and ZIP bundle in the conversation. No original has been overwritten or watermarks erased.

## Site workflow
- Added nine missing vegetable catalog varieties and matching active Homestand showcase entries, retaining the existing Green Beans and Blackberries, without prices, products or stock.
- Admin → Products & Inventory → Store Showcase Items → Bulk Upload Homestand Harvest Photos. Accept JPG/PNG/WebP files and match slugs from filenames.
- Files must be selected from `store-cards/` in the prepared ZIP, or individual image conversions from `full/`. Existing showcase photos update in place, no duplicates and no published transaction records.
- Reject unknown, duplicate and "cherry-tomatoes" file patterns; display status and skipped list clearly. Cherry Tomatoes has visible Alamy watermarks and requires license before using the image on the public storefront.
- Uploaded photos are stored in the existing `product-photos` bucket. Showcase public cards dynamically use `photo_url`.
- Review owners' rights to publish the other photographs before uploading. These visuals are for planned future harvest offerings; their presence never implies actual inventory or price.

## Dependencies
Supabase public.catalog_varieties/public.store_showcase_items; site/admin.js; site/harvest-photo-import.js; site/api.js upload() and existing public product-photos storage RLS. Only MommaBees project/account. No stock-market accounts.

## Acceptance
Check seed counts, filename mapping, rejection of cherry-tomatoes, uploader role gate, no duplicate matching, static sources, GitHub CI and Cloudflare deployment. Browser owner upload and visual QA is pending until images are uploaded to Supabase.

## Revision
v1.32 · 2026-10-27 · Harvest image conversion and bulk upload preparation.

**Footer:** MommaBee Bakery&Farmstand · MBB-CATALOG-042 · v1.32 · GitHub main
