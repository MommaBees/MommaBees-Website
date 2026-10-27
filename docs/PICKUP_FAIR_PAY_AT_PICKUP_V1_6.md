# Mamma Bee's Bakery — Pickup Calendar, Fair Days & Pay at Pickup

**Document ID:** MBB-ORDERS-016  
**Project:** Mamma Bee's Bakery (Nixa, Missouri)  
**Version:** 1.6  
**File type:** Markdown (.md)  
**Filename:** `docs/PICKUP_FAIR_PAY_AT_PICKUP_V1_6.md`  
**GitHub:** `MommaBees/MommaBees-Website`, branch `main`, folder `docs/`  
**Google Drive location:** Not established. GitHub is the controlled source.  
**Date:** October 26, 2026  
**Status:** Source and database changes implemented. CI and security checks tracked. Actual authenticated/browser/payment acceptance not yet complete.  
**Purpose:** Define approved baking-day fulfillment, special-date inquiries, guest contact data, four-day fairs, and controlled payment collection.  
**Dependencies:** MommaBees Supabase project `ryqcfojzdncrshinlpue`; MommaBees Cloudflare Pages project `mommabees-website`; authorized bakery Owner/Admin accounts; Stripe MommaBeesBakery for separately enabled online payments.

## Customer fulfillment calendar

- Checkout contains a dropdown of enabled baking dates and bake-fair dates, plus an expandable calendar that highlights eligible dates in a circle.
- Dates are derived from the baking calendar, pickup/delivery permissions, and cutoff; future dates up to 180 days are displayed in the calendar.
- Clicking an unavailable future date opens an accessible apology dialog explaining that the bakery has no scheduled fulfillment and offering a link to contact the bakery about a special order.
- The special-order inquiry prepopulates the requested date and is **not** an order or reservation. A convenience fee can be configured for the quote and is displayed only as a **potential fee subject to bakery approval**.
- Customer-selected dates and windows are revalidated inside Supabase's reservation procedure with row-level locks; client highlights are informative, not authorization.

## Guest order contact requirements

- Customers may check out without creating a member account.
- Required for pay-at-pickup: first name, last name, street, city, state, ZIP, and either a valid email contact or a text-capable phone number.
- If text is selected, the customer must affirm consent to **order-related texts only**. No marketing text subscription is implied. Text messages are **not automatically sent by this implementation**; the bakery must contact customers using an approved, separate messaging channel.
- For **online Stripe checkout**, email is additionally mandatory for payment confirmation; the website collects the full guest contact address. Phone-only guest contact is supported for **Pay at Pickup**, not Stripe online payment.
- Customer information is stored in RLS-protected order records and is visible to the authorized bakery staff only and the corresponding account holder, where applicable.

## Admin production schedule

In **Admin → Baking & Fulfillment Calendar**, controls include:
- Baking / fulfillment date, cutoff, enabled status, unit capacity, pickup/delivery windows
- `Day type`: **Baking** or **Fair**
- Fair/event label
- `Allow Pay at Pickup on this date` switch
- `Set Up 4-Day Bake Fair`: enter first day, event name, daily preorder capacity and pickup window; creates four consecutive dates with day type `fair`
- Four-day creation must be reviewed for staffing, capacity, cutoff and local America/Chicago daylight-saving time before publication.

## Payment options and controlled financial posting

### Online Stripe checkout
The existing online payment endpoint remains separate from Pay at Pickup. Stripe Tax and live processing are **not enabled**. Do not bypass existing tax or payment gates.

### Pay at Pickup
Global switch: **Admin → Website Appearance & Settings → Offer Pay at Pickup**. Another switch in each baking/fair date permits pickup on that specific day.

**Activation conditions (default: OFF):**
1. Owner has reviewed the applicable tax obligations and entered the verified pickup tax rate (basis points).
2. Pay at Pickup is enabled globally and for the selected baking/fair day.
3. The baking day must be enabled, within cutoff, and have an eligible pickup window.
4. Published product inventory and daily capacity must be available, with preorders honoring lead times.

Orders are reserved in the database with `payment_method=pay_at_pickup`, `payment_status=awaiting_pickup`, `status=new`, and the server-calculated `balance_due_cents`. No Stripe session is created and no customer is marked paid.

At actual collection, Owner/Admin uses **Order Management → Record Pickup Payment**, explicitly confirms collection method **cash** or **external_card**, and records the full amount. Only then does `payment_status` become `paid`, with an audit event. The control does **not** itself charge a card terminal.

An unpaid reservation can be cancelled through **Cancel Unpaid Pickup**, which restores reserved ready-to-sell stock; cancelled or released orders cannot later be marked paid using the collection procedure. Fulfillment can progress to **ready** while awaiting pickup payment, but **completed** requires the payment to have been recorded.

### Special dates and convenience fees
`special_date_requests_enabled` and `special_date_convenience_fee_cents` are configurable and default OFF/$0. An unavailable date always offers an inquiry; the potential fee is shown only when the quote setting is enabled. **No order, capacity reservation, charge, or customer-facing confirmed price is created by selecting an unavailable date.** Owner approval and a separate quotation are required before agreeing to any non-scheduled delivery/pickup.

## Security boundaries

- Reservation, payment collection, and cancellation SQL procedures are executable only by the server's `service_role` key. The customer UI never has access to that key.
- Pay-at-pickup guest reservations require Cloudflare Turnstile. Authenticated requests use verified Supabase sessions.
- Owner/Admin collection endpoints verify current staff role server-side before invoking financial procedures.
- Date/window, item pricing, inventory, contact fields, and tax are validated server-side; never trust totals supplied by the browser.
- The bakery's Stripe sandbox test catalog is independent of real customer orders and is unaffected.

## Operational / regulatory review before activation

- Verify the correct Missouri food taxability and applicable local sales taxes for each product and event. One blanket tax rate may not be sufficient for all products or locations.
- Missouri DHSS advises contacting the local public-health agency before a temporary food event; requirements may differ for refrigerated items and the bakery's production setup.
- Verify eligibility and required labeling for cottage-food products (especially refrigerated cheesecake/custard products) before publishing for sale.
- Configure explicit cancellation/no-show, order retention and text-communication procedures for pay-at-pickup orders.
- Before any real fair, test capacity, unavailable dates, text-only guest checkout, cash collection, cancellation/stock restoration, and tax handling using authorized test products or controlled test sessions.

**Official sources**
- Missouri DHSS Temporary Food Events: https://health.mo.gov/business-professionals/food-safety/retail-food-safety/temporary-food-events
- Missouri Cottage Food statute, RSMo §196.298: https://revisor.mo.gov/main/OneSection.aspx?section=196.298
- Missouri Department of Revenue sales tax guidance: https://dor.mo.gov/faq/taxation/business/farmers-market-sales.html

## Revision history

| Date | Version | Summary | Verification |
|---|---|---|---|
| 2026-10-26 | 1.6 | Added interactive pickup calendar, fair setup, off-day inquiry/fee estimate, guest contact requirements, pay-at-pickup reservation, cashier collection and cancellation | Database migration applied; end-to-end test pending |

**Footer:** Mamma Bee's Bakery · MBB-ORDERS-016 · Version 1.6 · Controlled in GitHub
