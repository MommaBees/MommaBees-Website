# Compact Sitewide Width and Spacing
**Document ID:** MBB-UI-055
**Project:** Mommy Bee Farmstand and Bakery (MommaBees Website)
**Version:** 1.42
**Status:** Engineering implementation; production and responsive acceptance tracked separately
**Date:** October 27, 2026
**Filename:** `docs/MBB_UI_055_COMPACT_SITE_WIDTHS_V1_42.md`
**File type:** Markdown
**Google Drive location:** Not established; GitHub `MommaBees/MommaBees-Website` `main` is the controlling source.
**Purpose:** Tighten the layout of My Bakery Account and customer-facing pages without reducing minimum control sizes.

## Design specification
- Default Medium main-content maximum: 1,480px instead of 1,700px. Existing Website Size choices remain effective: Extra Small 1,160px, Small 1,320px, Medium 1,480px, Large 1,660px.
- Signed-in My Bakery Account: narrower main and a centered content area of up to 1,010px at Medium; two concise panels on desktop, a single panel on smaller screens; address fields use one column inside a panel to prevent squeezed controls.
- Checkout: up to 1,310px at Medium. Contact, FAQ and QR: up to 1,130px. Cart, tracking and status: up to 1,140px. Product details: up to 1,370px. Gallery: up to 1,500px. Admin: main maximum plus 110px for operational tables.
- Moderately reduce vertical section margins, card padding and form spacing; retain accessible minimum input and button heights.
- Responsive screens use available width without introducing horizontal scrolling. Homepage carousel, independent sizing and its transition logic are unchanged; existing Bakery/Homestand product grid column and item-count controls remain unchanged.
- No data, authentication, payment or product schema changes.

## Files and checks
**Source:** `site/country-home-v2.css`, `tests/source.test.js`.
**Dependencies:** `site/website-size.js`, `site/app.js`, previous MBB-UI-052 configurable homepage grids.
**Acceptance:** source tests; CI commit-specific pass; Cloudflare deployment SHA; manual mobile and desktop verification.
**Revision history:** v1.42 (2026-10-27) — sitewide narrower content rails and account-specific compact spacing.
**Footer:** MBB-UI-055 · v1.42 · MommaBees main.
