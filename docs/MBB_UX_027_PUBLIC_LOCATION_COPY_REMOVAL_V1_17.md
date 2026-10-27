# Mamma Bee's Bakery — Public Location Copy Removal

**Document ID:** MBB-UX-027  
**Version:** 1.17  
**Date:** October 26, 2026  
**File type:** Markdown (.md)  
**Filename:** `docs/MBB_UX_027_PUBLIC_LOCATION_COPY_REMOVAL_V1_17.md`  
**Repository:** `MommaBees/MommaBees-Website` on `main`  
**Google Drive location:** Not established  
**Status:** Public copy changes implemented and deployed; automated source test and production asset checks passed. Authenticated browser review still pending.

## Owner direction

Remove named city/state references from the bakery website. Maintain the established brand, rustic farmhouse appearance, order eligibility, actual delivery settings, and the correct legal conditions for food sales. Do not introduce invented business locations.

## Areas changed

- Public footer's location-bearing sentence replaced with a neutral homemade-baking description.
- Browser title and search-engine description revised without locality claims.
- Rustic background preset and Owner/Admin upload controls no longer include a place name.
- FAQ cottage-food notice describes applicable location and food-safety restrictions without asserting a public city/state address.
- Public `site_settings.terms` cottage-food paragraph replaced in Supabase with location-neutral language preserving mandatory eligibility checks.
- Checkout customer address entry no longer preselects a particular state. The state field remains required.
- Checkout's provider-tax-configuration error was made neutral without changing tax enforcement.
- README project description and local regulatory review reminders no longer contain a place name; compliance review requirements remain intact.
- Background stylesheet comment and package metadata updated.

## Preserved behavior

- Product pricing, menus, role checks, shipping/pickup eligibility, calendar and CAPTCHA unchanged.
- Stripe LIVE restrictions and tax-verification blocks unchanged.
- No customer records, private address information or order history modified.
- Historical governance/implementation records are retained as historical documentation, not displayed in public page copy.

## Acceptance

- [x] Public HTML metadata and JS templates have no named city/state reference.
- [x] Owner/Admin design controls use generic rustic farmhouse naming.
- [x] Public site terms have no named location, and still require applicable cottage-food and location eligibility.
- [x] Public announcements, categories, products and site settings inspected for location wording.
- [x] Automated tests passed.
- [x] Production Cloudflare Pages deployed matching main revision.
- [ ] Manual customer and owner browser inspection after login.

## Revision history

| Date | Version | Description |
|---|---|---|
| 2026-10-26 | 1.17 | Sitewide public locality text removal and state-neutral policy/metadata presentation |

**Footer:** Mamma Bee's Bakery · MBB-UX-027 · v1.17 · GitHub-controlled
