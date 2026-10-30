# MommaBee Stripe Sandbox Migration and End-to-End Payment Acceptance

**Document ID:** MBB-PAY-003  
**Project:** MommaBee Farmstand and Bakery / MommaBees-Website  
**Version:** 1.0  
**Status:** PARTIAL — new Stripe sandbox catalog and webhook created; signed end-to-end payment acceptance BLOCKED by runtime credential activation and authenticated Checkout completion  
**Created / Updated:** October 30, 2026 (America/Chicago)  
**Filename:** `docs/MBB_PAY_003_STRIPE_SANDBOX_MIGRATION_V1_0.md`  
**File type:** Markdown (.md)  
**Source location:** `MommaBees/MommaBees-Website`, `main`, `docs/`  
**Google Drive location:** Not established; no Drive copy created  
**Dependencies:** MBB-PAY-001, MBB-PAY-002, MBB-COMMERCE-039; Stripe sandbox; MommaBees Cloudflare Pages; MommaBees Supabase; Owner/Admin authentication; mandatory anti-fraud and tax gates  
**Purpose:** Reconcile Stripe sandbox account identities, preserve test-only checkout, document deployed source corrections and define objective payment acceptance evidence.

## 1. Environment and account identity

- **Controlling new MommaBee Stripe sandbox:** `acct_1UWAEICv9zp633CV` — connected through Stripe ChatGPT app; **livemode=false**.
- **Legacy sandbox (archival reference):** `acct_1UUtoDJF02bajTTM` — referenced by 2026-10-27 documents and prior product/price IDs. Do not silently transfer its payment, refund, webhook, or customer record IDs to the new account.
- **Website:** `https://mommabees-website.pages.dev/`; Cloudflare Pages project `mommabees-website`, production branch `main` under the dedicated MommaBees Cloudflare connection.
- **Database:** MommaBees Supabase project `ryqcfojzdncrshinlpue`.
- **Environment gates verified October 30, 2026:** Cloudflare `LIVE_PAYMENT_ALLOWED=no`; `STRIPE_AUTOMATIC_TAX_ENABLED=no`; Stripe secret bindings exist but their values are not available through the Cloudflare read API.
- **Runtime credential precedence:** The application checks the server-side Supabase credential Vault first, then the matching Cloudflare binding. Do not assume changing a Cloudflare binding overrides an existing Vault value.
- **Pre-migration database counts:** customer orders: 0; demo_checkout_tests: 0; product_stripe_test_sync: 0.

## 2. New TEST catalog created in Stripe

These six records were created and independently re-read in `acct_1UWAEICv9zp633CV`, all with `livemode=false`, `purpose=sandbox_demo`, and no fulfillment obligations.

| Demo product | Amount (USD) | Stripe Product | Stripe Price |
|---|---:|---|---|
| Chocolate Chip Cookies | $24.00 | `prod_VXQy9RCsvObBvr` | `price_1UWM6wCv9zp633CV1XWCOv2z` |
| Cinnamon Rolls | $4.00 | `prod_VXQyZ839Y0fG04` | `price_1UWM6qCv9zp633CVkErBLS3X` |
| Apple Pie | $24.00 | `prod_VXQyAjdiQ1Ho6T` | `price_1UWM6yCv9zp633CVICBXp0ZF` |
| Carrot Cake | $35.00 | `prod_VXQyynMJYYj3rf` | `price_1UWM6zCv9zp633CVpnWhrORW` |
| Classic Cheesecake | $38.00 | `prod_VXQyzxztSd2D4k` | `price_1UWM71Cv9zp633CVEuIdV2u3` |
| Brownie Box | $18.00 | `prod_VXQzCxqvwN3dtO` | `price_1UWM72Cv9zp633CVYwQurUfB` |

The six matching in-repository TEST mapping entries were updated. These demonstration catalog prices are not automatically synchronized into Supabase real product publishing or stock allocations.

## 3. Webhook configuration

- **New endpoint:** `we_1UWM7TCv9zp633CVGy0FVbEA`
- **Stripe environment:** TEST (livemode=false)
- **Destination:** `https://mommabees-website.pages.dev/api/stripe-webhook`
- **Subscribed events:** `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`
- **Status at creation:** enabled
- **Credential remaining:** Securely install this endpoint's signing secret in the Owner-managed `STRIPE_WEBHOOK_SECRET` test slot or approved fallback binding. Never put the secret in source control, documentation, chat, logs, or browser JavaScript. A newly created endpoint does not establish successful delivery.

## 4. Implemented source safeguards

- `functions/_lib/demo-prices.js`: migrated fixed-price demo catalog.
- `functions/_lib/product-stripe-test.js`: new dedicated test account identity; live keys remain forbidden for catalog synchronization.
- `functions/_lib/credential-rotation.js`: test credential identity validation now checks the new sandbox account. Live credential verification requires a separately configured expected live account ID.
- `functions/api/admin/credentials.js`: passes the configured expected live account identity to the key verification path.
- `functions/_lib/stripe.js`: checks remote Stripe account identity before creating TEST sessions; LIVE sessions must separately match the configured `STRIPE_LIVE_ACCOUNT_ID`.
- `functions/api/admin/demo-checkout.js`: rejects an incorrect Stripe account before writing the demo ledger.
- Updated source and mocked-acceptance test fixtures to use the correct sandbox identity.
- Preserved existing `LIVE_PAYMENT_ALLOWED=no`, tax unverified, guest anti-bot checks, order-inventory reservation logic, and signed-webhook requirements.

