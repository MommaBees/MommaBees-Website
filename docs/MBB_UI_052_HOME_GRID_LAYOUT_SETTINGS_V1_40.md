# Homepage Product Grid Layout Settings

**Document ID:** MBB-UI-052
**Project:** Mommy Bee Farmstand and Bakery · MommaBees Website
**Version:** 1.40
**Status:** Engineering implementation; live browser acceptance remains separate
**Date:** 2026-10-27
**Filename:** `docs/MBB_UI_052_HOME_GRID_LAYOUT_SETTINGS_V1_40.md`
**File type:** Markdown
**Google Drive location:** Not established. GitHub `MommaBees/MommaBees-Website` main is the controlling repository.
**Purpose:** Configure homepage grid dimensions independently for both-visible and one-visible modes.

## Specification
- **Both enabled:** Bakery and Homestand each display up to 9 eligible product cards in 3 columns × 3 rows, in side-by-side panels on wide screens.
- **One enabled:** The selected department displays up to 10 eligible product cards in 5 columns × 2 rows.
- **Neither enabled:** No department panels. With Split Store disabled, existing unified homepage remains unchanged.
- **Admin:** Website & Design → Store Display retains the Show Bakery and Show Homestand switches and adds columns and rows for both-enabled and one-enabled modes (whole numbers 1–6).
- **Data:** Display only actual sellable products and active Product Showcase records, without fabricated items. Product visibility and all commerce logic are unchanged.
- **Responsive:** Fewer columns on narrower screens; item counts do not change. Homepage carousel remains untouched.

## Implementation and acceptance
**Dependency:** `public.site_settings` schema migration `supabase/migrations/20261027_home_grid_layout_v140.sql`; existing split store visibility and showcase settings.

**Files:** `site/store-departments.js`, `site/app.js`, `site/admin.js`, `site/country-home-v2.css`, `tests/source.test.js`.

**Acceptance:** Source tests, MommaBees Supabase column verification, GitHub main CI, Cloudflare deployment verification, responsive browser and authenticated Admin save testing.

## Revision history
| Version | Date | Change |
|---|---|---|
| 1.40 | 2026-10-27 | Independent configurable 3×3 and 5×2 homepage display modes |

**Footer:** MBB-UI-052 · v1.40 · Controlled in MommaBees GitHub main.
