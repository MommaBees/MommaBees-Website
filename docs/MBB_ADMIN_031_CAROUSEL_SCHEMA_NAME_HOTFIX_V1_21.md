# Homepage Carousel — Canonical Table-Name Repair

**Company / project:** MommaBee Bakery&Farmstand — MommaBees Website  
**Document ID:** MBB-ADMIN-031  
**Version:** 1.21  
**Date:** 2026-10-27  
**Status:** Engineering correction; automated and production verification recorded separately  
**Filename:** `docs/MBB_ADMIN_031_CAROUSEL_SCHEMA_NAME_HOTFIX_V1_21.md`  
**File type:** Markdown  
**Google Drive location:** Not established; this GitHub document is the source of record.  
**Repository:** `MommaBees/MommaBees-Website` / `main`  
**Dependencies:** MBB-ADMIN-030 v1.20, `public.home_carousel_slides`, Supabase PostgREST, Cloudflare Pages deployment.  
**Purpose:** Correct the Owner-reported "Could not find table public.carousel_slides in the schema cache" error in Admin → Website & Design → Homepage Carousel.

## Verified cause
The database migration created `public.home_carousel_slides`, whereas the Admin panel used `carousel_slides` as its selected module ID, configuration key and CRUD table name. The custom list/reorder/delete paths already queried the correct table. The generic record form used `update(selected)` / `add(selected)` and would call the nonexistent table.

## Corrective action
Use one canonical identifier `home_carousel_slides` for Admin module navigation, configuration key, routing, add/edit/publish checks and generic record saving. Preserve the customer-facing label "Homepage Carousel". Keep the existing database, published slide, original image, media bucket, RLS policies and checkout untouched. No migration or credentials are required.

## Acceptance criteria
- Open Homepage Carousel as Owner/Admin and read the original slide.
- Open and save edits to the same slide and verify persistence after page reload.
- Add a second slide using an original photograph, confirm publication and ordering, and verify website display on desktop/mobile.
- Confirm anonymous accounts cannot modify slides; moderators remain limited to their existing responsibilities.
- Automated tests assert the obsolete table name is absent from Admin code and the canonical identifier matches the migration and storefront.

## Controls
No LIVE payment, changes to customer accounts, products, orders, or regulated product classifications. Do not claim authenticated browser acceptance from repository CI or production deployment evidence alone.

## Revision history
| Date | Version | Description | Status |
|---|---|---|---|
| 2026-10-27 | 1.21 | Canonical table-name alignment and regression checks for carousel Admin | Verification pending |

**Footer:** MommaBee Bakery&Farmstand · MBB-ADMIN-031 · v1.21 · GitHub main
