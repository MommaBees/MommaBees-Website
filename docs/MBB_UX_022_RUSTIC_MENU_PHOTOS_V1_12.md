# Mamma Bee's Bakery — Rustic Sample Menu and Locally Hosted Food Photography

**Document ID:** MBB-UX-022  
**Project:** Mamma Bee's Bakery, Nixa, Missouri  
**Filename:** `docs/MBB_UX_022_RUSTIC_MENU_PHOTOS_V1_12.md`  
**File type:** Markdown  
**Version:** 1.12  
**Created:** October 26, 2026 (America/Chicago)  
**Status:** Implemented and deployed; authenticated desktop/mobile visual inspection pending  
**Google Drive location:** Not established  
**Controlled GitHub location:** `MommaBees/MommaBees-Website` → `main` → `docs/`  
**Purpose:** Record actual image deployment, separate page-specific example menus, authentic bakery design language, and safeguards against misrepresenting inventory.  
**Dependencies:** Cloudflare Pages `mommabees-website.pages.dev`, authorized MommaBees GitHub account, MommaBees Supabase, Stripe MommaBeesBakery sandbox.

## Issue corrected

The store previously used third-party Unsplash/Wikimedia image URLs that failed to render. Simply generating new photographs within ChatGPT did not publish them in the site. The actual file assets were therefore uploaded as Git blobs to the bakery GitHub repository and included under the Pages static output folder.

## Images actually present in GitHub

| Menu image | Repository path | Display use |
|---|---|---|
| Chocolate chip cookies | `site/assets/demo/chocolate-chip-cookies.webp` | Shop All, Ready to Sell, Cookies |
| Homemade apple pie | `site/assets/demo/apple-pie.webp` | Shop All, Preorder, Pies |
| Frosted cinnamon rolls | `site/assets/demo/cinnamon-rolls.webp` | Shop All, Ready to Sell, Pastries |
| Box of brownies | `site/assets/demo/brownie-box.webp` | Shop All, Ready to Sell, Bars & Brownies |
| Strawberry cake | `site/assets/demo/strawberry-cake.webp` | Cakes category, Preorder hero |
| Caramel pecan cheesecake | `site/assets/demo/caramel-pecan-cheesecake.webp` | Shop All, Preorder, Cheesecakes |

**Image provenance:** The six photos are AI-generated *illustrative artwork*, produced for the bakery's website concept. They are not photographs of the bakery's real products. All example cards disclose this. The Carrot Cake example card can use a prior owner-supplied real bakery photo with a distinct prior-bake description. Do not claim these images prove that an item exists or was baked by Mamma Bee.

**Image resolution:** Initial optimized WebP listing thumbnails were uploaded at 180 × 135 pixels to keep the repository transfer practical. Higher-resolution exports should replace them before final production photography acceptance; enlarging thumbnails does not restore photographic detail. Original generated PNG source images remain in the creation conversation but are not public site assets.

## Page-specific example selection

- **Shop All:** Chocolate Chip Cookies, Cinnamon Rolls, Brownie Box, Apple Pie, Carrot Cake, Classic Cheesecake.
- **Ready to Sell:** Chocolate Chip Cookies, Cinnamon Rolls, Brownie Box.
- **Preorder:** Apple Pie, Carrot Cake, Classic Cheesecake.
- The ready and preorder example groups do not overlap.
- Product-type categories and their hero pictures draw from the same local image paths. No live external image lookup is required.

## Customer and staff separation

- Example cards appear publicly only when there are no real products for the requested storefront view and website's example-display preference is enabled.
- Public visitor sample cards do **not** have prices, Add to Cart, Stripe Checkout, reservations, or purchase controls.
- Owner/Admin can see test prices and **Try Test Checkout** buttons for the six enabled demo records, with a clear `TEST MODE · NOT REAL INVENTORY` marker. They run only against the existing Stripe sandbox.
- Actual real product inventory remains controlled by Supabase and established baking-day cutoffs.
- Neither samples nor illustrations constitute an automatic promise to bake.

## Visual identity

- **Brand:** Mamma Bee's Bakery
- **Approved slogan:** Rooted in Faith. Made with Love. Shared with Joy.
- **Style:** warm Missouri country farmhouse; aged wood, paper, linen, sunlight, readable serif headings, restrained decorations, naturally smaller product images, personal human copy.
- **Sample card title:** A Few Favorites for the Baking List.
- **Handwritten-style note:** Baking days are special around here. Check the calendar when the next batch is announced.
- Avoid distracting decorative flourishes, oversized hero/product images, and false claims that generated pictures are genuine bakery photographs.

## Acceptance

- [x] Six actual WebP binary assets uploaded to the correct MommaBees GitHub `main` branch.
- [x] Source image mapping changed from external URLs to internal file URLs.
- [x] Separate Shop All, Ready to Sell, and Preorder samples.
- [x] Public examples cannot be purchased.
- [x] Owner/Admin Stripe sandbox remains separate from real checkout and inventory.
- [x] UI copy and product-card styling redesigned toward personal country bakery character.
- [x] Automated source and asset checks passed on GitHub.
- [x] Cloudflare Pages reported successful deployment.
- [ ] Actual authenticated browser check at mobile/tablet/desktop to confirm photographs visually load and layout behaves correctly.
- [ ] Replace small optimized previews with full-resolution bakery-owned photos or approved illustrative assets before final photography acceptance.

## Revision history

| Date | Version | Change | Status |
|---|---|---|---|
| 2026-10-26 | 1.12 | Uploaded local food imagery, differentiated shop modes, added display-only examples and personalized country styling | CI/deployed; browser acceptance pending |

**Footer:** Mamma Bee's Bakery · MBB-UX-022 · Version 1.12 · GitHub controlled.
