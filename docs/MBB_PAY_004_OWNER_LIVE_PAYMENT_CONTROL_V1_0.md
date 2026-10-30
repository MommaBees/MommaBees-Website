# Owner-Controlled Stripe TEST/LIVE Payments — Implementation and Acceptance

**Document ID:** MBB-PAY-004  
**Project:** MommaBee Bakery & Farmstand / MommaBees-Website  
**Version:** 1.0  
**Status:** Implemented in GitHub main; automated CI/deployment acceptance to be recorded separately; LIVE payments deliberately disabled  
**Created:** October 30, 2026  
**Filename:** `docs/MBB_PAY_004_OWNER_LIVE_PAYMENT_CONTROL_V1_0.md`  
**File type:** Markdown (.md)  
**Google Drive location:** Not established; no Drive copy created  
**Controlling repository:** `MommaBees/MommaBees-Website`, `main`  
**Dependencies:** MBB-PAY-003 sandbox migration; authenticated Owner account; dedicated MommaBees Cloudflare and Supabase; correct Stripe account keys; Stripe Tax readiness; published real inventory; eligible future fulfillment; signed webhook acceptance  
**Purpose:** Document the Owner-only LIVE payment toggle, effective payment-mode storage, Cloudflare bindings, independent release gates, and complete security and test requirements.

## 1. Approved behavior

The existing **Checkout & Finance > LIVE Selling** Owner panel is upgraded to a single toggle (button with `role=switch`, labeled **Enable LIVE Payments — switch to LIVE** / **Disable LIVE Payments — return to TEST**). Only Owner can access the panel and update the control.

This toggle controls the **effective** storefront mode and checkout authorization, persisted atomically in Supabase `public.site_settings`:
- `stripe_payment_mode = 'test'`, `checkout_enabled = false` means LIVE checkout disabled; the separately authenticated demo shop can still create Stripe TEST sessions.
- A successful, explicitly confirmed LIVE activation persists `stripe_payment_mode = 'live'` and `checkout_enabled = true` in one update.
- Disabling LIVE always persists TEST plus checkout disabled, without requiring active LIVE credentials, and preserves existing paid orders.
- Payment-mode server read is authoritative for **customer checkout**. `STRIPE_PAYMENT_MODE` in Cloudflare is a static `test` fallback and **does not automatically change in Cloudflare when the Owner toggles**. This is intentional: the website cannot update Cloudflare bootstrap variables without a dedicated privileged Cloudflare API token. Do not misrepresent the mode switch as editing a Cloudflare binding.
- Server-side Stripe session creation receives the persisted effective `environment` explicitly. Demo checkout always uses TEST regardless of the selected storefront mode.

**Two independent Cloudflare release gates are retained and are not changed by the toggle:** `LIVE_PAYMENT_ALLOWED=no` and `STRIPE_AUTOMATIC_TAX_ENABLED=no`. LIVE cannot be switched on until both are explicitly approved and set to `yes` at the trusted provider. Automatic tax enablement requires external review of the applicable Missouri tax treatment, eligibility, registrations, product categories, and delivery fees.

## 2. Required and optional runtime variables

| Key | Role | LIVE readiness |
|---|---|---|
| `STRIPE_PAYMENT_MODE` | Cloudflare fallback; set to `test` | Exists; TEST |
| `STRIPE_TEST_SECRET_KEY` | TEST private Stripe API credential (`sk_test_...`) | Store encrypted |
| `STRIPE_TEST_WEBHOOK_SECRET` | TEST webhook HMAC signing secret (`whsec_...`) | Store encrypted |
| `STRIPE_LIVE_SECRET_KEY` | LIVE private Stripe API credential (`sk_live_...`) | Empty encrypted binding until entered |
| `STRIPE_LIVE_WEBHOOK_SECRET` | LIVE webhook signing secret (`whsec_...`) | Empty encrypted binding until entered |
| `STRIPE_LIVE_ACCOUNT_ID` | Expected Stripe LIVE account ID (`acct_...`); identity check prevents cross-project charges | Blank nonsecret binding until known |
| `STRIPE_LIVE_PUBLISHABLE_KEY` | LIVE `pk_live_...` browser key | Empty binding; not used by current hosted Checkout |
| `STRIPE_AUTOMATIC_TAX_ENABLED` | Independent tax-review activation gate | `no` |
| `LIVE_PAYMENT_ALLOWED` | Independent emergency LIVE kill gate | `no` |

