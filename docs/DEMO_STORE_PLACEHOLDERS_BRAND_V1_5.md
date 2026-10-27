# Mamma Bee's Bakery — Demo Store, Display Placeholders, and Brand Copy

**Document control**
- **Project:** Mamma Bee's Bakery (Nixa, Missouri)
- **Document ID:** MBB-TEST-CATALOG-001
- **Version:** 1.5
- **Filename / file type:** `docs/DEMO_STORE_PLACEHOLDERS_BRAND_V1_5.md` — Markdown
- **GitHub location:** `MommaBees/MommaBees-Website` / `main`
- **Google Drive location:** Not established; GitHub is the current project source of truth
- **Status:** Database and source deployed, CI testing verified; real Stripe sandbox checkout awaiting TEST secret
- **Date:** October 26, 2026
- **Purpose:** Control reversible demo content, test-payment isolation, public empty-state settings, and brand language
- **Dependencies:** Authorized MommaBees Supabase + Cloudflare Pages; Stripe MommaBeesBakery sandbox `acct_1UUtoDJF02bajTTM`

## Brand copy — approved implementation
- Header subtitle: **Iowa Roots. Faith-Filled Heart. Baked with Love.**
- Announcement band: **Faith, country roots & sweet traditions**
- Footer: **Iowa roots. Missouri home. Baked with faith and love.**
- Replaces “Homemade in Nixa, Missouri”; the Nixa location remains separately relevant for local pickup and delivery.
- The Admin may update header subtitle later using **Website Appearance & Settings**.

## Configurable default placeholders

Under **Admin → Website Appearance & Settings**:
- Show empty-shop message (on/off)
- Show empty-gallery message (on/off)
- Show missing-photo placeholder (on/off)
- Show empty-featured message (on/off)
- Show test products to Owner/Admin ONLY (on/off)

The first four controls default ON and may be disabled individually. The demo storefront defaults OFF in schema; it has been explicitly enabled for bakery staff testing in the deployed Supabase settings. These flags do not create fake customer inventory and do not override the rule that empty real-product categories are hidden.

## Demo product fixtures

All fixtures are illustrative, stored in the separate `demo_catalog_items` table (not `products`) and accessible only to Owner/Admin sessions through Supabase RLS. They are labelled **TEST ONLY** in the shop and cannot be added to the real shopping cart.

| Sample | Category | Unit | Test price |
|---|---|---|---:|
| Chocolate Chip Cookies | Cookies | dozen | $24.00 |
| Cinnamon Rolls | Pastries | each | $4.00 |
| Apple Pie | Pies | each | $24.00 |
| Carrot Cake | Cakes | each | $35.00 |
| Classic Cheesecake | Cheesecakes | each | $38.00 |
| Brownie Box | Cookies | box | $18.00 |

**Price status:** Testing estimates, not bakery price approvals or offers. Local reference price examples:
- Robin’s Sweets, Nixa: https://robinssweets.com/
- T & T Bakery, Springfield area: https://ttbakery.org/
- St. George's Donuts, Nixa: https://www.stgeorgesdonuts.net/menuprices

## Stripe sandbox safety design

- Only account `MommaBeesBakery` / `acct_1UUtoDJF02bajTTM` and **TEST MODE** keys are authorized.
- The separate `/api/admin/demo-checkout` endpoint verifies the current authenticated Owner/Admin role on the server, `demo_store_enabled=true`, and an enabled `demo_catalog_items` record.
- A Stripe test key beginning `sk_test_` is mandatory. LIVE keys are rejected unconditionally.
- Checkout uses server-calculated example amounts and Stripe Checkout **test-only** sessions. It does not create product reservations, orders, product deliveries, or actual revenue.
- The Stripe webhook verifies signatures as usual. Events containing `metadata.demo_checkout_test_id` reconcile only against `demo_checkout_tests`, checking sandbox livemode=false, session ID, currency, and expected amount. This branch never calls the real-order completion function.
- Sandbox checkout intentionally does not exercise Missouri sales-tax automation. That remains a distinct configuration and acceptance gate for real bakery commerce.
- **Current blocker:** Cloudflare Production does not yet contain `STRIPE_SECRET_KEY`. The Owner needs to enter the authorized MommaBeesBakery sandbox `sk_test_` key as an encrypted secret before launching checkout sessions. Never paste the key into chat or GitHub.
- Live payments remain disabled (`LIVE_PAYMENT_ALLOWED=no`, `checkout_enabled=false`, `STRIPE_AUTOMATIC_TAX_ENABLED=no`).

## Past Bakes Gallery permission and label

- Admin heading is simply **Past Bakes Gallery**.
- The content remains historical, not purchasable; the customer-facing gallery may appropriately indicate “Not for sale.”
- Only Owner/Admin can insert, edit or delete `past_bakes` rows and upload/edit/delete images in the `past-bakes` Storage bucket.
- A separate user-upload task remains for the 12 prior gallery photos, which were packaged in the conversation. No gallery rows are invented.

## Acceptance

- [x] Database fixtures added, role-restricted RLS enabled
- [x] Display toggles installed and enabled demo visibility for staff
- [x] Code and automated static/endpoint-denial regressions pass on `main`
- [ ] Authenticated Owner/Admin browser checks for all toggles and six cards
- [ ] Real Stripe sandbox Checkout session test (needs encrypted `sk_test_` key)
- [ ] Stripe test webhook paid/failed/expired reconciliation test
- [ ] Separate legitimate order flow and tax acceptance
- [ ] Public customer view regression (no demo cards or Admin tools)

## Revision history

| Date | Version | Revision | Status |
|---|---|---|---|
| 2026-10-26 | 1.5 | Added reversible placeholders, private sample shop, separate sandbox test-checkout, Past Bakes label, Iowa-and-faith brand text | Implemented; sandbox payment testing pending |

**Footer:** Mamma Bee's Bakery · MBB-TEST-CATALOG-001 · v1.5 · Controlled source
