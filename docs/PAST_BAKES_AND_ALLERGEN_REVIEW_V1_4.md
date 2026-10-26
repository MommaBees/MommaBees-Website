# Mamma Bee's Bakery — Past Bakes Gallery & Product Allergen Review

**Document ID:** MBB-CATALOG-001  
**Project:** Mamma Bee's Bakery — Nixa, Missouri  
**Version:** 1.4  
**File:** `docs/PAST_BAKES_AND_ALLERGEN_REVIEW_V1_4.md` (Markdown)  
**GitHub:** MommaBees/MommaBees-Website → main  
**Google Drive:** No Google Drive location established  
**Status:** Code and database migration deployed; real-browser acceptance and original-photo transfer pending  
**Date:** October 26, 2026  
**Purpose:** Control past-creations gallery and owner-reviewed allergen labeling  
**Dependencies:** Supabase project `ryqcfojzdncrshinlpue`, Cloudflare Pages, Supabase Storage, Owner/Admin access

## Past Bakes Gallery — gallery only, never for sale

1. The Owner has supplied twelve photographs of previous homemade creations, including Caramel Pecan, Carrot Cake, Reese's, Double Berry, Strawberry Crunch and Cinnamon Roll.
2. `past_bakes` is independent from the `products` table, prices, inventory, shopping-cart eligibility, promotions, and checkout. A gallery entry cannot automatically become a shop product.
3. Gallery publication uses `published`, `title`, `description`, `sort_order`, and `image_url`. Photographs are uploaded to the dedicated public Supabase bucket `past-bakes` by authenticated Owner/Admin accounts.
4. The customer site at `/#gallery` displays cards labelled **Past creation · Not for sale**. An empty gallery displays a neutral message, not invented stock.
5. The Admin area contains **Catalog → Past Bakes — Gallery Only (Not For Sale)** for single-image creation/editing and a **Bulk Upload** control for selecting multiple JPG, PNG, or WebP files (up to 5 MB each).
6. The original twelve user-supplied photographs are preserved in the downloadable archive `MommaBees_Past_Bakes_Gallery_Photos.zip` within this conversation. Because the archive is not automatically hosted, the Owner must extract it and select all 12 JPG files in the Admin bulk uploader to complete publication. Do not claim remote upload until gallery image URLs are verified.
7. Photo titles are automatically suggested using the original filenames; the Owner can edit titles and descriptions after upload.
8. Full-size photographs are retained; do not make unsupported claims about recipe ingredients, refrigeration, or sale eligibility based on appearance alone.

## Product creation — nine major allergens

The Admin product editor displays all nine FDA major food-allergen groups:

- Milk
- Eggs
- Fish (identify species)
- Crustacean shellfish (identify type)
- Tree nuts (identify type, such as pecans, walnuts, or almonds)
- Peanuts
- Wheat
- Soybeans
- Sesame

The suggestions are heuristic, derived from the entered item name and ingredient description. Suggestions are **not authoritative food-safety findings**. The Owner/Admin can check and uncheck individual entries, but they must compare the selection to the complete recipe including crusts, fillings, toppings, purchased mixes, and supplier labels. An explicit confirmation checkbox completes the review. Changing a product's ingredient list requires reviewing and reconfirming the disclosures.

### Publication rules

- Product drafts can be saved before completing the review.
- Published products require a nonempty ingredients description and explicit major-allergen review confirmation.
- `products.major_allergens` stores an array constrained to the nine standard groups; `products.allergens` stores the customer-facing declaration.
- Public product detail shows the verified declaration. No major allergens listed is not a guarantee of allergen-free preparation; customers should contact the bakery about cross-contact.
- Product availability and sales are independently controlled by `published`, fulfillment capacity, and stock/preorder eligibility.
- Missouri food labeling and rules for potentially hazardous/refrigerated baked goods require separate product-by-product professional review before sale.

**Authoritative reference:** U.S. FDA, Food Allergies, https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies

## Acceptance status

- Supabase gallery table, RLS, and storage bucket: migration applied.
- Supabase publication constraint for allergen review: temporary transaction test passed and rolled back.
- Browser/gallery test: pending actual Owner upload of the 12 supplied files.
- GitHub code parsing / regressions: automated CI tracked on main.
- Live Stripe payments: disabled and unaffected.

## Revision history

| Date | Version | Change | Status |
|---|---|---|---|
| 2026-10-26 | 1.4 | Owner-supplied Past Bakes collection; independent non-sale gallery; ingredient-aware nine-major-allergen review | Implemented in code, integration testing pending |

**Footer:** Mamma Bee's Bakery · MBB-CATALOG-001 · v1.4 · GitHub-controlled
