# MommaBee — Item Payment Controls

**Document ID:** MBB-PAY-005  
**Project:** MommaBee Bakery & Farmstand / MommaBees-Website  
**Version:** 1.0  
**Status:** Implemented in main; final deployment and authenticated Owner browser acceptance to be recorded separately  
**Created:** October 30, 2026  
**Filename:** `docs/MBB_PAY_005_ITEM_PAYMENT_CONTROLS_V1_0.md`  
**File type:** Markdown  
**Google Drive location:** Not established; no Google Drive document created  
**Repository:** `MommaBees/MommaBees-Website`, branch `main`  
**Dependencies:** MBB-PAY-003; MBB-PAY-004; real products, eligible inventory, customer fulfillment schedules, Stripe TEST/LIVE credentials, global tax and payments readiness  
**Purpose:** Give administrators item-level visibility and control over Stripe online and Pay at Pickup eligibility without bypassing the Owner-controlled LIVE release gates.

## 1. Root cause / inventory facts

Prior to this change, the MommaBee production Supabase database contained 19 `store_showcase_items` and **zero** `products` sale records or `store_showcase_items.product_id` links. Product Showcase entries are presentation-only, with optional preview/cart testing; they must not directly create a real payment transaction without a genuine linked sale product.

## 2. New Admin capability

**Products & Inventory → Item Payment Controls** lists all real sale products and all Product Showcase entries.

For each real sale product, Owner/Admin can set and save independently:
- **Online Stripe:** `products.online_payment_enabled`, true or false.
- **Pay at Pickup:** `products.pay_at_pickup_enabled`, true or false.

Both are **false by default** for newly created products and any preexisting product for which no explicit payment approval was recorded. These flags are *item permissions*, not evidence of inventory or overall payment readiness.

The **Products** editor now includes a separate **Item Payment Controls** fieldset with both switches. The Products and Product Showcase lists include an **Item Payment Controls** navigation button.

For Product Showcase entries, the consolidated panel displays linked sale product and inherited payment permissions; an unlinked entry displays **Display only — no payment accepted** and directs staff to link an actual sale product in the Showcase editor. A Showcase record does not own a second independent set of payment booleans, preventing drift.

## 3. Enforced operational behavior

- A cart can offer **Online Stripe** only if every included real product has `online_payment_enabled=true`, and the storefront-level checkout switch is enabled.
- A cart can offer **Pay at Pickup** only if every product has `pay_at_pickup_enabled=true`, the global Pickup feature is available, the date allows it, and tax-review prerequisites are set.
- The public product quick-add action is suppressed when neither method is permitted. An unavailable product can still be visible as catalogue information, without a payment action.
- Critical enforcement lives in a Supabase `BEFORE INSERT` trigger on `public.order_items`. During the existing atomic `reserve_checkout` / `reserve_pickup_order` RPC transaction, the trigger reads the actual `orders.payment_method` and `products` permission fields. A mismatch raises a database error; PostgreSQL rolls back all reservation, order and stock changes within that transaction.
- No LIVE payment can bypass the independent `LIVE_PAYMENT_ALLOWED`, `STRIPE_AUTOMATIC_TAX_ENABLED`, Stripe account verification, inventory, availability, and policy gates merely because an individual item's Online Stripe permission is enabled.

## 4. Database change

Migration: `supabase/migrations/20261030_product_payment_permissions_v162.sql`

Adds:
- `public.products.online_payment_enabled boolean not null default false`
- `public.products.pay_at_pickup_enabled boolean not null default false`
- Function `public.mommabees_validate_order_item_payment()` and trigger `mommabees_order_item_payment_guard` on `public.order_items`.

The migration has been successfully applied to the dedicated MommaBees Supabase project; the trigger was independently verified through `pg_trigger`.

## 5. Safe first use

1. In **Products**, create an actual sale product with a confirmed price, correct category, ingredients/allergen disclosures and fulfillment selling method.
2. Publish only after product eligibility has been independently reviewed and the product has inventory or an eligible preorder schedule.
3. In **Product Showcase**, set **Linked sale product** to the corresponding real product. The Showcase entry will inherit its payment permissions; do not make a second Stripe price merely for the Showcase display.
4. Open **Products & Inventory → Item Payment Controls**, enable Online Stripe and/or Pay at Pickup per product, then Save.
5. Separately configure global payment gates, date windows, signed webhooks, taxes, the required LIVE credentials, and actual authenticated payment acceptance. TEST and LIVE account isolation must be preserved.

## 6. Test and release acceptance

- **Database schema and trigger:** Applied and inspected.
- **Admin product form, list, and payment panel:** Committed.
- **Mixed-cart payment-method display:** Updated.
- **Published item quick-add without payment permission:** Suppressed.
- **Automated repository test:** `tests/item-payment-controls.test.js`.
- **LIVE payments:** Remain disabled; no real funds collected.
- **Unlinked Product Showcase entries:** Remain display-only, not an accepted checkout product.
- **Pending:** Production deployment parity and authenticated owner browser test; completed sandbox Checkout → signed webhook → database acceptance remains separately pending.

## 7. Revision history

| Version | Date | Revision | Status |
|---|---|---|---|
| 1.0 | 2026-10-30 | Item-level Stripe/Pay-at-Pickup settings, Admin payment panel, linked showcase distinction and database guard | Implemented; final acceptance pending |

**Footer:** MBB-PAY-005 · MommaBee Bakery & Farmstand · v1.0 · Internal Owner operations · 2026-10-30 · Main branch
