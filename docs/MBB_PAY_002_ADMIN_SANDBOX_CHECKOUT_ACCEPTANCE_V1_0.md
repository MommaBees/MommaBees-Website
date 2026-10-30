> **Account migration notice (2026-10-30):** The Stripe sandbox account ID and catalog references in this historical document describe the legacy sandbox. The active MommaBee sandbox is `acct_1UWAEICv9zp633CV`. See `docs/MBB_PAY_003_STRIPE_SANDBOX_MIGRATION_V1_0.md` for the current integration and outstanding acceptance gates. This notice does not retroactively certify any payment test.

# Admin Demo Store — Checkout Visibility and End-to-End Acceptance

**Document ID:** MBB-PAY-002
**Project:** Mommy Bee Farmstand and Bakery — MommaBees Website
**Version:** 1.0
**Status:** Source fix implemented; automated CI and authenticated browser acceptance require verification
**Created:** 2026-10-27 (America/Chicago)
**Last updated:** 2026-10-27 (America/Chicago)
**Filename:** MBB_PAY_002_ADMIN_SANDBOX_CHECKOUT_ACCEPTANCE_V1_0.md
**File type:** Markdown (.md)
**Google Drive location:** Not established; new Drive file only if explicitly required
**GitHub source:** MommaBees/MommaBees-Website/docs/ (main)
**Dependencies:** MBB-PAY-001, TEST Stripe account acct_1UUtoDJF02bajTTM, MommaBees Supabase project ryqcfojzdncrshinlpue, production Cloudflare Pages, authenticated Owner role, six configured sandbox prices.

## Purpose
Verify an actual, authenticated Owner/Admin demonstration order travels from the MommaBees shop through the site payment API, TEST-only Stripe Checkout, the signed Stripe webhook, Supabase demo-checkout ledger and Admin History. It must never create actual customer orders or alter bakery inventory.

## Preflight findings
1. All six `demo_catalog_items` are enabled and match the six fixed TEST prices.
2. `site_settings.demo_store_enabled` is true.
3. Only one verified Owner role currently exists.
4. Stripe sandbox webhook `we_1UUv2iJF02bajTTMp1bYwLFT` is enabled for checkout completion, expiration and async outcomes.
5. No `orders` or `demo_checkout_tests` were present at preflight.
6. Previous storefront included `demoStorePreview` and `bindDemoStore` but omitted the actual call to render the section from `shop`.

## Corrective change
Render Owner/Admin-only `demoStorePreview(mode||'all',category?.name||null)` after the real product grid on the Shop storefront, excluding Homestand. Preserve its backend Owner/Admin authorization and disable public sample visibility. Keep the Stripe-hosted checkout and production customer checkout independent.

## Acceptance steps
1. Sign in to `https://mommabees-website.pages.dev/#account` with the actual Owner account. Do not share session tokens or passwords.
2. Open `https://mommabees-website.pages.dev/#shop`; under Example Menu select **Cinnamon Rolls → Try Test Checkout** ($4.00).
3. Complete Stripe Checkout using TEST card `4242 4242 4242 4242`, a future expiry, and arbitrary CVC.
4. Verify exactly one `demo_checkout_tests` record with the matching amount, Owner actor, session ID and status `paid`.
5. Verify Stripe session `livemode=false`, `payment_status=paid`, and webhook event `checkout.session.completed`.
6. Open Admin → Sandbox & Testing → Sandbox Test History and verify the record appears as Paid.
7. Confirm `orders`, `order_items` and `order_events` did not increase. Review inventory unchanged.
8. Test invalid/unauthenticated access remains blocked. Do not claim visual/browser acceptance until the signed-in journey is actually completed.

## Known limitations
Previously created Stripe-only sessions intentionally do not create demo ledger rows and cannot validate this journey. Cloudflare secret values are not readable through the connected API; only their presence can be verified. Refund handling in the isolated demo ledger is outside the single-payment acceptance scope.

## Revision history
| Version | Date | Summary | Status |
|---|---|---|---|
| 1.0 | 2026-10-27 | Found and corrected missing Owner sandbox storefront rendering; defined end-to-end payment acceptance | Pending signed-in acceptance |

---
**Footer:** MBB-PAY-002 | v1.0 | MommaBees Website | Internal Test Documentation
