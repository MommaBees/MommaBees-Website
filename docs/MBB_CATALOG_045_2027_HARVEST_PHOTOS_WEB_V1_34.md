# Homestand Harvest Original-Image Website Placement
**Document ID:** MBB-CATALOG-045 · **Version:** 1.34 · **Date:** 2026-10-27  
**Status:** Deployment verification pending · **Project:** MommaBee Bakery&Farmstand  
**Filename:** `docs/MBB_CATALOG_045_2027_HARVEST_PHOTOS_WEB_V1_34.md`  
**Location:** GitHub `MommaBees/MommaBees-Website`, branch `main`; Google Drive not established.

A compact 5-by-2 WebP sprite made from the Owner's **original** uploaded photographs is deployed under `site/assets/harvest-2027-sprite.webp`, not stock or synthetic images. Exact crop order is Broccoli, Cauliflower, Green Beans, Jalapeños, Mini Green Peppers, Salad Cucumbers, Spineless Okra, Tomatoes, Yellow Summer Squash, Zucchini. The watermarked Alamy cherry-tomato image is **excluded**.

Matching `public.store_showcase_items.photo_url` fields are set to an exact image sprite URL plus category slug only when previously NULL. Storefront cards and carousel display the correct photographic crop through `site/harvest-sprite.js` while retaining existing full-photo upload as override. Full-resolution conversion archive provided earlier can replace compressed preview crops using the Admin bulk photo upload.

**Limitations:** 48-pixel square crops are intentionally lightweight temporary previews; high-quality full WebP sources should replace them before marketing screenshots or commercial launch. Bakery showcase cards without matching actual photos show text-only layouts, not generated icons. No store product, inventory, checkout, Stripe or paid order is changed.

**Acceptance:** audit sprite Git SHA matches locally converted asset; confirm 10 rows mapped; website CI success; Cloudflare production successful; visual desktop and mobile review pending.
