# MommaBee Bakery&Farmstand — Website Brand and Image Update

**Document ID:** MBB-BRAND-025  
**Project:** MommaBees Website (Nixa, Missouri)  
**Version:** 1.15  
**Date:** 2026-10-27  
**Status:** Owner-approved changes committed to main; verify CI and production release separately.  
**Type:** Markdown  
**Filename:** docs/MBB_BRAND_025_SITE_PALETTE_IMAGES_V1_15.md  
**Google Drive location:** Not established; GitHub main remains system of record.  
**Dependencies:** GitHub Pages deployment; MommaBees Supabase site_settings constrained preset update.  
**Purpose:** Replace Shop All illustrative pie with provided business logo; adopt provided watercolor chicken wallpaper; update public brand identity and location/product footer.

## Owner-approved requirements
- Exact text identity: `MommaBee Bakery&Farmstand`.
- Header: `#C07C57`; footer: `#948D87`.
- Shop All (and only Shop All) hero: optimized copy of supplied `1000004847.jpg`, stored at `site/assets/branding/mommabee-shop-logo.webp`. This is a brand logo, not an illustrative product photograph.
- Site background: optimized copy of supplied `1000004850.jpg`, stored at `site/assets/branding/chicken-watercolor-background.webp`, as a selectable Admin preset; preserve custom photo upload.
- Footer: owner-provided product categories and “Located in Nixa, Missouri — Farmstand & Made to Order”. Display is informational; live product availability remains controlled by actual published inventory and fulfillment rules.

## Design, safety and control
- The earlier “omit location copy” regression constraint is superseded **only** for this owner-requested footer location statement.
- Maintain readable foreground contrast on both selected colors; do not render wallpaper behind form input text.
- The photo/background owner controls remain available for future changes.
- Listing natural sunscreen or bug spray in a footer does **not** establish that these products are legally approved for sale. Separate applicable FDA/EPA/Missouri regulatory and labeling review must occur before any regulated product is published or sold.
- No changes to authentication, payment execution, order pricing, live checkout activation or product inventory.

## Verification
Automated tests cover owner brand text, asset existence and WebP signatures, colors, location, footer categories, and new background preset. Human review still required for desktop/mobile appearance.

## Revision history
| Date | Version | Description | Status |
|---|---|---|---|
| 2026-10-27 | 1.15 | Owner image, color, footer and business name replacements | Pending final production acceptance |

**Footer:** MommaBee Bakery&Farmstand · MBB-BRAND-025 · v1.15 · GitHub main
