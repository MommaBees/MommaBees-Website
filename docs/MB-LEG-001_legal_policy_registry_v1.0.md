# MommaBees — Legal, Safety, Privacy & Fulfillment Policy Register

## Document control

| Field | Value |
|---|---|
| Project | Mommy Bee Farmstand and Bakery / MommaBees |
| Document ID | MB-LEG-001 (internal document identifier) |
| Filename | MB-LEG-001_legal_policy_registry_v1.0.md |
| File type | Markdown (.md) |
| Repository | MommaBees/MommaBees-Website |
| Repository location | docs/MB-LEG-001_legal_policy_registry_v1.0.md |
| Google Drive location | Not established; proposed: MommaBees / Governance / Legal & Compliance / |
| Google Drive document ID | None assigned |
| Version | 1.0 |
| Prepared | October 27, 2026 |
| Status | Implemented in source; deployment/acceptance evidence tracked separately; pending licensed Missouri counsel review |
| Dependencies | Legal entity identity; actual property ownership and permitted use; food classification; insurance; product-specific pricing and fulfillment; customer communications and data practices |
| Purpose | Registry of website legal pages, checkout consent, cookie preferences, and outstanding legal/operational controls |

## Revision history

| Version | Date | Change | Approval |
|---|---|---|---|
| 1.0 | 2026-10-27 | Owner-directed addition of legal/policy pages, fulfillment acknowledgments, and optional cookie preferences | Owner authorized development; legal approval not represented |
| 1.1 | 2026-10-27 | Replaced legacy administrative terms wall of text in FAQ with expandable customer guidance; added prominently labeled, compact footer legal links and cookie settings; marked legacy Admin terms field as internal | Owner-directed presentation correction; legal approval not represented |

## Public policy inventory (all in website source)

| ID | Route | Policy |
|---|---|---|
| MB-LEG-001A | #legal/terms | Terms of Service |
| MB-LEG-001B | #legal/privacy | Privacy Policy |
| MB-LEG-001C | #legal/cookies | Cookie & Tracking Policy |
| MB-LEG-001D | #legal/pickup | Customer Pickup Policy |
| MB-LEG-001E | #legal/delivery | Local Delivery Policy |
| MB-LEG-001F | #legal/refunds | Refunds & Cancellations |
| MB-LEG-001G | #legal/property | Property, Visitor & Animal Safety |
| MB-LEG-001H | #legal/food | Food Safety & Allergens |

Source of record: site/legal-policies.js. Landing page: #legal. Footer links and FAQ are wired in site/app.js. Styles are in site/legal.css and loaded by site/index.html.

## Technical control inventory

1. **Cookie preferences:** site/cookie-consent.js; necessary storage remains available, optional analytics and marketing default false, decisions persist with preference version and recordedAt timestamp in localStorage. Footer provides a persistent settings entry point. Future optional scripts must call MommaBeesCookiePreferences.permits(category) before loading; this module does not itself deploy advertising or analytics tags.
2. **Fulfillment-specific checkout acknowledgment:** site/checkout-form.js displays a mandatory checkbox and links for the current Terms, Refunds, and selected Pickup or Delivery policy. Version: 2026-10-27-v1.
3. **Server enforcement and order evidence:** functions/_lib/order-legal.js validates accepted=true, exact policy version, and matching fulfillment method. Both functions/api/checkout.js and functions/api/pay-at-pickup.js apply it. The backend appends a server timestamp/version/method marker to the existing order note for audit continuity. A dedicated immutable acceptance table may be preferable for a later compliance upgrade.
4. **Payment controls:** This update must not activate or bypass any previously approved LIVE-payment gate, tax approval, or other financial authorization.

## Unresolved checks before legal sign-off

- Verify registered legal entity, correct trade name, statutory contact/registered contact information where legally required.
- Confirm landowner, property-use authorization, family residence boundaries, zoning, permits, and insurance for public visitors.
- Verify animal presence, fencing, any animal-interaction events, and availability/conditions of agritourism protections. Ordinary retail pickup is not automatically an agritourism experience.
- Verify food products, production location, cottage-food eligibility or permits, accurate allergens, and product-specific storage/handling.
- Verify the published privacy notice against all actual deployed services, analytics, email/SMS tools, file retention, and customer data workflows.
- Audit Cloudflare dashboard-installed Web Analytics, Zaraz, embeds, and other externally injected tracking. The in-repository cookie control does not automatically disable unreviewed provider-side injection.
- Confirm delivery territory, pickup location, permitted unattended delivery, failed handoffs, payment/returns handling, and refund timing.
- Have licensed Missouri counsel assess any negligence release, liability limitation, indemnity, warranty, consumer rights, delivery carrier and family-landowner issues. Do not present this register as evidence of enforceability.
- Consider a dedicated database table for immutable order-policy acceptances with version, server timestamp, user/order reference and securely limited retention; existing notes provide an initial order record, not comprehensive audit provenance.
- Verify accessible browser experience and actual deployment of the exact final main commit. Production browser and policy acceptance testing remains distinct from static source and Cloudflare build success.

## Document management rule

Do not publish unverified business-specific deadlines, amounts, physical addresses, insurance statements, cancellation penalties, third-party tracking claims, or blanket waivers as if they were established facts. Changes to customer-facing text require version/date updates, an operational review, and a legal review where appropriate.

## October 27, 2026 presentation correction

- Customer FAQ source: `site/customer-faq.js`; route `#faq` now displays concise, expandable answers and links to the appropriate individual legal documents.
- Legacy `site_settings.terms` content is no longer rendered as a public FAQ paragraph. Admin retains it as an archived internal draft field; it is not the published contractual Terms of Service.
- The original two-row shopping footer navigation remains unchanged, with the distinct `footer-legal` section below it.
- `site/legal.css` provides compact footer policy links with readable contrast, FAQ accordion styling, and mobile layouts.
- `tests/customer-faq.test.js` adds regression coverage; `tests/source.test.js` was updated for the new source-of-truth split.
- The published website should be independently browser-checked for layout, keyboard accessibility, new links, and current cookie preferences; a successful Cloudflare Pages deployment does not by itself establish legal or browser acceptance.
