# Bakery / Homestand Store Separation and Searchable Product Paths

**Document ID:** MBB-CATALOG-038
**Version:** 1.28
**Project:** MommaBee Bakery&Farmstand — MommaBees Website
**Date:** 2026-10-27
**Status:** Development release — automated and live deployment evidence separately verified
**Google Drive:** No folder established. Canonical location: GitHub `MommaBees/MommaBees-Website`, `main`.
**Filename:** `docs/MBB_CATALOG_038_BAKERY_HOMESTAND_SPLIT_V1_28.md`
**Type:** Markdown
**Purpose:** Implement Owner-switchable combined/split store navigation and searchable, cascading product classification with no fabricated products.

## Owner decisions
- Naming: **Bakery** and **Homestand** (the owner's requested spelling). Existing legal/shop brand remains MommaBee Bakery&Farmstand.
- Admin → Website & Design → Store Display: **Split Store** toggle, default off (combined shop).
- Enabled: Bakery and Homestand tabs filter *real available products* by department. Mode tabs (Shop All / Ready to Sell / Preorder) remain and preserve the chosen department. Category and subcategory filters are department-specific.
- Disabled: all published available products appear together as before; direct department deep links do not create a covert filter.
- Admin → Products: search field above department/category/subcategory/variety dropdowns, matches full display paths and fills cascade. Product name is separate and editable; a chosen variety can prefill it.
- Categories have a department. Existing bakery categories stay Bakery. Handmade, Signs/Decor and Natural Homemade Products become Homestand. Vegetable and Fruit families created, while product records and pricing remain untouched.
- Varieties are organizational labels **not sellable goods**. Example taxonomy paths: Bakery/Pies/Creme/Banana; Bakery/Breads/Cinnamon Swirl; Bakery/Cookies/Butter Cookies/Dream Cookie (drömmar); Bakery/Cookies/Holiday/Ginger Bread; Homestand/Vegetables/Green Beans; Homestand/Fruits/Blackberries. The owner entered "Blackberrys"; normalized common spelling is Blackberries.
- Existing active product count at inspection was zero. Therefore enabled split pages show true empty states, not invented merchandise.
- Homestand handmade and regulated items remain draft-only under existing safeguards. Food and produce require genuine ingredient/allergen review and real available fulfillment dates under existing sale logic. Operational suitability of produce for the bakery fulfillment/batch lifecycle must be separately accepted before promising a general produce-specific checkout.

## Security
RLS permits staff Owner/Admin modifications to taxonomy; the public sees only active varieties. Database trigger validates product department = category department and variety relationship, regardless of frontend manipulation. Existing product-type/food-allergen publication gates, permissions, payments and orders are retained.

## Dependencies
Existing `categories`, `subcategories`, `products`, `site_settings`; new `catalog_varieties` and migrations; frontend Admin and Shop routes. No external paid services.

## Acceptance
Validate combined/split toggle, filtering on ready/preorder and category pages, search cascading, variable dropdown behavior, no cross-department items, no simulated items when split, accessibility, secure writes, existing checkout, GitHub CI, Supabase migration, production deployment. Owner browser verification remains separate.

## Revision history
| Date | Version | Change | Status |
|---|---|---|---|
| 2026-10-27 | 1.28 | Store departments and searchable catalog hierarchy | Verification pending |

**Footer:** MommaBee Bakery&Farmstand — MBB-CATALOG-038 — v1.28 — GitHub main
