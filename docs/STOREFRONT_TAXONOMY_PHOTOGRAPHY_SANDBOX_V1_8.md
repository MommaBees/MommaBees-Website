# Mamma Bee's Bakery — Storefront Structure, Photography, Sandbox Catalog & Policy

**Project:** Mamma Bee's Bakery (Nixa, Missouri)
**Document ID:** MBB-CATALOG-018
**Version:** 1.8
**File type / filename:** Markdown — `docs/STOREFRONT_TAXONOMY_PHOTOGRAPHY_SANDBOX_V1_8.md`
**GitHub location:** `MommaBees/MommaBees-Website` → `main` → `docs/`
**Google Drive location:** Not established; GitHub remains controlled project storage
**Date:** 2026-10-26
**Status:** Stripe sandbox products and live shop source implemented. Database taxonomy migration awaits a successful Supabase deployment; real checkout acceptance pending.
**Purpose:** Ensure truthful photography, nested bakery shopping categories, payment environment isolation and safe policy disclosures.
**Dependencies:** Cloudflare Pages `mommabees-website`, Supabase `ryqcfojzdncrshinlpue`, Stripe test account `acct_1UUtoDJF02bajTTM`, Admin permissions.

## Project account isolation

- GitHub write identity: MommaBees, repository `MommaBees/MommaBees-Website`; all changes to `main`.
- Supabase: MommaBees's Project, `ryqcfojzdncrshinlpue`.
- Cloudflare Pages: bakery-specific `mommabees-website`.
- Stripe: **MommaBeesBakery**, `acct_1UUtoDJF02bajTTM`, test-mode only; do not access other linked stock-market Stripe accounts.
- The existing test webhook is `we_1UUv2iJF02bajTTMp1bYwLFT` at `https://mommabees-website.pages.dev/api/stripe-webhook`; enabled for checkout completion, expiration and asynchronous payment results. Signing key is stored as Cloudflare `STRIPE_WEBHOOK_SECRET`. Its actual correctness must still be confirmed through a delivered test webhook.

## Stripe test products

| Demo item | USD sample price | Stripe test Product ID | Stripe test Price ID |
|---|---:|---|---|
| Chocolate Chip Cookies — Dozen | $24.00 | `prod_VW0O1U2wAiBEZv` | `price_1UUyOAJF02bajTTMelch2XzC` |
| Cinnamon Roll — Each | $4.00 | `prod_VW0Ph1AzF2avIL` | `price_1UUyOOJF02bajTTMOhlrWOPA` |
| Apple Pie — Whole | $24.00 | `prod_VW0PafHteozNDy` | `price_1UUyOQJF02bajTTM7JhZUq0z` |
| Carrot Cake — Whole | $35.00 | `prod_VW0PQBuvS2Dhq5` | `price_1UUyOSJF02bajTTMOf34XjD5` |
| Classic Cheesecake — Whole | $38.00 | `prod_VW0PwvaJLKjIvI` | `price_1UUyOVJF02bajTTM8S7PA17H` |
| Brownie Box — Six | $18.00 | `prod_VW0Pg6iiwY04cQ` | `price_1UUyOXJF02bajTTMRaTdicHF` |

All six were created and read back with `livemode=false`. They are not real items or customer orders. The Owner/Admin test checkout now uses these pre-created Stripe Price IDs; a changed example price is rejected until the Stripe Price is versioned/synchronized. Live payments remain disabled.

## Shopping taxonomy (migration pending)

The controlled migration is `supabase/migrations/20261026_category_subcategory_image_presets.sql`. This migration could not be applied through the connected database operation during this session and **must be applied and verified before subcategory administration goes live**.

Parent categories (already inserted into Supabase; hidden from customers until they have a sellable product):
- Cookies
- Cakes
- Pies
- Cheesecakes
- Pastries
- Bars & Brownies
- Breads

The migration seeds 48 bakery-variety subcategories, including chocolate chip, sugar, oatmeal-raisin, snickerdoodle, layer/bundt/sheet cakes, fruit/cream/meringue/nut pies, cheesecake styles, cinnamon rolls and quick breads. Product subcategories must belong to their parent category. Empty subcategories and categories remain hidden automatically.

The Admin product editor temporarily omits the new subcategory field if the migration is not yet available, preserving existing product creation.

## Real photographs and accurate product claims

