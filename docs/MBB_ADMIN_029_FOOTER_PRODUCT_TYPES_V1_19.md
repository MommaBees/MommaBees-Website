# Website Footer Layout and Product-Type Safeguards — MommaBee Bakery&Farmstand

**Google Drive location:** Not established
**Filename:** `docs/MBB_ADMIN_029_FOOTER_PRODUCT_TYPES_V1_19.md`
**File type:** Markdown
**Document ID:** MBB-ADMIN-029
**Project:** MommaBees Website, Nixa, Missouri
**Version:** 1.19
**Status:** Implementation pending CI/deployment and live credential acceptance
**Date:** 2026-10-27
**Dependencies:** GitHub main, MommaBees Supabase project, Cloudflare Pages
**Purpose:** Implement owner-requested two-row footer navigation, remove obsolete account tagline, and define business-safe product types without enabling non-food checkout.

## Approved UI
Footer: Row 1 Shop All | Ready to Sell | Preorder.
Row 2 Past Bakes | Ask Momma Bee | Questions & Policies.
Links remain the existing `#shop`, `#ready`, `#preorder`, `#gallery`, `#contact`, `#faq` routes.
Remove “A place for your bakery favorites” from the signed-in account view; preserve the account page title and functionality.

## Product-type model
- `food`: existing baked goods, including cakes, cookies, candy and bread; retains ingredient disclosure and verified allergen-review requirements for publication.
- `handmade`: handmade crocheted/sewn items and signs/engraved cutting boards; drafts may be created; publication remains unavailable until non-food stock/fulfillment/checkout lifecycle is implemented and tested.
- `regulated`: natural personal-care products, including sunscreen and insect repellent; drafts only. Product-specific FDA/EPA/Missouri legal, labeling, manufacture, claim, and registration/exemption review is outstanding. Distinction is operational classification, **not** legal approval.

A new `products.product_type` field with strict allowed values is derived from the category in the Admin form. Database constraints block every published non-food product. A trigger validates category-type consistency and active category publication. The existing food allergen trigger remains authoritative.

## Security and commerce scope
No live payment processing or test transactions. No sale product, price, order, inventory, entitlement or API key created. Existing public category display remains availability-driven. The checkout reservation RPC still uses bakery fulfillment dates and is **not** approved for non-food merchandise. Database product-publication protection prevents normal checkout eligibility for non-food items even if a frontend toggle is manipulated.

## Acceptance
GitHub CI tests for footer links, removed tagline, product type UI classification, database trigger/constraint source, and non-food publish prohibition. Verify migration in MommaBees Supabase and the exact deployed main revision in Cloudflare. Actual authenticated Admin browser and full checkout testing must be accepted separately.

## Revision history
| Version | Date | Change | Status |
|---|---|---|---|
| 1.19 | 2026-10-27 | Footer layout, account copy removal, product type and publication hold | Verification pending |

**Footer:** MommaBee Bakery&Farmstand · MBB-ADMIN-029 · v1.19 · GitHub main

**Inactive subcategories:** Owner/Admin can associate draft regulated records with inactive category variants for review; publication continues to require an active matching subcategory for food products. The existing subcategory-consistency trigger is preserved with a draft-specific exception.
