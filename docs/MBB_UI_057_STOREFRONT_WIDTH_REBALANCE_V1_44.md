# Storefront Width Rebalance and Screenshot Correction

**Document ID:** MBB-UI-057  
**Project:** MommaBees — Mommy Bee Farmstand and Bakery website  
**Version:** 1.44  
**Date:** 2026-10-27 (America/Chicago)  
**Filename:** `MBB_UI_057_STOREFRONT_WIDTH_REBALANCE_V1_44.md`  
**Type:** Markdown  
**Source location:** GitHub `MommaBees/MommaBees-Website/docs/` on `main`  
**Google Drive location:** Not established  
**Status:** Implemented in source; deployment and visual acceptance to be verified  
**Dependencies:** MBB-UI-055, MBB-UI-056, Website Size presets, home-carousel settings

## Purpose
Correct excess blank side margins in the owner's Ready to Sell screenshot at Firefox 70% zoom without undoing uniform product-card dimensions or independently controlled homepage layouts.

## Change control
- The preceding v1.43 rule set forced every page to 84% of its `--website-main-max` preset. This created an overly narrow storefront and overrode focused-page widths.
- On broad storefront routes (`home`, `shop`, `ready`, `preorder`, `category`, and `subcategory`), center the content at 92% of the selected `--website-shell-max` preset, with a responsive viewport gutter.
- Keep Admin at 96% of the same selected shell preset to allow more horizontal space for tables and forms without filling the screen.
- Restore focused-page width caps for account, checkout, contact, FAQ, QR, cart, tracking, order status, product details, and gallery as already defined in MBB-UI-055.
- Mobile widths return to 100%. Preserve 1,080px carousel frame limit and its slide behavior; preserve product-card uniformity and owner-configurable grid layouts.
- No database or commerce changes.

## Verification
Source-level regression assertions must pass, and the exact main commit must deploy successfully to MommaBees Cloudflare Pages. A signed-in browser visual pass across the approved Website Size presets and desktop, tablet, and mobile remains a separate final acceptance gate.

## Separate observation
The owner's screenshot showed `No items listed` under Ready to Sell. That reflects the currently filtered product list in the site application. A published item needs an eligible ready-to-sell batch and pickup date. Catalog readiness and layout are separate concerns.

---
**Footer:** MBB-UI-057 | v1.44 | MommaBees Website
