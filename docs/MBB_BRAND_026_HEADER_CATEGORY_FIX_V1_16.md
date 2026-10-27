# MommaBee Bakery&Farmstand — Header Offerings and Admin Category Fix

**Document ID:** MBB-BRAND-026  
**Project:** MommaBees Website, Nixa, Missouri  
**Version:** 1.16  
**Date:** 2026-10-27  
**Status:** Committed to GitHub main; database update and live verification required separately  
**File type:** Markdown  
**Filename:** `docs/MBB_BRAND_026_HEADER_CATEGORY_FIX_V1_16.md`  
**Google Drive location:** Not established; GitHub main is the source of record.  
**Purpose:** Apply Owner-requested full-width offerings header, remove duplicated footer offerings, and correct Admin product-category foreign-key selectors.  
**Dependencies:** GitHub Pages production deployment; restricted MommaBees Supabase migration.

## Approved changes
- Header offerings line replaces the former faith-themed tagline, using the requested product and service categories. It is rendered as a full-width, wrapping line beneath the navigation.
- Footer no longer duplicates this categories list. Business name, Nixa location, availability notice, contact navigation, QR and allergen notice remain.
- Add three distinct top-level catalog categories: `Handmade`, `Signs/Decor`, `Seasonal`. No new sale products are published.
- Fix `(undefined)` and invalid foreign-key option values in Admin forms: referenced rows must use their own primary keys, not local foreign-key field names. `baking_days` retains its non-UUID `date` primary key. Hide UUID suffixes for human-readable category selectors.
- Keep business name `MommaBee Bakery&Farmstand`, owner colors `#C07C57` and `#948D87`, and the existing watercolor chicken background.

## Root cause
Previously `fieldInput` read `x[f.key||'id']` when constructing a reference dropdown. For Product `category_id`, this attempts to read `category_id` on each Categories row, where the true primary key is `id`, producing literal `undefined` in the option label/value.

## Boundaries
No payments, LIVE checkout permissions, order data, pricing, customer accounts, or existing product records are changed. New categories remain absent from public category navigation until corresponding valid sellable products exist. Future non-food product categories require a product-type-aware review of the food-specific ingredient, allergen, and fulfillment forms. Natural sunscreen and insect repellent claims remain subject to applicable product/regulatory review before sale.

## Revision history
| Date | Version | Details |
|---|---|---|
| 2026-10-27 | 1.16 | Correct Admin reference keys, add three categories and relocate offerings from footer to header |

**Footer:** MommaBee Bakery&Farmstand · MBB-BRAND-026 · v1.16 · GitHub main
