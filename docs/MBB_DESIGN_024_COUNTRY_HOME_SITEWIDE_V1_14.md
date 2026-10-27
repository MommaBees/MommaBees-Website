# Mamma Bee's Bakery — Country Home Site-Wide Visual Update

**Document ID:** MBB-DESIGN-024  
**Project:** Mamma Bee's Bakery, Nixa, Missouri  
**Version:** 1.14 — Country Home visual iteration 2  
**File type:** Markdown (.md)  
**Filename:** `MBB_DESIGN_024_COUNTRY_HOME_SITEWIDE_V1_14.md`  
**GitHub location:** `MommaBees/MommaBees-Website` / `main` / `docs/`  
**Google Drive location:** Not configured. GitHub is the controlled project record.  
**Date:** October 26, 2026  
**Status:** Implementation complete; source regression checks passed; authenticated device-level browser sign-off pending  
**Purpose:** Update existing functional pages—not produce an unimplemented mockup—to a cohesive rustic Missouri country-bakery appearance.  
**Dependencies:** Existing HTML/CSS/ES modules, Owner-selected site background, live Supabase catalog, role permissions, Cloudflare Pages deployment, Stripe test/production protections.

## Owner-approved direction

Mamma Bee's Bakery should look like a genuine, personal home bakery: natural food photographs and actual past bakes, restrained warm wood and honey accents, linen/cream paper surfaces, classic serif headlines, welcoming copy, legible forms, and simple navigation. Avoid generic app cards, overproduced decorations, fabricated testimonials, fake pricing/inventory and text stickers on product images.

**Approved slogan:** Rooted in Faith. Made with Love. Shared with Joy.

## Implemented pages

| Page | Design implementation | Functional control retained |
|---|---|---|
| Home | Country values strip, prominent real past-bake hero when configured, welcoming kitchen-note feature, practical paths to Ready, Preorder, Past Bakes and Contact; suppress truly empty category/featured sections | Only active categories with actual eligible products; sample-only items still clearly marked and not a sale promise |
| Shop All | Natural paper storefront, ivory photo cards and strong category navigation | Actual published eligible products, safe sample-only examples |
| Ready to Sell | Sage-toned visual distinction, dedicated explanatory hero and actual ready inventory filters | Stock quantities, cutoff eligibility and valid fulfillment dates |
| Preorder | Warm clay-toned hero, separate made-to-order product experience | Baking calendar, lead times and inventory/capacity checks |
| Product Details | Better photo presentation, clear price, natural order options and legible allergens | Real product data, selectable ready/preorder method, reviews and photos |
| Cart | Bakery-basket introduction, uncluttered order lines and totals | Original cart records and checkout transition |
| Checkout | Practical two-column entry and order-summary panel, highlighted dates and readable forms | Guest checkout, Stripe, pay-at-pickup, CAPTCHA, promotional controls and unavailable-date rule |
| Account and Sign In | Welcoming bakery copy and paper-field forms | Username/email sign-in, profile controls and private messages |
| Customer Messages | Recipe-card styled conversations and grouped replies | Private access, photos, subject selection and attachments |
| Past Bakes Gallery | Natural photograph grid and the established Past Bakes Gallery title | Owner photos; no purchase links on past bakes |
| Contact & Custom Orders | Personal introduction and warm request form | Requests remain inquiries, not an automatic commitment to bake |
| FAQ & Policies | Quiet reading layout with stronger section spacing | Existing terms and food-safety wording unchanged |
| Order Success/Tracking | Clear status-focused paper layout | Stripe webhook still authoritative; no false payment confirmation |
| QR Code | Printable paper board styling | Existing SVG/PNG/Print QR tools remain active |
| Admin Center | Warm but restrained back-office shell, clearer tables and dense controls | All existing role/permissions, products, calendar, orders, finances and messaging behavior untouched |

## Assets and implementation

- New stylesheet: `site/country-home-v2.css` (loaded **after** the original `site/styles.css`).
- Updated HTML: `site/index.html` includes the stylesheet.
- Public routes, home layout, breadcrumbs, footer and copy: `site/app.js`.
- Welcome and account text: `site/account.js`.
- Checkout copy only: `site/checkout-form.js`.
- Admin header copy only: `site/admin.js`.
- Automated regression tests: `tests/source.test.js`.
- No service keys or payment configuration were added, and no database migration was required.
- Owner-controlled background presets, uploads and settings remain unchanged and continue to apply behind the lighter page content.

## Accessibility and responsive standards

- Responsive CSS at 1190, 850, 760 and 530 pixels.
- More useful mobile menu tap targets, two-column-to-single-column card transitions and no clipped customer forms.
- Focus-visible outlines, reduced-motion preference and print styles retained.
- Gallery and product photographs have constrained ratios to avoid oversized hero-style cards.
- Admin tables remain horizontally scrollable instead of forcing unreadable squeezed columns.
- Human visual/browser QA is still needed on representative screen widths, especially 390px, 768px and 1440px.

## Acceptance

- [x] Actual site code modified on `main`, not a design-only plan.
- [x] Styling covers all named customer-facing screens, account, checkout and Admin.
- [x] Established gallery name, slogan, background controls and user permissions preserved.
- [x] Real transaction, inventory, account and role logic not changed.
- [x] Automated regression coverage includes responsive rules and page-specific selectors.
- [x] Existing source tests passed after the new visuals were introduced.
- [ ] Independent visual acceptance for mobile, tablet and desktop.
- [ ] Authenticated journey testing (customer, Owner, Admin) after design update.
- [ ] Final photograph-by-photograph review at native resolution.

## Revision history

| Date | Version | Change | Status |
|---|---|---|---|
| 2026-10-26 | 1.14 | Applied rustic Country Home visuals to entire working bakery site | Source checks passed; visual/browser review pending |

**Footer:** Mamma Bee's Bakery · MBB-DESIGN-024 · Version 1.14 · GitHub-controlled
