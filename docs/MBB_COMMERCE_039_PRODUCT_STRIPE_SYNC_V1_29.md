# Product Publishing and Stripe Sandbox Synchronization

**Document ID:** MBB-COMMERCE-039
**Project:** MommaBees Website — MommaBee Bakery&Farmstand
**Version:** 1.29
**Date:** October 27, 2026
**Status:** Engineering; test integration deployed subject to CI and browser acceptance
**File type:** Markdown
**Filename:** `docs/MBB_COMMERCE_039_PRODUCT_STRIPE_SYNC_V1_29.md`
**Google Drive location:** Not established. Controlling repo: `MommaBees/MommaBees-Website` main.
**Purpose:** Create/update a Supabase product and synchronize a corresponding Stripe TEST Product/Price via a secure Cloudflare Pages Function.

## Architecture
- Supabase `products` is authoritative for price, ingredients/allergens, pickup/preorder, inventory and publication. Product photographs use existing Supabase `product-photos` storage, served to Cloudflare pages; Cloudflare deploy is not required when a record changes.
- Staff-only Cloudflare `/api/admin/product-sync` GET returns synchronization status and POST performs an idempotent retryable sync.
- The product list displays TEST sync status and manual retry; Admin product Save initiates Stripe TEST catalog synchronization. If Stripe fails, Supabase remains saved and the Admin receives a clear status instead of a false success.
- Stripe catalog records use a fixed MommaBees-only TEST Stripe Account ID. The endpoint rejects LIVE keys, LIVE account mismatch, and public/ordinary member requests. This integration does not authorize LIVE payments.
- Stripe Price values are immutable: price changes create or reuse a distinct TEST price (lookup key by product UUID and cents), then set the TEST product default price. Historical prices remain; old paid orders are not rewritten.
- Retry after product-creation/data-write failure searches Stripe metadata to recover the prior remote product. A deterministic Stripe idempotency key additionally reduces duplicate creation. Product updates preserve the Stripe product ID.
- Product publication is not automatic and remains subject to category/type/allergen and inventory gates. Non-food/regulated goods remain draft-only.
- Existing Cloudflare Checkout creates its own aggregate order-total Stripe line item from server reservation. Catalog sync does **not** change the checkout total, tax calculation, payment flow or webhook.
- Production account secrets must remain Cloudflare server bindings, never exposed to browser/GitHub. A restricted Stripe TEST key is preferred.

## Outstanding QA
Mocked HTTP tests for authentication failure, wrong Stripe account and key, idempotent retry, price modification, non-food unpublished, no LIVE access, and Supabase failure handling; then Browser tests with one Owner-approved real product and image, signed-in role/guest controls, storefront, checkout TEST lifecycle and refunds. Owner must separately authorize any LIVE production product or payment activation.

## Revision history
| Version | Date | Description |
|---|---|---|
| 1.29 | 2026-10-27 | Secure Supabase→Stripe TEST product/price sync with status and retries |

**Footer:** MommaBee Bakery&Farmstand · MBB-COMMERCE-039 · v1.29 · GitHub main
