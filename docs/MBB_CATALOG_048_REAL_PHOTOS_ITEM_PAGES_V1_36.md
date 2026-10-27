# Individual WebP Product Photographs and Clickable Catalog Pages

**Document ID:** MBB-CATALOG-048  
**Project:** MommaBee Bakery&Farmstand · MommaBees  
**Version:** 1.36  
**Date:** 2026-10-27  
**Status:** Release verification pending  
**Filename:** `docs/MBB_CATALOG_048_REAL_PHOTOS_ITEM_PAGES_V1_36.md`  
**File Type:** Markdown  
**Google Drive:** Not established; canonical source in `MommaBees/MommaBees-Website`, branch `main`.

## Owner requirements
Replace the blurred harvest collage and emoji or fake photography with each exact owner-supplied photo, without repeating a photo on a different product. Make each card on the split Bakery/Homestand homepage and departmental store link to an individual page for that particular item.

## Media implementation
- 19 individual WebP images compiled from the latest uploaded original files (8 Bakery, 11 Homestand). Each filename matches its associated slug. Images retain original aspect ratio; quality optimized without enlarging the original image. Original uploads preserved outside the repo.
- Public Cloudflare Pages static URLs: `/assets/showcase/<slug>.webp`, no sprite, repeated image, emoji stand-in, or artificial upscaling.
- The visible Alamy-watermarked Cherry Tomatoes photo is withheld pending documented publication rights. No second tomato item was created from it.
- Some sources (Salad Cucumbers, Okra and Yellow Summer Squash) were uploaded at approximately 183-225 px width; those do not have high-definition detail to recover. The site uses the full source resolution and `object-fit:contain` for larger item-page imagery.
- The exact image is shown on its homepage card, department page and individual item page; reasonable repetition for the *same* item is expected.

## Catalog implementation
- Existing 15 showcase choices receive their matching photos; add 4 requested Bakery cookies: Chocolate Chip Cookies, Meringue Cookies, Old-Fashioned Oatmeal Cookies and Pecan Dreams. Result: 19 distinct browsable items, no duplicate gallery records.
- Customer links route to `#product/<showcase-slug>`. The pre-existing `#product/<UUID>` transactional detail route remains functional. Product item pages display exact photo, title, department/category, and links to the appropriate department and similar offerings.
- Bakery copy: Homemade at MommaBee Bakery&Farmstand. Homestand copy: Homegrown without chemical sprays, per Owner statement. No claim of USDA Certified Organic was fabricated.
- No unprovided price, weight, stock quantity, ingredient list, shipping, or payment entitlement was invented. Product pages are descriptive showcases; actual sale still requires a complete reviewed `public.products` record and real availability.
- Supabase `public.store_showcase_items` remains the public catalog source; no Stripe changes and no stock-market-account resources.

## Acceptance
Validate 19 matching Git binary blobs, 19 Supabase `photo_url` mappings, four newly seeded cookie types, no visible legacy sprite URL on product records, click navigation and no price/cart on showcase pages, mobile accessibility, GitHub tests and successful MommaBees Cloudflare Pages production deployment. Authenticated browser review is separate.

## Revision History
v1.36 (2026-10-27): Real individual images and pages, replacing the compressed collage.

**Footer:** MBB-CATALOG-048 · v1.36 · MommaBees GitHub main
