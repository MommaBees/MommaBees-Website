# Homepage Carousel and Admin Center Navigation — MommaBee Bakery&Farmstand

**Document ID:** MBB-ADMIN-030  
**Project:** MommaBees Website, Nixa, Missouri  
**Version:** 1.20  
**Status:** Deployed; Supabase migration verified, automated GitHub CI passed, matching Cloudflare production deployment successful. Owner-authenticated browser interaction and responsive visual acceptance remain open.  
**Date:** 2026-10-27  
**Filename:** `docs/MBB_ADMIN_030_CAROUSEL_NAVIGATION_V1_20.md`  
**File type:** Markdown  
**Google Drive location:** Not established; controlled copy in MommaBees GitHub main  
**Purpose:** Change static homepage feature into real Owner-managed carousel and improve Admin usability without changing checkout.

## Carousel
The current Owner-configured homepage headline, description and photograph are retained as the first published slide. Additional slides can be added only with a real, Owner-selected/uploaded photograph. Each has: eyebrow, heading, introduction, alt text, primary/secondary CTA labels and safe internal destinations, position, publish status and optional schedule. Editor offers image uploads to staff-only `carousel-photos` bucket (5 MB JPG/PNG/WebP), photo preview, reorder controls and publication toggles.

Frontend exposes previous/next and slide position controls; with multiple slides, automatic advance every 6.5 seconds pauses on interaction, hover/focus, hidden tabs and reduced-motion preferences. A one-slide homepage has no unnecessary carousel controls. Server RLS provides public access only to currently active published slides. If the carousel is not reachable, legacy homepage content remains available as fallback.

## Admin Center information architecture
- Overview
- Orders & Fulfillment
- Products & Inventory
- Customers & Communication
- Marketing & Promotions
- Website & Design (including Homepage Carousel)
- Finance & Administration

Group disclosure sections, descriptive navigation labels, highlighted selection, module search and compact mobile navigation replace one long, undifferentiated scrolling list. Moderator access remains limited to messages/reviews; UI grouping is not a substitute for database authorization.

## Boundaries and decisions
No fabricated additional slides, invented photographs, products, prices or inventory. No changes to Stripe checkout, LIVE payments, or customer orders. Existing homepage colors and bakery name remain controlling. Existing hero fields remain as fallback and must not be removed until all clients are migrated. Deleting a carousel record does not automatically delete its underlying Storage object. Uploaded media requires Owner rights confirmation.

## Security
Carousel table and Storage writes allow only active Owner/Admin. Public reads require published and within schedule, with no general active-account write policy. Images are limited to the bakery's public photo Storage paths and safe HTTPS origins. Internal CTA destinations are whitelisted.

## Verification
- Read-only URL and role policy inspection; no secret keys.
- Automated tests for accessibility, reduced motion, navigation role restrictions, responsive styles, and retained authentic existing hero.
- Pending manual browser acceptance: Owner create/edit/reorder/publish/unpublish, photo upload, mobile swipe, keyboard, responsive layout.
- No unattended LIVE commerce testing.

## Revision history
| Date | Version | Change | Status |
|---|---|---|---|
| 2026-10-27 | 1.20 | Editable carousel and organized Admin module navigation | CI/deployment pending |

**Footer:** MommaBee Bakery&Farmstand · MBB-ADMIN-030 · v1.20 · GitHub main

**Fallback policy:** A database-backed setting distinguishes a configured carousel with no published slides from a legacy homepage without carousel configuration. Unpublishing all slides does not accidentally republish the legacy hero. Blank photo uploads are rejected.

## Release evidence (2026-10-27)
- Code revision accepted by automated GitHub Actions: `4dcc0ae6c51fa16bc39f241ee6efa2251293335a`, workflow run `40464613034` (success).
- Matching Cloudflare production deployment for the same code revision: success.
- MommaBees Supabase migration `home_carousel_admin_v120`: successful; exactly one original hero slide is published, and its photograph URL matches the pre-existing site-settings image. The public slide RLS and Owner/Admin RLS policies are installed.
- Carousel dedicated public-photo bucket created with controlled staff uploads.
- This is deployment and automated-test evidence, **not** an authenticated end-to-end Owner browser acceptance of upload, reorder, edit, or mobile gesture behavior.
