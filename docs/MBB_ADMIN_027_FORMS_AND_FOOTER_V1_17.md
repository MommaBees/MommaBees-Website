# MBB-ADMIN-027 — Admin Schedule Form and Site Settings Usability Correction

**Company:** MommaBee Bakery&Farmstand
**Project:** MommaBees Website, Nixa, Missouri
**Version:** 1.17
**Date:** 2026-10-27
**Status:** Engineering implementation; browser acceptance required
**Document ID:** MBB-ADMIN-027
**Filename:** docs/MBB_ADMIN_027_FORMS_AND_FOOTER_V1_17.md
**File type:** Markdown
**Google Drive location:** Not established; GitHub main is the controlled source of record.
**Purpose:** Fix problems photographed in Owner's Admin screenshots without inventing catalog, schedule, or notification records.

## Requested removal
The two Owner-disapproved statements are removed from the website footer. The exact business name, Nixa location, QR link, navigation, and disclosures remain.

## Admin fixes
1. Baking & Fulfillment Calendar: replace ambiguous “Order cutoff (local browser time)” with “Order cutoff (Central Time)”; apply explicit America/Chicago parsing and formatting and reject ambiguous/nonexistent DST dates.
2. Editor checkboxes: align controls with labels and suppress inherited 100% input width.
3. Product Day Limits / Recipe Yields: show an explanatory missing-product message, disable unfulfillable submissions until real products exist, and do not fabricate records.
4. Baking day reference: display the date without a redundant truncated identifier; retain full key in the option value.
5. Website Appearance & Settings: render a readable standalone settings summary with a correctly sized Edit button instead of a long-text table column.
6. Alerts & Notifications: explain verified empty state; do not manufacture notifications.

## Verified starting data
At inspection, the database contained zero product rows, zero recipe rows, one baking day, one website settings row and zero notifications. These are point-in-time counts, not promises.

## Release boundaries
No live payment transaction, Stripe price, order, customer, product record, stock, category, or entitlement is changed. No false alerts or imaginary products are created. Existing Editor save permissions remain unchanged.

## Revision history
| Version | Date | Description |
|---|---|---|
| 1.17 | 2026-10-27 | Targeted footer and Admin usability fixes; screenshot-derived regressions |

**Footer:** MommaBee Bakery&Farmstand · MBB-ADMIN-027 · v1.17 · Controlled in GitHub main