The site contains the Owner's 12 earlier-baking photos in the independent **Past Bakes Gallery**. These are not for sale. The curated default photo picker (`site/photo-library.js`) includes 13 real photographs with provenance: bakery-owned photos and verified openly licensed Wikimedia Commons reference photos.

Defaults use a matching variety when available and a visibly labeled same-category example otherwise. A reference photo is **not** a photograph of a product supplied by the bakery. Each shop product card and detail page labels a reference as representative and provides photo-author/license attribution where required. Product-specific Owner-uploaded photos override default references.

The current starter library **does not yet have a separate verified photograph for every possible subcategory**. Rather than inventing food photographs, Owner/Admin may upload authentic additional photos using the product, category and forthcoming subcategory image controls. Expand the library only with photographs for which publication rights can be established.

Curated reference licensing sources:
- Mshuang2, chocolate chip cookies, CC0: https://commons.wikimedia.org/wiki/File:Chocolate_chip_cookies_on_cutting_board.jpg
- LostplanetKD73, apple pie, CC0: https://commons.wikimedia.org/wiki/File:IMG_small_apple_pie.jpg
- Lisafern, fruit pie, CC0: https://commons.wikimedia.org/wiki/File:Fruit_Pie.jpg
- Roundhere44, walnut pie, CC0: https://commons.wikimedia.org/wiki/File:Walnut_Pie.jpg
- Scott Akerman, lemon meringue pie, CC BY 2.0: https://commons.wikimedia.org/wiki/File:Lemon_Meringue_Pie.jpg
- Miansari66, brownie dessert, CC0: https://commons.wikimedia.org/wiki/File:Brownie_Dessert.jpg

Do not confuse a visually demonstrated baked item with one eligible for cottage-food sale. Cream pies, custards, and refrigerated cheesecakes require additional food-safety and operating-framework assessment before being offered.

## Customer-facing policy and no automatic baking promise

The policy in **FAQ & policies**, and the `site_settings.terms` field when previously blank, now covers:
1. Unavailable date selections and special-order messages are **inquiries**, not accepted orders or reserved baking capacity.
2. The bakery must affirmatively confirm ingredients, availability, fulfillment terms and accepted pricing before a custom request becomes an order.
3. Any off-schedule convenience fee is proposed in advance; it is not automatically charged, and requires acceptance of the quote.
4. Reference pictures and prior baking photographs are illustrative only.
5. For cottage-food internet sales, both the producer and buyer must be within Missouri, per Missouri RSMo §196.298 (2022 revision).
6. Applicable cancellation, refunds, labeling, and food-safety rights are not waived. Final terms require Owner and, where appropriate, licensed counsel review.

**Legal sources:**
- Missouri Revisor, §196.298: https://revisor.mo.gov/main/OneSection.aspx?section=196.298
- Missouri DHSS home-based kitchen guidance: https://health.mo.gov/safety/foodsafety/pdf/home-based-kitchen-food-prod-guidance.pdf

## Acceptance / next gates

- [x] Linked GitHub, Supabase, Cloudflare and Stripe resources verified
- [x] Six Stripe demo Products and test Price objects created and read back
- [x] Existing sandbox webhook enabled (test event delivery / signature still to be accepted)
- [x] Modernized sandbox shop preview and real-photo gallery on home page
- [x] Representative photo disclosures and attribution on product cards
- [x] Seven real parent categories saved in Supabase
- [x] Store policy / FAQ updated with no automatic baking commitment
- [ ] **Apply the outstanding `20261026_category_subcategory_image_presets.sql` Supabase migration**
- [ ] Verify nested category RLS, parent-child integrity and Admin subcategory editing after migration
- [ ] Add more verified category-appropriate photographs, not generated product representations
- [ ] Authenticated Owner/Admin browser shopping and product editing acceptance
- [ ] Process and verify a TEST Stripe payment and webhook while keeping live checkout disabled
- [ ] Regulatory review for cream/custard/refrigerated items before any real sale

## Revision history

| Date | Version | Description | Status |
|---|---|---|---|
| 2026-10-26 | 1.8 | Authorized account verification; Stripe sandbox catalog; nested types; truthful photo library; nonbinding special-order policy | Implemented with explicit migration/testing limitations |

**Footer:** Mamma Bee's Bakery · MBB-CATALOG-018 · v1.8 · GitHub-controlled
