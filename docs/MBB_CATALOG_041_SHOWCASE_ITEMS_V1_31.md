# Bakery and Homestand Showcase Items

**Document ID:** MBB-CATALOG-041
**Version:** 1.31
**Date:** 2026-10-27
**Project:** MommaBee Bakery&Farmstand — MommaBees Website
**Status:** Development release, automated and Cloudflare acceptance tracked separately
**Filename:** `docs/MBB_CATALOG_041_SHOWCASE_ITEMS_V1_31.md`
**File type:** Markdown
**Google Drive folder:** Not established. Controlling source: `MommaBees/MommaBees-Website` main.

## Owner request
Populate split-store homepage and store department catalogs to demonstrate the storefront without introducing customer-facing warning ribbons or filler text. Use the Owner's six previously supplied item paths, rather than inventing product types or prices.

## Six first-party showcase selections
- Bakery / Pies / Creme / Banana → Banana Creme Pie
- Bakery / Breads / Cinnamon Swirl → Cinnamon Swirl Bread
- Bakery / Cookies / Butter Cookies / Dream Cookie (drömmar)
- Bakery / Cookies / Holiday / Ginger Bread
- Homestand / Vegetables / Green Beans
- Homestand / Fruits / Blackberries

These are separate visual catalog entries, displayed as clean cards with department, variety name and appropriate simple illustrative icon where an exact owner-owned photograph is not on file. They do **not** create transactional product records, set prices, claim stock or activate checkout. No customer-facing “not for sale” banners are appended to those showcase cards. No unrelated photographs are passed off as these items. Owners can later supply exact photos through the Admin form.

## Behavior
With split mode enabled, the home sections show verified published/available products when present, filling remaining slots with catalog showcase entries without duplication. Department Shop All similarly displays showcase cards alongside true product inventory and keeps Shop Ready/Preorder restricted to real sellable items. Existing real products and Stripe synchronization remain unchanged. Combined mode keeps the previously approved original behavior. Admin gets a Store Showcase Items manager to edit, hide or replace the six entries without GitHub edits.

## Database governance
`public.store_showcase_items` uses constrained department and matching category/subcategory/variety hierarchy, publicly readable active entries, staff-only writes, and no Stripe product or price fields. Existing checkout still operates only against `public.products`.

## Acceptance
Validate 4 Bakery + 2 Homestand seed entries, RLS policy, staff editor, public homepage desktop/mobile, department pages, no invented price, ordinary checkout unable to accept showcase items, and completed CI/Cloudflare deploy.

**Footer:** MommaBee Bakery&Farmstand · MBB-CATALOG-041 · v1.31 · GitHub main
