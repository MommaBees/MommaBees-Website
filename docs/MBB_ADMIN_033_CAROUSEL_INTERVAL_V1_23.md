# Homepage Carousel — Configurable Rotation Interval

**Document ID:** MBB-ADMIN-033  
**Version:** 1.23  
**Project:** MommaBees Website — MommaBee Bakery&Farmstand  
**Date:** 2026-10-27  
**Status:** Implementation submitted for CI/deployment verification  
**Filename:** `docs/MBB_ADMIN_033_CAROUSEL_INTERVAL_V1_23.md`  
**File type:** Markdown  
**Google Drive location:** Not established; GitHub `MommaBees/MommaBees-Website`, main is controlled source.  
**Dependencies:** MBB-ADMIN-032, MommaBees production Supabase, GitHub main, Cloudflare Pages.  
**Purpose:** Provide an Owner-editable interval for homepage carousel progression without publishing unfinished content.

## Verified prior behavior
Public carousel previously auto-advanced every 6.5 seconds only when at least two eligible, published slides existed. At inspection the second real slide was an unpublished test draft; no timer setting could make the public carousel advance to an unpublished slide. Reduced-motion preference, pause/hover/focus, inactive browser tabs and user navigation can also stop auto-advancement.

## Approved change
- `site_settings.home_carousel_interval_seconds`: numeric 3–60, default 6.5, check constraint.
- Admin → Website & Design → Homepage Carousel: number field with half-second increments, `* Required` label, save action, status notice and explanation.
- Public and private Admin preview now use the persisted interval.
- Same permissions as existing Owner/Admin website settings updates; no separate grants, no LIVE payment changes.
- Do not publish test slides automatically. No image, product, inventory, or customer data changes.

## QA requirements
Verify DB schema, default and allowed range, repository unit tests, Cloudflare matching production deployment, then Owner-authenticated save and mobile/desktop playback with at least two approved slides. Respect reduced motion by disabling autoplay while retaining manual controls. Closing or leaving the Admin preview releases its timer.

## Revision history
| Date | Version | Revision |
|---|---|---|
| 2026-10-27 | 1.23 | Sitewide setting for carousel timing, configurable by Owner/Admin |

**Footer:** MommaBee Bakery&Farmstand · MBB-ADMIN-033 · v1.23 · GitHub main

## Navigation-state correction
Public hash navigation previously reused startup data when the Owner returned from Admin after publishing a slide. Reentering Home now refreshes published slide and interval data from Supabase, avoiding the need for a hard browser reload after carousel changes. This does not publish drafts or bypass RLS.
