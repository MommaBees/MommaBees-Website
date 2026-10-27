# Product Category and Subcategory Registry — MommaBee Bakery&Farmstand

**Document ID:** MBB-CATALOG-028  
**Project:** MommaBees Website, Nixa, Missouri  
**Version:** 1.18  
**Status:** Implementation candidate; database, CI, and production verification pending  
**Effective date:** October 27, 2026  
**Filename:** `docs/MBB_CATALOG_028_PRODUCT_TAXONOMY_V1_18.md`  
**File type:** Markdown  
**Google Drive location:** Not established; this GitHub document is the controlled project source.  
**Repository / deployment dependency:** `MommaBees/MommaBees-Website`, `main`, MommaBees Supabase `ryqcfojzdncrshinlpue`.  
**Purpose:** Represent all Owner-approved offering families as actual catalog categories/subcategories while retaining existing data and avoiding mock products.

## 1. Source of truth
Owner's offerings: "Decorated Cakes, Cake Pops, & Cookies | Homemade Cheesecakes & Pies | Candies | Bread & Pastries | Handmade crocheted&sewn items | Custom engraved cutting boards | Natural homemade products - bug spray, sunscreen, lip balm, soaps & more."

## 2. Category taxonomy
- Existing: Cakes, Cookies, Cheesecakes, Pies, Breads, Pastries, Handmade, Signs/Decor, Bars & Brownies, Seasonal.
- New top-level: Cake Pops and Candies (active); Natural Homemade Products (inactive pending regulatory review).
- Under Cakes: Decorated Cakes.
- Under Cookies: Decorated Cookies.
- Under Handmade: Crocheted Items, Sewn Items.
- Under Signs/Decor: Custom Engraved Cutting Boards.
- Under Natural Homemade Products: Bug Spray, Sunscreen, Lip Balm, Soaps (inactive pending review).

Existing variants, their IDs, inventory associations and product names are preserved. No product rows are created, edited or published.

## 3. Publication controls and outstanding dependencies
The category schema is not a legal review or product approval. The natural-products category and its subcategories are inactive. No sunscreen, insect repellent, soap or lip-care product may be treated as cleared for sale based merely on its catalog entry. A subsequent product-specific regulatory determination and applicable labeling, manufacturing and licensing review is required.

**Known platform limitation:** The current product editor requires bakery food ingredient and allergen acknowledgments and lacks a first-class product-type field. Non-food product merchandising and release controls should be designed before actual handcrafted/non-food items go live. Backend purchase eligibility must be reviewed along with these controls; do not infer that inactive categories alone prevent a misconfigured product from being purchasable.

**Current site display behavior:** The customer-facing Shop by Category listing only shows categories with actually available published items. Adding an empty category makes it available to the Admin catalog without pretending inventory exists.

## 4. Verification
- New main categories: 3.
- New subcategories: 9.
- Migration uses conflict handling and parent-slug resolution, without fixed database UUIDs.
- Verify resulting records in Supabase after applying the migration, and confirm no products were inserted.
- Verify GitHub checks and matching Cloudflare production revision independently.

## 5. Revision history

| Date | Version | Revision | Status |
|---|---|---|---|
| 2026-10-27 | 1.18 | Added requested product taxonomy while preserving prior catalog and regulatory release restrictions | Validation pending |

**Footer:** MommaBee Bakery&Farmstand · MBB-CATALOG-028 · v1.18 · Controlled in GitHub main

## 6. Security finding and correction
During catalog inspection, the permissive `FOR ALL` RLS policy named `active account only` was found on `categories`, `subcategories`, and `products`, alongside table-level CRUD grants to `authenticated`. As configured, the policy permits writes by any otherwise-active signed-in account, bypassing the intended Owner/Admin-specific permissive RLS policies. This constitutes a catalog-integrity authorization defect. The accompanying migration `20261027_catalog_permission_hardening_v118.sql` removes those three permissive policies, preserving the existing public read and Owner/Admin management policies. Verify permission behavior after application, including actual authenticated owner and customer HTTP journeys before claiming end-to-end acceptance.