Legacy `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` remain configured as protected fallback bindings; Owner-managed encrypted Supabase Vault runtime values take precedence over fallbacks. Do not remove or overwrite current TEST credentials.

Stripe Tax is a feature of the same Stripe account and uses the server API credential; no separate Stripe Tax secret key is required. Stripe Terminal for a later release uses appropriate account credentials, server-created connection tokens and configured Terminal locations/readers, not a permanent public Terminal token.

## 3. Mandatory activation checks

Before a LIVE transition the server requires:
1. Verified Owner account and same-origin protected POST with explicit `ENABLE LIVE SALES` confirmation.
2. `LIVE_PAYMENT_ALLOWED=yes`, plus tax configuration review reflected by `STRIPE_AUTOMATIC_TAX_ENABLED=yes`.
3. A nonempty expected `STRIPE_LIVE_ACCOUNT_ID` and a LIVE API key that authenticates via Stripe `GET /v1/account` to that exact ID.
4. A LIVE webhook signing secret, and actual signed-webhook delivery acceptance separately before launch.
5. At least one eligible, properly published real food product, a future enabled bake/fulfillment date, available batch stock or eligible preorder, and at least one enabled fulfillment method.
6. Successful atomic row mutation and response verification, with an audit record or a clear audit failure notice.

Any unmet prerequisite rejects activation, leaving `stripe_payment_mode='test'` and `checkout_enabled=false` unchanged. The separate Cloudflare emergency gate remains authoritative. Disabling LIVE never depends on readiness. Payment mode is not supplied by browser-controlled checkout payload.

## 4. Data protection

Database migration `20261030_owner_stripe_payment_mode_v160.sql` adds the non-null constrained field with `test` default and leaves the sole settings record in TEST mode with checkout disabled at migration.

Database migration `20261030_protect_owner_payment_mode_v161.sql` adds a trigger that prevents direct `anon`/`authenticated` Data API modifications of `checkout_enabled` and `stripe_payment_mode` even if existing general Admin RLS update policies otherwise allow editing site settings; the controlled server action uses `service_role`. Staff cannot bypass the Owner-only website endpoint by patching a public settings record.

No Stripe LIVE credentials were created, inserted, read, displayed, charged, or switched on as part of this control implementation.

## 5. Acceptance checklist

- [x] Add constrained effective Stripe mode column, default TEST.
- [x] Owner-only server GET and POST control, with confirmation, prerequisites, atomic persistence and audit handling.
- [x] Owner-facing toggle with current TEST/LIVE and Cloudflare status.
- [x] Storefront Checkout uses effective mode, not user-provided mode.
- [x] Hardening against direct client writes of protected payment settings.
- [x] Cloudflare static `STRIPE_PAYMENT_MODE=test` and blank `STRIPE_LIVE_ACCOUNT_ID` bindings, preserving all existing variables.
- [x] Synthetic Owner authorization and activation/disable regression tests added.
- [ ] Verify the final git commit's CI success and exact Cloudflare production deploy.
- [ ] Authenticated Owner browser acceptance; no Owner login cookie is available in the connected browser profile.
- [ ] Complete TEST checkout -> signed Stripe webhook -> Supabase demo history acceptance.
- [ ] Verify LIVE Stripe identity and production endpoint after credentials are added and tax review is complete.
- [ ] Perform only separately authorized LIVE nonzero tests under an approved payment and refund plan.

## 6. Revision history

| Version | Date | Description | Status |
|---|---|---|---|
| 1.0 | 2026-10-30 | TEST/LIVE Owner UI, runtime switch, dual Cloudflare release gates, account verification and protection against direct Data API writes | Implemented; final acceptance pending |

---
**Footer:** MommaBee Bakery & Farmstand · MBB-PAY-004 · v1.0 · Internal Owner operations · `main` · October 30, 2026
