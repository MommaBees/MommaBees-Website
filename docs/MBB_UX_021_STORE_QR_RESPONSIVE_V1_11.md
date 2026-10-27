# Mamma Bee's Bakery — Regular Storefront, QR Code and Responsive Layout

**Document ID:** MBB-UX-021  
**Project:** Mamma Bee's Bakery — Nixa, Missouri  
**Version:** 1.11  
**Status:** Implemented and CI verified; actual phone/tablet browser acceptance pending  
**Created:** October 27, 2026  
**Filename:** `docs/MBB_UX_021_STORE_QR_RESPONSIVE_V1_11.md`  
**File type:** Markdown (.md)  
**Google Drive location:** Not configured; controlled source stored in GitHub  
**GitHub:** `MommaBees/MommaBees-Website` → branch `main` → folder `docs/`  
**Purpose:** Ensure one ordinary storefront supports both real products and Owner/Admin-only test products, with a scannable permanent homepage QR and full responsive layout.  
**Dependencies:** MommaBees Cloudflare Pages, authenticated Owner/Admin, Supabase project `ryqcfojzdncrshinlpue`, existing Stripe test product catalog.

## Owner decisions

- Remove **Missouri Prairie Roots ·** from the visible top banner; keep **Faith · Family · Homemade Goodness**.
- Keep the approved slogan **Rooted in Faith. Made with Love. Shared with Joy.**
- Do **not** use a distinct Sandbox Store navigation destination.
- Use the actual shop navigation for staff-only illustrative/test products while keeping them unavailable to ordinary customers.
- Add a homepage QR code downloadable/printable for bake fairs, packaging and flyers.
- Make desktop, tablet and mobile layouts occupy substantially more of the viewport while preserving readable text, comfortable touch controls and responsive cards.

## One ordinary shopping interface

The public menu has **Shop All**, **Ready to Sell**, **Preorder**, and normal account/navigation choices. No separate Sandbox Store menu or active sandbox shop renderer remains. Old `#sandbox-store` bookmarks redirect to `#shop`.

For every visitor:
- Real published products appear only when eligible for the particular mode (real inventory, baking days and checkout rules).
- Categories without available real products remain automatically hidden.
- Customers cannot access test product checkout because sample records are not served by customer catalog RLS and server-side checkout requires Owner/Admin staff access.

For authenticated Owner/Admin accounts with `demo_store_enabled=true`:
- Sample test cards appear inside the **ordinary Shop All, Ready to Sell and Preorder** pages, below the real-product section.
- Six test items appear in All, three ready examples and four preorder examples; some items may be applicable to both examples.
- Owner/Admin-only sample categories may also appear on the home page to facilitate category-navigation testing.
- The cards remain visibly marked test mode, and Stripe payments remain sandbox-only.

The business currently has **zero published real products** in Supabase. Customer-facing product listings remain empty rather than being falsely represented as stocked bakery products. To populate customer-ready listings, the Owner/Admin must publish actual products with valid inventory or preorder fulfillment dates.

## Permanent homepage QR code

**URL encoded in QR:** `https://mommabees-website.pages.dev/`

- Created offline with error correction M and validated by independent QR decoding before implementation.
- Encoded module data stored locally in `site/qr-code.js` — no external QR-code service or customer tracking.
- Always visible as a small scannable code in the website footer.
- Dedicated page: `https://mommabees-website.pages.dev/#qr`.
- Download as SVG or PNG; **Print / Save as PDF** opens the browser print function. Use the print dialog's **Save as PDF** option for a PDF file.
- On mobile, printable QR section stacks the image and explanation vertically.

## Full-display and responsive design

- Desktop: main content up to 1,760 pixels wide, with responsive page gutters rather than the prior narrow 1,200-pixel shell.
- Tablet: two-column cards, smaller side framing, compressed Admin sidebar, responsive headers and scrollable tables.
- Phone: single-column product cards at narrow widths, button-accessible collapsible menu, appropriate minimum touch-target size and background details removed where they interfere.
- Small screens are protected from horizontal overflow; the Admin sidebar can scroll horizontally; the footer QR stays accessible.
- Preserves Missouri country rustic visual direction and real food photos, with reduced product-photo heights.
- `@media print` isolates the QR sheet from navigation and decorative framing.

## Database repair

The previously pending `supabase/migrations/20261026_category_subcategory_image_presets.sql` migration was successfully applied in the authorized **MommaBees** Supabase project. Database inspection confirmed **48 subcategories** and the previously missing public table is now present. The corresponding Admin subcategory editor no longer points at a nonexistent table. Authenticated editing should still be checked in a browser.

## Verified code paths

- `site/app.js`: navigation, inline staff-only test cards, homepage categories, QR route/footer, mobile menu events.
- `site/qr-code.js`: offline QR, SVG/PNG downloads and printing.
- `site/styles.css`: full-width, phone/tablet styles and printable QR.
- `tests/source.test.js`: staff-only test isolation, QR and responsive source tests.
- `supabase/migrations/20261026_category_subcategory_image_presets.sql`: applied migration.

## Testing/acceptance status

- [x] GitHub main branch updated.
- [x] Supabase category migration applied; 48 subcategories present.
- [x] Separate Sandbox Store menu and renderer removed.
- [x] Sample products visible in ordinary shop only to verified Owner/Admin sessions.
- [x] Home-page QR generated and independently validated offline.
- [x] SVG, PNG and print-to-PDF user actions implemented.
- [x] Unwanted **Missouri Prairie Roots** phrase removed from public header.
- [x] Full-width responsive stylesheet and accessible mobile menu added.
- [x] Source regression suite passed.
- [ ] Final phone/tablet real-browser visual and interaction QA at 390px, 768px and 1280px.
- [ ] Owner/Admin authenticated UI walkthrough: sample products, categories, checkout, QR scan and downloaded file.
- [ ] Actual customer product listings require real products and available baking dates.
- [ ] Stripe test checkout/webhook end-to-end verification remains separate. LIVE payments disabled.

## Revision history

| Date | Version | Change |
|---|---|---|
| 2026-10-27 | 1.11 | One staff-test-enabled storefront, permanent home QR, Missouri banner edit, category migration repair and responsive full-screen layout |

**Footer:** Mamma Bee's Bakery · MBB-UX-021 · v1.11 · GitHub-controlled
