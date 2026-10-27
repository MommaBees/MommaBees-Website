# Mamma Bee's Bakery — Stock Photography and Shop Navigation Separation

**Project:** Mamma Bee's Bakery, Nixa, Missouri  
**Document ID:** MBB-SHOP-020  
**Version:** 1.10  
**Date:** October 27, 2026  
**Filename:** `docs/STOCK_PHOTOS_SHOP_NAVIGATION_V1_10.md`  
**File type:** Markdown  
**Google Drive location:** Not established. Controlled source stored in GitHub.  
**GitHub location:** `MommaBees/MommaBees-Website` → `main` → `docs/`  
**Status:** Code implemented, CI checks passed; authenticated browser image and navigation acceptance still required  
**Purpose:** Keep public shop views unambiguous and stock photography truthful, reliable and restricted to appropriate uses.  
**Dependencies:** Cloudflare Pages `mommabees-website`, Supabase `ryqcfojzdncrshinlpue`, Owner/Admin staff role, Stripe MommaBeesBakery test catalog.

## What was corrected

Owner supplied a screenshot showing broken cookie/pie/brownie sample images and a six-item sandbox showcase repeated beneath normal shop views. The sample showcase made **Shop All**, **Ready to Sell** and **Preorder** appear nearly identical.

### Distinct public storefront pages

- **Shop All** (`#shop`) contains all published, currently available products regardless of availability mode.
- **Ready to Sell** (`#ready`) contains only published products with ready-stock batches and eligible fulfillment.
- **Preorder** (`#preorder`) contains only products with preorder capability and an available future baking date.
- Each page now has a separate heading, descriptive copy, stock-photo category banner, selected navigation state, item count, and an appropriate no-items explanation.
- Category and subcategory filters continue to show only types with products actually eligible for sale.
- **There were zero real published products at implementation time.** Therefore all three public views correctly display a different informational empty-state rather than fabricated saleable goods. Different actual item sets will appear only after genuine products and inventory/calendar dates are published.

### Private staff sandbox shop

The six demonstration products have been removed from public shop rendering and live only at `#sandbox-store`. That route:
- Requires a verified Owner/Admin session and `demo_store_enabled=true`.
- Presents **All Test Products**, **Ready-to-Sell Examples**, and **Preorder Examples** as separate filters.
- Shows six sample items in All, three in Ready, and four in Preorder (Chocolate Chip Cookies is in both groups for demonstration purposes).
- Uses the existing test-only Stripe checkout; the private items remain distinct from live products, inventory, orders, taxes, and revenue.
- Shows a subtle explicit stock-photo/sample disclaimer to avoid misrepresenting test products as Mamma Bee's own baked items.

### Licensed stock photography

The new `site/stock-photography.js` contains fixed image URLs from the Unsplash photography CDN, categorized as Cookies, Cakes, Pies, Cheesecakes, Pastries, Bars & Brownies, and Breads. Test items map to relevant category stock images.

The stock-photo source material is used for presentation and illustration; it does not imply that the bakery has produced, sells, or stocks the photographed exact product. Bakery-owned photos remain reserved for the Past Bakes Gallery and actual uploaded product photos.

**Licensing reference:** https://unsplash.com/license  
**Unsplash commercial-use explanation:** https://help.unsplash.com/en/articles/2612315-can-i-use-unsplash-images-for-personal-or-commercial-projects

Because these are third-party CDN photographs, delivery may depend on the photo host. The site now catches failed image loads and substitutes an accessible, styled message instead of showing a browser broken-image icon. Browser-level verification of all remote images remains outstanding; the CI checks are source/integration checks, not a guarantee that a third-party image URL will always resolve.

## Design and implementation control

- `site/app.js`: separate route renderers and image-failure handling.
- `site/stock-photography.js`: curated stock references and sample mode mapping.
- `site/styles.css`: distinct storefront hero treatments, active tabs, smaller photography and mobile layout.
- `tests/source.test.js`: checks that demo samples do not leak into public shop and that sample filtering is distinct.

## Acceptance gates

- [x] Customer routes separated from private demo route
- [x] Six samples mapped to six distinct product-type stock-photo sources
- [x] Category image fallback uses fixed source URLs when Owner has not uploaded an image
- [x] Selected tabs, distinct headings, and item counts added
- [x] Private sample filters differ between ready, preorder, all
- [x] Accessibility and graceful broken-image fallback implemented
- [x] Github source tests passed on main
- [x] Cloudflare Pages deployment confirmed on main
- [ ] Owner-signed-in desktop/mobile browser inspection, including photographs
- [ ] Add/publish real inventory; then test live Shop All versus Ready and Preorder membership
- [ ] Verify sample Stripe test-checkout result and webhook separately (live payments remain disabled)

## Revision history

| Date | Version | Change | Status |
|---|---|---|---|
| 2026-10-27 | 1.10 | Stock category and demo imagery; isolated Owner/Admin sample shop; distinct public shop views and item counts | Deployed; browser acceptance pending |

**Footer:** Mamma Bee's Bakery · MBB-SHOP-020 · v1.10 · GitHub source controlled
