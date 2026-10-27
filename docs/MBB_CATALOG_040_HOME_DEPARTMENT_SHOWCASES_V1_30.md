# Split Store — Homepage Bakery/Homestand Showcases

**Document ID:** MBB-CATALOG-040
**Project:** MommaBees Website — MommaBee Bakery&Farmstand
**Version:** 1.30
**Status:** Engineering release; CI, Supabase and Cloudflare evidence verified separately
**Date:** October 27, 2026
**Filename:** `docs/MBB_CATALOG_040_HOME_DEPARTMENT_SHOWCASES_V1_30.md`
**File type:** Markdown
**Google Drive location:** Not established. GitHub `MommaBees/MommaBees-Website` `main` is the controlled source.
**Purpose:** When Split Store is enabled, show Bakery and Homestand product selections side by side on Home, with independent Admin-controlled visibility.

## Approved behavior
- **Split Store OFF:** Preserve the existing combined Home Shop by Category and Featured treats, with existing demo-only owner behavior.
- **Split Store ON:** Replace the combined category/featured components with separate Bakery and Homestand homepage showcases. Default both visible. Show the most relevant three real published and currently available products per department, with featured products first. No demonstration data is presented as sale inventory. Each section links to its complete departmental store.
- **Independent toggles:** Admin Center → Website & Design → Store Display → Show Bakery on homepage; Show Homestand on homepage. These change only homepage showcases and must not hide published product details, change checkout eligibility, or disable department store navigation.
- **Responsive:** Two equal columns on desktop; stack on mobile, and use one full-width column if only one homepage section is enabled.
- **No eligible products:** State that the department has no products available yet; do not insert fictitious products, mock inventory, prices or photographs. The current Supabase database had no actual product records during the initial implementation.
- Keep homepage carousel, Past Bakes gallery, policies, payment protections, and all existing carousel sizing/interval controls unchanged.

## Technical scope
`site_settings.home_bakery_visible` and `home_homestand_visible` are NOT NULL boolean fields default TRUE. Read on public homepage from existing settings. Write via the existing Owner/Admin-controlled site-settings update mechanism. Selection derives department from each product's category and uses the existing `sellable()` pipeline, which checks actual published availability. Pure helper `homepageStorefronts` selects and ranks up to three items per department. New CSS handles responsive cards and independent containers.

## Acceptance
Regression tests for both-on, either-off, both-off, combined-mode unchanged, no products, featured-first ranking, responsive layout, and Admin save fields. Inspect actual homepage desktop/mobile as a separate acceptance requirement. No Stripe charge or LIVE payment activity.

## Revision history
| Version | Date | Change |
|---|---|---|
| 1.30 | 2026-10-27 | Homepage department showcases and two independent show/hide controls |

**Footer:** MommaBee Bakery&Farmstand · MBB-CATALOG-040 · v1.30 · Controlled in GitHub main