## 5. Acceptance evidence and blockers

As of document creation:
1. New sandbox account discovered: **PASS**
2. New TEST catalog (six products/prices) created and re-read: **PASS**
3. TEST webhook endpoint created and re-read: **PASS**
4. Updated source committed on `main`: **PASS**
5. Post-change CI / Cloudflare production deployment verification: **PENDING**
6. Secure new TEST API key active in website runtime / Vault: **NOT VERIFIED**
7. New webhook signing secret active in website runtime / Vault: **NOT VERIFIED**
8. Signed TEST checkout from authenticated Admin UI to paid Stripe Session to webhook to `demo_checkout_tests.status=paid`: **NOT PERFORMED**
9. Confirm no `orders` / `order_items` / inventory change from demo purchase: **NOT PERFORMED**
10. Regular customer order via eligible pickup/delivery, server reservation, completed paid Checkout and verified order fulfillment: **BLOCKED pending tax verification and operational gates**
11. LIVE payment: **NOT AUTHORIZED by this migration and remains DISABLED**

**Do not claim a successful real payment or true end-to-end order lifecycle based on mocked test passes, created products, created webhooks, or unpaid Checkout Sessions.**

## 6. Completion procedure

1. Obtain a TEST API key specifically for `acct_1UWAEICv9zp633CV` from the MommaBee Stripe Dashboard. In MommaBee website Owner/Admin credential management, verify and activate `STRIPE_SECRET_KEY` for `test` using the required Owner password and human verification. Confirm that the account ID check succeeds. Do not paste the key into any chat or public repository.
2. Reveal the signing secret for `we_1UWM7TCv9zp633CVGy0FVbEA` in the MommaBee Stripe sandbox Dashboard; securely stage/activate `STRIPE_WEBHOOK_SECRET` in the `test` slot. Respect the website's Owner-controlled manual rotation workflow (automatic rotation remains disabled unless explicitly changed).
3. Once CI and deployment confirm source parity, sign in as Owner/Admin; open Shop -> Example Menu -> Cinnamon Rolls -> Try Test Checkout. Use an approved Stripe test payment method and complete the TEST Checkout for $4.00; no actual funds move.
4. Confirm Stripe Session `livemode=false`, `payment_status=paid`, expected `client_reference_id` or sandbox metadata, and successful delivery of the signed `checkout.session.completed` event.
5. Verify exactly one matching Supabase `demo_checkout_tests` row marked `paid`, with the correct amount, session ID and Owner actor. Verify no real `orders` or item inventory mutations.
6. Exercise TEST decline/expiration and signed-webhook replay; confirm appropriate error states, no double fulfillment, no order duplication. For real customer checkout, complete separate product tax/eligibility review before enabling `STRIPE_AUTOMATIC_TAX_ENABLED`.
7. Record actual timestamps, redacted session IDs, event delivery status, CI run/deployment IDs, database counts, and acceptance result. Keep all LIVE payment switches off.

## 7. Revision history

| Version | Date | Change | Status |
|---|---|---|---|
| 1.0 | 2026-10-30 | New sandbox account reconciliation, demo catalog, webhook, code guard, and honest test gate | Partial; pending signed acceptance |

---
**Footer:** MBB-PAY-003 · v1.0 · MommaBees Website · Internal test evidence · Never store payment secrets

## 8. October 30 follow-up — Owner reports credential updates

**Owner statement:** The MommaBee TEST secret key and webhook signing secret have been updated. This is a user-reported completed configuration step, not an independently disclosed or re-read secret.

**Post-change verification:**
- Latest source-code GitHub Actions checks: **PASS**; run `41121576474`, commit `339f21c38f6e7693b005622387f9271cb972dc42`.
- Cloudflare production Pages deployment for that commit: **SUCCESS**.
- Cloudflare secret bindings `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` present; secret contents are intentionally masked.
- The new Stripe sandbox webhook endpoint is enabled and points to `/api/stripe-webhook`.
- Database: six demo catalog items enabled; one enabled Cinnamon Rolls example ($4.00); exactly one Owner role; `demo_store_enabled=true`, `checkout_enabled=false`; zero demo checkouts and zero customer orders at observation.
- New sandbox Stripe Checkout Sessions: zero observed at observation.
- **Credential API round-trip from the deployed website, a completed hosted Checkout payment, authenticated admin demo ledger insertion, signed webhook delivery, and inventory nonmutation are still unverified.**
- Keep `LIVE_PAYMENT_ALLOWED=no` and `STRIPE_AUTOMATIC_TAX_ENABLED=no` until the separate gates are accepted.

**Next decisive test:** Authorized Owner signs in, opens Shop > Example Menu > Cinnamon Rolls > Try Test Checkout, and pays using the Stripe TEST card. Independently read back Stripe Session `paid` + webhook event delivery and Supabase `demo_checkout_tests.status=paid`, with unchanged customer orders/inventory. This tests the **website-originated** session rather than a Stripe API-only fixture.

---
**Revision note:** 2026-10-30 follow-up read-only verification; acceptance remains partial.
