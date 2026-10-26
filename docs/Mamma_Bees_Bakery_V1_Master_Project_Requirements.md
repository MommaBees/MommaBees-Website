# Mamma Bee's Bakery
## Version 1 — Master Project Requirements and Website Development Plan

> **Document purpose:** This is the single, GitHub-ready source of truth for the scope and workflows approved in the project planning discussion through October 26, 2026. It is a requirements specification, **not** website source code, proof of implementation, legal advice, or a claim that the business is licensed or the website is production-ready.

---

## DOCUMENT CONTROL

| Field | Value |
|---|---|
| Business/project | Mamma Bee's Bakery — Online Storefront and Bakery Management System |
| Operating city | Nixa, Missouri, United States |
| Document title | Version 1 Master Project Requirements and Website Development Plan |
| Proposed GitHub path | `docs/Mamma_Bees_Bakery_V1_Master_Project_Requirements.md` |
| File type | Markdown (`.md`), UTF-8 |
| Document ID | `MBB-PRD-001` (internal document-control identifier; **not** a GitHub file ID) |
| Version | `1.0` |
| Created / scope approved | October 26, 2026 |
| Status | **Owner-approved functional scope; implementation not started or verified** |
| Change authority | Business owner; new decisions require documented amendments |
| Google Drive location | Not established; this file is intended for manual GitHub upload |
| Repository | To be selected/confirmed by owner; no repository is asserted or modified by this document |
| Dependencies | Confirm operating policies and regulatory/tax details; establish accounts/hosting; product recipes, prices, images, delivery area and other business settings |
| Intended readers | Business owner, website developer, designer, quality assurance and operations support |

### Revision history

| Version | Date | Change | Approval status |
|---|---|---|---|
| 1.0 | 2026-10-26 | Consolidated all agreed storefront, two-mode selling, Admin, notifications, promotions, clearance, reporting, safety, technology and phased implementation requirements | Owner approved functional scope in conversation |

### Interpretation rules

- **REQUIRED — V1:** The owner-approved capability belongs in the first complete release. A staged implementation is allowed; it may not be quietly omitted.
- **RECOMMENDED DESIGN:** How to implement an approved capability; subject to technical feasibility, cost, accessibility and security review.
- **FUTURE:** Explicitly discussed but not necessary for Version 1 launch; record it so the idea is not lost.
- **OPEN / VERIFY:** The exact business setting, fee, legal treatment, or technical implementation has not been verified or selected. An open item must not be represented as approved fact.
- No example products, example prices, sample metrics, sample designs, promotional percentages or dates in this document represent real store content or actual sales.
- The initial goal is a **complete, safe, usable V1 with minimal recurring costs**, not a collection of disconnected demos or placeholder functionality.

---

## 1. BUSINESS OBJECTIVE AND APPROVED DECISIONS

### 1.1 Business objectives

Create an attractive, simple, mobile-first website for homemade baked goods such as cookies, cakes, pies and additional owner-created categories. Customers must be able to purchase finished products already available for sale, or preorder items for approved future baking dates. The owner must manage the business without writing code. The website will also serve as the owner's operational system for production, order fulfillment, customer communication, promotions, expenses, and reporting.

### 1.2 Approved decisions

| Decision | Controlling requirement |
|---|---|
| Brand name | **Mamma Bee's Bakery** (use this spelling consistently) |
| Business location | **Nixa, Missouri** |
| Business setting | Home-based bakery; specific permit and food-eligibility rules must still be reviewed |
| Sales modes | **BOTH** scheduled **Preorders** and **Ready-to-Sell** previously prepared products |
| Fulfillment | **BOTH** local customer **pickup** and local **delivery** |
| Carrier shipping | Not an activated V1 sales method; preserve shipment-messaging capability as an extension only after legal/operational verification |
| Product categories | Clicking a visible category opens its dedicated page containing all presently sellable products in that category |
| Empty categories | Automatically hidden from the customer-facing shop; retained for Admin management |
| Checkout | Stripe; **guest checkout AND optional customer accounts** |
| Reviews/photos | Account required to submit comments/reviews and up to **three** photos per review; owner can moderate in Admin |
| Baking dates | Owner configures approved dates, cutoff times, quantities/capacity; only eligible dates selectable |
| Admin | Password-protected, role-aware interface for all approved management features |
| Notifications | Role-appropriate alerts for Admin accounts; customer operational notices, selected promotions and payment reminders with applicable permissions |
| Promotions | Configurable discounts for products, categories, selected batches, holidays, all/selected customer audiences, and eligible uncollected or older stock |
| Business-cost goal | Favor **$0 recurring software/hosting at small scale when feasible**; Stripe fees, domain and scaling costs remain possible |
| Implementation delivery | One step at a time, with plain-language instructions and complete, working code in manageable pieces **after** this requirements-file-only milestone |
| Time zone | `America/Chicago` for baking calendar, storefront dates and scheduled promotions |

### 1.3 Experience principles

- Warm, welcoming home-bakery look with cream, honey, subtle brown and bakery photography; simple, professional rather than visually cluttered.
- Mobile-first and touch-friendly, because most shoppers may use phones.
- Accurate prices, product descriptions, item availability, allergens, preparation dates where relevant, and pickup/delivery expectations.
- No fictitious products, fake testimonials, invented sales counts, false scarcity claims, or misleading claims of freshness.
- Public site and Admin are distinct user experiences; the owner must be able to manage daily operations from a phone or computer.
- Accessible labels, keyboard operation, logical focus, readable contrast, helpful validation and clear error messages.

---

## 2. CUSTOMER-FACING STOREFRONT — REQUIRED V1

### 2.1 Pages and navigation

Required primary pages / functions:

1. **Home** — bakery introduction, owner-controlled background/header, featured or seasonal items, announcement banners, clear actions for **Ready to Sell** and **Preorder**, and links to shop categories.
2. **Shop / Categories** — visible categories such as Cookies, Cakes, Pies and any Admin-created categories; optional merchandising imagery for each category.
3. **Category detail** — opening a category shows **every product currently published and eligible for sale** in that category, with filters for ready-to-sell or preorder offerings. A product supporting both may appear in both applicable filters without duplicating its underlying product record.
4. **Product detail** — images/gallery, name, clear price, description, options, ingredients/allergens, availability by selling mode and appropriate add-to-cart controls.
5. **Cart** — quantities, configured variations, discounts, fulfillment preference, estimated fees/tax and next steps.
6. **Checkout** — guest or authenticated checkout; secure Stripe-hosted or equivalently secure Stripe checkout integration.
7. **Order confirmation / secure guest status** — payment and order details, chosen fulfillment date/time, communication instructions.
8. **Customer account** — optional registration/sign-in; My Orders, order status, reorder, saved address where appropriate, messages, notification/marketing preferences, and submitted reviews.
9. **Custom order request** — cakes, personalized desserts, trays, large quantities, messages, desired dates, attachments only with appropriate safeguards; request is not automatically accepted or priced.
10. **Gallery** — approved owner-uploaded bakery photographs and previous work, with permission to display customer images when applicable.
11. **FAQ / Policies** — preorder deadlines, pickup/delivery, cancellations/refunds, allergen handling, storage, custom-order process and contact methods.
12. **Contact** — a clear question/special-request form and business contact method.
13. **Privacy / terms / policies / required food disclosures** — accurately worded and jurisdiction-reviewed content.

### 2.2 Category logic

- Admin may **add, rename, reorder, and remove/archive** product categories using an intuitive drop-down/category editor.
- Each product is assigned an approved category; product add/edit uses a category drop-down.
- **Automatic shop visibility:** a category is displayed only when it contains at least one published product genuinely available to purchase under current availability and fulfillment rules. Draft, unpublished and unavailable products do not cause categories to appear as purchasable.
- On choosing a category, open a full category page, not an empty accordion or unrelated product view; show all currently sellable items, with paging/lazy loading if needed.
- Admin can still see/manage empty categories. Category removal must require confirmation and a safe method for reassigning or archiving linked products; do not orphan product records.
- Filters/sorting may include available now, preorder, featured, price and alphabetical order; do not promise availability outside configured dates.

### 2.3 Product detail and configuration

Each sellable product supports:

- Product ID, category, product name, optional short summary, full description, multiple owner-uploaded photographs with display order/alt text.
- Selling mode: **Ready to Sell**, **Preorder**, or **Both**.
- Base price, variation-based price, unit (`each`, `dozen`, `tray`, etc.), quantity and relevant portion/serving size.
- Configurable variations: cake size, flavor, frosting, cookie quantity, package size, decorations; allowed combinations, price adjustments and availability.
- Optional add-ons: gift packaging, custom message, decorations and product-specific special instructions.
- Ingredients, declared major allergens and appropriate storage/shelf-life notes; labels prepared from owner-verified recipe information.
- Featured/bestseller/new/seasonal status when factually appropriate; custom marketing labels are owner-controlled.
- Current selling-mode-specific stock or production capacity, pickup/delivery eligibility, lead time and cutoff requirements.
- Draft/published/unpublished/archived lifecycle.
- Product offer/discount display where genuinely eligible, with original and discounted price shown transparently.

### 2.4 Two selling modes, one catalog

**Ready to Sell:**

- Represents **completed, still-sellable products** in stock, tracked by specific production batch where needed.
- Show live available quantity, optional preparation date/accurate age disclosure, and applicable pickup/delivery windows.
- Quantity declines when payment is confirmed and reservation is finalized; pending checkout temporarily holds it, with expiration and safe release.
- Cannot sell beyond stock; out-of-stock offerings become unavailable or visibly sold out according to owner configuration.
- Prevent expired, disqualified or owner-blocked batches from checkout.

**Preorder:**

- Represents a future production obligation tied to the owner's approved baking/fulfillment calendar.
- Show only eligible fulfillment dates and times based on lead time, cutoff, exceptions, capacity and delivery/pickup availability.
- Reserve dated production capacity at checkout and finalize it on successful payment.
- Maintain product-level capacity and overall production workload constraints so that individually permissible items do not collectively exceed available baking capacity.
- Support specific custom order approval/quotation before payment when the item cannot be priced automatically.

**Both:**

- A single product can have ready-to-sell stock today **and** preorder availability for another date.
- Finished-stock reservations and future-date baking capacity must remain **separate**.
- The cart may contain both modes when they share a compatible fulfillment date/time and method; otherwise clearly require separate orders or checkout groups. Never silently merge incompatible dates.

### 2.5 Cart, guest checkout and accounts

- Guest checkout must not require sign-up; allow optional account creation.
- Authenticated checkout may prefill consented contact/delivery data and show order history.
- Secure order status for guests uses a hard-to-guess expiring/signed access mechanism, not public sequential order IDs alone.
- Calculate items, add-ons, discounts, delivery fee, taxes, total, and any approved deposit/balance terms consistently on the server; customer-visible totals must match Stripe.
- Apply promo codes or automatic offers only when eligible; explain rejected/expired codes.
- Prevent overselling, duplicate orders on repeat callback, unauthorized price changes and stale product/cart pricing.
- Every completed Stripe transaction links to exactly one order record with idempotent webhook handling; do not rely solely on the browser success page.
- Permit order-related gift message and special instructions; quote-only custom requests are kept separate from direct-purchase checkout.
- Support receipts, order acknowledgment, confirmation and status updates.
- Customer account holders can view orders and reorder eligible items, but reorders must revalidate price, availability and dates.

### 2.6 Local pickup and local delivery — both required

**Pickup:** admin-set pickup days, windows, per-window capacity, cutoff and instructions. Avoid publishing a home street address broadly when not necessary; provide the legally required food-label information and private pickup instructions as appropriate.

**Local delivery:** admin-controlled enable switch, approved ZIP codes/territories, dates, delivery windows, capacity, fees (flat or rule-based), optional order minimum, customer address, order instructions, fulfillment state and proof-of-completion notes. Begin with an easy-to-maintain eligible ZIP-code list and a configurable fee; distance pricing is an optional later refinement.

**Unified rules:** only permit dates valid for the basket and method, block blackout/vacation dates, allow separate pickup/delivery calendars and closing dates, and notify customers clearly of changes.

**Shipment messaging:** V1 includes text/templates and event types for **local delivery** (out for delivery, delivered, delayed). Carrier-shipping checkout is **not enabled** until product eligibility, licensing and territorial constraints are reviewed. Tracking-number/carrier integration is FUTURE, though message templates may anticipate it.

### 2.7 Additional agreed customer features

- **Account-only ratings, comments and reviews**; maximum **three photographs per review**, with moderation and clear visibility status.
- **Order-history and guest order-tracking** experiences; guest visitors cannot submit authenticated reviews until an account is created and eligibility verified.
- **Gift orders** and packaging notes.
- **Featured products, verified bestsellers, seasonal/new releases** on home/shop pages.
- **Discount/promo codes**, minimum-purchase rules and accurate offer disclosures.
- **Photo gallery, FAQ, customer support form, announcements** and holiday-order deadline messages.
- **Pickup reminders, order changes, ready notifications, local-delivery status** and other essential communications.

---

## 3. ADMIN PANEL — REQUIRED V1

### 3.1 Overall design and access

- Separate password-protected Admin pages with server-verified authorization; no Admin operations exposed to ordinary customers.
- Owner can manage all business capabilities without editing code.
- Support role-based staff/admin accounts and **alerts appropriate to each authorized role**; Owner has final control of access and publishing rights.
- Unified navigation instead of duplicated sections. Responsive/mobile-accessible layout.
- Audit trail for critical changes such as promotions, refunds, price changes, access changes, inventory overrides and order status edits.
- Protection from accidental destructive actions; archive rather than permanently delete transaction-sensitive data.

### 3.2 Admin navigation map

1. **Dashboard** — new orders, payment verification queue, upcoming pickups/deliveries, production workload, unread alerts, revenues and calculated margins.
2. **Products** — add/edit/archive, category drop-down, description, prices, options, multi-photo upload, draft/publish/unpublish, product-specific promo eligibility.
3. **Categories** — add, rename, reorder, archive/remove and reassignment.
4. **Ready-to-Sell Inventory** — stock levels, dated batches, expiry, safety status, wastage, clearance approvals and adjustments.
5. **Baking & Fulfillment Calendar** — recurring production/fulfillment days, overrides, closures, windows, cutoffs, max orders and workload.
6. **Orders** — verify Stripe payment and order details; manage order status, refunds, pickup, delivery, cancellations and changes.
7. **Custom Orders & Quotes** — special requests, proposed pricing/options/dates, approval/rejection, quotes and secure payment requests.
8. **Recipes & Ingredients** — verified recipes, yields, ingredient units, costing and ingredient inventory.
9. **Production Sheets** — quantities to prepare by date/product/variation/recipe.
10. **Shopping Lists** — quantities to purchase by selected baking day/week, deducting usable on-hand ingredients when appropriate.
11. **Expenses & Reports** — purchases, supplies, payment fees, delivery expenses, revenue, refunds, taxes, net results and reports.
12. **Promotions & Discounts** — all campaigns, customer targeting, item/category/batch restrictions, coupons, limits and schedules.
13. **Announcements & Alerts** — create/edit/remove, preview, schedule, publish, expire and archive public messages.
14. **Messages / Unified Inbox** — customer questions, special-order requests, review notices, order questions and responses.
15. **Reviews** — moderation of signed-in customers' comments/photos and responses.
16. **Notifications** — Admin inbox/badges, customer message templates, preferences, delivery attempts/logs.
17. **Customers** — accounts, eligible order history, communications, marketing preferences and authorized targeting groups.
18. **Website Appearance** — header, home background, banners, logos and galleries using image uploads.
19. **Settings & Compliance** — operating rules, pickup/delivery territories, taxes, policies, user access, data management.
20. **QR Code** — create branded website link QR image and printable PDF.

### 3.3 Product management

- Create new items using category dropdown, name, description, price and **multiple image uploads**.
- Save as draft; preview; publish only when required fields, safety attributes and allowed selling mode are configured.
- Edit, unpublish and archive/delete as permitted. Existing paid orders retain a snapshot of the item as sold.
- Set product as ready-to-sell, preorder or both; configure variants/add-ons, item availability and per-mode promotional eligibility.
- Use image size/type limits, optimization, safe storage paths, metadata and alt text. Banner/product photos must be editable from Admin.

### 3.4 Baking/fulfillment calendar

- Weekly recurring baking days **and** independently configurable one-off date overrides, closures, holidays and vacation mode.
- Distinguish **production/baking day** from **customer fulfillment date** when they are different.
- Choose pickup and delivery options independently; per-day/per-window quantities, order counts and overall workload.
- Set preorder cutoff with both day- and time-based controls (e.g., 2 days before an approved day), plus product-specific lead times where needed.
- Customers never see invalid/closed dates; a pending checkout must revalidate availability before purchase.
- Display local `America/Chicago` time consistently, including daylight-saving transitions.
- Alert owner about overcapacity, imminent production dates, missed pickups and schedule changes.

### 3.5 Orders, status and verification

- Order inbox and verification queue with customer contact, guest/account marker, line items/variants, totals, taxes, discount, fees, payment status, selling modes, scheduled fulfillment and notes.
- Owner-requested fulfillment statuses: **New → Confirmed → Baking → Ready → Completed** (skip the physical baking stage for a ready-to-sell product where appropriate).
- **Separate** payment state: Pending, Paid, Failed, Refunded, Partially Refunded, etc.; canceled and no-show states tracked without rewriting payment facts.
- Show Stripe event/reference, reconciliation details and authorized refund actions. Payments cannot be marked successful on browser redirect alone.
- Support customer cancellation/change requests with policy enforcement, manual review and appropriate notifications.
- Provide print-friendly daily order sheet, packing list and pickup/delivery manifest.

### 3.6 Recipe, inventory, production and purchasing

- Recipe library: recipe name, yield/batch size, ingredient, quantity and unit, preparation notes and ingredient substitution changes (controlled).
- Ingredient/supply library: purchase unit, unit conversion, cost, available stock, waste and package size.
- Production sheet groups confirmed orders by baking date and required recipe yield (e.g., number of batches).
- Shopping list generator takes a selected day or week, sums recipe requirements from qualifying orders, scales by yield, accounts for applicable usable stock, and produces quantities to buy by ingredient and packaging type. Manual overrides and printable/CSV export supported.
- Finished inventory records batch ID, product/variant, quantity, preparation date, approved sale-through date, disposition, and reserved/sold/remaining quantities.
- Distinguish a purchase (cash outflow) from ingredients actually consumed in a particular sale when reporting margins.

### 3.7 Financial management and reporting

- Track **revenue, expenses, and net gain/loss** for a selected period, with visible definitions.
- Sales filters: date range, product, category, selling method, fulfillment type, promo campaign and bestsellers; customer privacy maintained.
- Expense entry: date, vendor, item/supply, category, cost, quantity, receipt optional, tax and allocation where appropriate.
- Financial views must separate: gross product sales; discounts; net product sales; sales tax collected (liability, not earnings); delivery revenue; returns/refunds; Stripe/payment fees; ingredient usage; packaging; delivery costs; labor estimate; other recorded expenses.
- Show **estimated product/order contribution margin** separately from **period cash profit/net result**. Do not present estimates as audited accounting profits.
- Calculate results using actual records when available; missing recipe/expense data is displayed as incomplete, not silently treated as zero.
- Provide date filtering, total revenue per order/baking day/week, bestsellers and downloadable/printable CSV or report formats.
- Pricing calculator may estimate suggested product pricing from ingredients, packaging, effort/labor allowance, Stripe fees and desired margin; recommendations are not automatically applied.

---

## 4. ADMIN ANNOUNCEMENTS & ALERTS MANAGER — REQUIRED V1

A centralized module for creating and controlling store-visible messages and site alerts.

### 4.1 Create, modify and publish

- **Add, edit, remove/archive, duplicate, preview, schedule, publish, unpublish and expire** announcements.
- Fields: unique ID, internal campaign name, public title, body/message, optional uploaded graphic, category/type, placement, audience, priority, linked action/product/category, start and end timestamps, draft/scheduled/live/expired/archived status.
- Types: General, Promotion, Holiday, New Product, Production Schedule, Pickup/Delivery Change, Closure, Urgent Service Notice.
- Placements: top site banner, homepage section, Shop page, selected category/product pages, customer account notice area.
- Audience: all site visitors, all signed-in customers, or individually selected/eligible customer groups as appropriate; Admin-only notices are not public announcements.
- Scheduled messages activate/expire based on America/Chicago local schedule; no manual editing needed at midnight.
- Owner can view the exact mobile/desktop message before publishing.
- Priority/urgent notices must not obscure checkout controls or create inaccessible dialogs.
- Historical publication and edit audit details are preserved.

### 4.2 Boundaries

An **announcement** displays information on the site. A **notification** actively delivers a message to an account/email. A **promotion** changes eligibility/price under defined rules. The modules may be linked but must remain distinct so that a banner saying '15% off' never creates an unconfigured discount by accident.

---

## 5. PROMOTIONS, COUPONS & CUSTOMER TARGETING — REQUIRED V1

### 5.1 Campaign management

Owner may create, configure, edit before/within permitted lifecycle, activate, pause, end, archive and audit a promotion.

Required campaign settings:

- Name, internal purpose, public terms, type (**percentage** or **fixed currency amount**), amount, optional maximum deduction and minimum spend.
- Scope: **selected products**, **selected product variants**, **selected categories**, **specified ready-to-sell batches**, or all eligible products.
- Eligibility by selling mode: ready-to-sell only, preorder only, or both (where sensible).
- Customer audience: all eligible customers, selected account IDs, returning customers, first-order customers, or other owner-defined qualifying cohorts; guest eligibility must be explicitly governed.
- Distribution: automatic eligible checkout discount, code entered at checkout, individually assigned coupon or specific permitted customer notification campaign.
- Start/end date and local time, scheduled activation/expiry, redemption cap, customer-use cap, quantity/purchase minimum, restrictions, optional link to announcement.
- Price/margin impact preview, campaign status and redemption report.
- Select whether the discount applies to one or several eligible items; calculate correct totals when noneligible items share the cart.

### 5.2 Agreed use cases

- Holiday or seasonal sales, including Christmas/Thanksgiving offers.
- A selected cake, cookie, pie or other product promotion.
- Category-based campaigns for currently sellable products.
- Targeted thank-you or returning-customer offers; private promo codes for selected customers.
- First-purchase/first-order promotion where customer eligibility can be reliably assessed.
- Limited-quantity specials and timed weekend offers.
- Inventory-batch-specific clearance for older-but-eligible finished baked goods and unclaimed orders **after separate release and food-safety approval**.

### 5.3 Pricing and redemption safeguards

- **Discount stacking disabled by default**. Allowing exceptions would require explicit owner rule and conflict-resolution specification.
- No negative totals; promotion cannot silently change tax/fees or override minimums without documented rules.
- Keep product/list price, discount, net price, applicable tax and transaction snapshot in each order.
- Server/database decides eligibility. Do not trust browser-calculated discounts or customer-editable coupon metadata.
- Protect single-use codes and customer-assigned offers from unauthorized sharing; prevent repeated redemption during simultaneous checkouts.
- Do not allow an expired/ended promotion to affect a newly created checkout. Define what happens to already-open checkout sessions.
- Preview estimated ingredient/packaging/processor/delivery margin impacts; warn about likely below-cost promotions, with final owner authorization where applicable.
- Promotion campaigns and announcement posts may be scheduled separately, but their effective dates should be visibly cross-checked.

### 5.4 Stripe integration

Use Stripe Checkout and supported coupon/promotion-code capabilities where practical. More specific restrictions such as production-batch eligibility, customer selection and clearance approval require application-side rules and server-side validation. Store Stripe IDs separately from internal promotion IDs. Payment event handling must be idempotent.

---

## 6. READY-TO-SELL CLEARANCE, OLDER GOODS & MISSED PICKUPS — REQUIRED V1

Owner wants to recover value from eligible baked goods not picked up or no longer baked that same day. This feature **must not** result in unsafe or unauthorized resale.

### 6.1 Controlled workflow

1. Record original production batch, preparation date, handling/storage requirements, sale-through/expiration date and current status.
2. If previously assigned to a customer order, determine whether the order is legitimately abandoned/canceled and what refund/release obligations apply. **No automatic transfer of another customer's goods.**
3. Owner inspects and explicitly records whether remaining goods are **eligible** for sale under applicable law, product safety requirements and handling history.
4. If ineligible, mark blocked/discarded; remove from public inventory and record waste/cost.
5. If eligible, owner may release quantity to ready-to-sell inventory, add honest condition/age information, assign a **batch-scoped** sale price/discount and availability window.
6. Storefront shows accurate preparation/freshness wording. Never describe a prior-day bake as baked today.
7. Inventory automatically becomes unavailable when quantity is gone, sale-through window ends or owner withdraws approval.

### 6.2 Prohibitions

Never resell goods previously handed to/handled by another customer, products requiring unverified cold chain, improperly stored goods, expired goods or food otherwise not legally eligible for the home operation. 'Clearance' cannot bypass labeling, allergen or safety checks.

---

## 7. UNIFIED MESSAGES, REQUESTS, REVIEWS & NOTIFICATIONS — REQUIRED V1

### 7.1 Unified Admin inbox

One inbox with source/type, sender, associated account/order, subject, time, urgency, unread status, assignment, reply thread, resolution state and searchable history.

Sources must include:

- Customer general contact message or question.
- Order-specific message, pickup/delivery note or requested change.
- Special-order/custom cake request with preferred date and details.
- Quote acceptance, change request or required payment follow-up.
- Customer review/comment and up to three uploaded images requiring moderation.
- New order requiring verification, payment exceptions and refunded/canceled orders.
- Production capacity, expiring stock, missed pickup and schedule alerts.
- Admin-to-customer reply and customer response.

Permissioned Admin accounts receive real-time-ish in-app unread badges/alerts for **relevant** events; email alerts can be configured per account/role and must respect rate limits. Staff cannot access unrelated customer information merely because they have an Admin login.

### 7.2 Custom orders and quotations

- Customer can request customization, pickup/delivery date, desired item details, contact data and attached reference images if approved.
- Owner reviews feasibility, optionally asks clarifying questions, quotes item/total price, conditions and expiration date.
- Customer may accept quote and pay using an approved Stripe secure flow; quote acceptance does not bypass scheduling/capacity or payment confirmation.
- Quote/request state: New, In Discussion, Quoted, Accepted, Declined, Expired, Converted to Paid Order (exact labels may be refined in implementation).
- Requests and quote revisions remain in message history; notify both parties of replies or material changes.

### 7.3 Customer messaging classes

**Transactional/operational (not promotional):** order acknowledgment; Stripe payment confirmation/receipt; order confirmed; pending payment on an accepted quote; baking progress if enabled; ready for pickup; pickup reminder; out for local delivery; delivered/completed; delay/change/cancel/refund; secure response to a customer inquiry.

**Marketing:** holiday offers, discounts, promotion codes, launch specials, selected-customer offers and unrelated promotional recovery messages. These require applicable notice/permission rules, preference controls and opt-out handling. Do not silently market to all people who once placed an order.

**Admin alerts:** new order, payment exception, unread message, special order, review moderation, low inventory, impending baking day, missed pickup, unsafe/expired batch, campaign issue, notification failure.

### 7.4 Required notification events matrix

| Event | Admin | Customer |
|---|---|---|
| Order placed / verification pending | Relevant staff alert | Acknowledgment with status, not false payment success |
| Stripe payment confirmed | Relevant staff alert | Receipt/confirmation |
| Order accepted/confirmed | As needed | Date/time and method confirmed |
| Baking started | Optional | Optional progress notice |
| Order ready | Relevant staff | Pickup instructions or delivery expectations |
| Pickup approaching / not collected | Missed-pickup escalation | Timely reminder under published policy |
| Out for local delivery / delivered | Relevant staff | Delivery status and instructions |
| Schedule changed or order delayed | Relevant staff | Prompt operational update |
| Custom request / new quote / reply | Relevant staff | Request acknowledgment, quote or reply |
| Quote/payment due | Relevant staff | Approved secure payment link/reminder |
| Review submitted | Moderator alert | Review received / published decision as appropriate |
| Promotion scheduled/launched | Campaign status | Eligible recipients only where legally permitted |
| Promotion expires | Campaign status | No unsolicited expiry marketing without proper permissions |
| Email delivery failure | Owner/Admin alert | Retry/fallback policy as appropriate |

### 7.5 Delivery channels and preferences

- **V1 baseline:** In-app Admin notices + on-site account inbox + essential transactional emails, subject to free-tier capacity and provider approval.
- **V1 marketing:** consent/preference-aware promotional email if properly configured; allow segmentation, targeted recipient lists, suppression and unsubscribe.
- **V1 abandoned/unfinished checkout:** an optional reminder only when contact and lawful messaging basis exist; never treat an unpaid abandoned cart as an order; do not expose checkout links to the wrong person.
- **FUTURE:** SMS reminders/marketing, depending on cost and consent; do not assume texting is free.
- Support individual Admin email notification settings, Admin role scopes, customer communication preferences, per-event templates, retry/error states, send history and basic rate limiting.
- Do not place an announcement or marketing campaign into a required order email in a way that misclassifies a promotional message as purely transactional.

### 7.6 Reviews, comments and images

- **Must be signed into an account** to submit a public product review/comment.
- Accept at most **3 review images** per review, with safe formats, file size caps, malware/abuse protections and access-controlled upload process.
- Owner can inspect, approve, reject, remove/hide, reply and audit moderation decisions in Admin.
- Recommended: restrict verified-purchaser designation to genuinely matched paid/completed orders; do not fabricate reviews.
- Obtain permission/terms for reuse of customer photos in public promotions/gallery; control personal information in photos.

---

## 8. WEBSITE APPEARANCE AND MARKETING ASSETS — REQUIRED V1

- An Admin **Website Appearance** page can upload, preview, replace and remove the **homepage background** and **header/banner images**.
- Additionally manage logo, promotional banners, category photos, product galleries, image crop/position, link targets and accessible alt text.
- Theme should remain consistent with a warm, clean home-bakery identity: cream/honey/earth tones, readable headings and restrained decoration.
- Responsive image sizes and compression are mandatory to limit storage/bandwidth costs and improve mobile performance.
- Homepage supports rotating or selected featured products, promotion teaser, upcoming preorder schedule and announcement banner without requiring a developer.
- Owner receives a warning before replacing shared artwork used in active campaigns.

---

## 9. QR CODE — REQUIRED V1

- Owner can enter/use the published public website URL and generate a QR code.
- Download **PNG image** and **print-friendly PDF** for packaging inserts, flyers, signs and online sharing.
- Include optional bakery name/logo and readable destination URL without reducing scan reliability.
- QR code must lead to the actual canonical public website, and should be regenerated/redirect-managed if the domain changes.
- Test scan on common phone cameras before printing.

---

## 10. SECURITY, RELIABILITY, ACCESSIBILITY AND DATA QUALITY

### 10.1 Security and authorization

- Customer authentication optional for checkout, **required for reviews/photo submissions** and personalized account history.
- Secure Admin/staff authentication and server-enforced roles/permissions; least-privilege access; recommend stronger Admin login protections, session expiry and secure recovery.
- Protect guest order links, customer addresses, messages, review photos, uploaded images and financial records against cross-account access.
- Use strong database Row Level Security (RLS) or equivalent server-side authorization; no public credential or service-role key in browser code.
- Validate images server-side (type, size, authorization), strip unnecessary metadata when practical, block executable formats and avoid public exposure of private uploads.
- Store Stripe secrets and email keys only in appropriate server/hosting secret configuration, never committed to GitHub.
- Stripe verifies signed webhooks; handle duplicate/out-of-order events and expired sessions safely.
- Audit changes to stock, promotions, prices, permissions, refunds and manual order adjustments.
- Rate-limit login, contact, review uploads and promotion-code guessing; deploy anti-spam protection when needed.
- Customer data minimization, privacy/retention policy, deletion/request handling, backup and tested restore procedure.

### 10.2 Operational correctness

- Prevent two simultaneous buyers from purchasing the last item; inventory and capacity reservations need atomic database operations.
- Expired checkout reservations release quantity/capacity automatically; reconciliation catches failed or delayed payment callbacks.
- Order line item snapshot preserves historical product name/price/options even if product later changes.
- No default fake products, guessed allergens, fabricated stock, unspecified tax or placeholder customer data published to live shoppers.
- Draft/disabled mode is acceptable for incomplete products/features; do not show customers a broken purchasing flow.
- Log external service failures, prevent double charge/duplicate email as far as technically possible, and expose clear action needed to Admin.

### 10.3 Usability/accessibility

- Phone-first responsive design, usable checkout buttons, touch targets, readable content, keyboard controls, focus states, field labels, accessible errors, high-contrast important notices and alt text.
- Plain-language Admin workflows, contextual help and confirm-before-delete actions.
- Never show a confirmation like 'Payment received' until the relevant payment status is verified.

---

## 11. PROPOSED TECHNICAL APPROACH AND COST CONTROLS

**Technical recommendation, not an owner-approved implementation choice yet:** A custom site likely fits this uncommon combination of production calendar, split inventory modes, batch clearance, targeted promos, unified Admin workflows and financial costing better than basic storefront templates. It does, however, require ongoing maintenance, backups and security updates.

### 11.1 Platform choices — pros and cons

| Option | Advantages | Weaknesses for this project | Assessment |
|---|---|---|---|
| Shopify | Easier hosted storefront and payment ecosystem | Ongoing subscription, third-party apps/custom development for advanced baking/production workflows | Less suitable for strict $0 recurring goal |
| Squarespace | Beginner-friendly design/editing | Subscriptions and advanced scheduling/inventory workflow limitations | Good for simple brochure/store, not the complete Admin operations center |
| WordPress + WooCommerce | Highly configurable; ownership/control | Hosting/security/updates/plugins require maintenance; advanced features can cost extra | Possible alternative, but not automatically free or simpler |
| Custom Cloudflare + Supabase + Stripe | Tailored workflows; potential small-scale free hosting/database; owner-facing custom Admin | Engineering effort and responsibility for ongoing operations/security | **Preferred planning direction, subject to practical validation** |

### 11.2 Proposed stack

- **Front end / hosting:** Cloudflare Pages or equivalent low-cost static app hosting; server-side functions/Workers for privileged actions.
- **Database:** Supabase PostgreSQL for products, customers, orders, promos, dates, messages, recipes, finance and reporting.
- **Authentication:** Supabase Auth or comparable provider for staff and optional customers. Guest checkout remains supported.
- **File/image storage:** Supabase Storage or comparable object storage for product images, banners, galleries, review images and protected uploads.
- **Payments:** Stripe Checkout, supported coupons/promotion codes and verified webhook events; no card data stored by the bakery application.
- **Email:** Transactional email service with valid domain authentication and realistic sending quota/cost; select only after verifying free-tier suitability.
- **Scheduling:** Reliable server-side scheduled processing for announcement windows, reminders, release of expired reservations and production alerts.
- **QR:** In-app generator with PNG and print-friendly PDF export.

### 11.3 Costs and cautions

- Aim for **$0/month software/hosting while within free-tier allowances**, but do not promise a free commercial production site indefinitely.
- Stripe charges processing fees on real transactions. Domain purchase/renewal, email sends, image storage/egress, backups or paid hosting may incur fees.
- Supabase free-tier database/storage/bandwidth quotas and inactivity behavior are real operational constraints; avoid treating a project that may pause from inactivity as guaranteed high-availability production infrastructure.
- Check current provider pricing before account creation and before public launch; no specific free quota or fee in this requirements document is guaranteed.
- Start on an eligible free hosting subdomain if desired; connect a purchased custom domain later without changing store URLs unnecessarily.
- The owner is **not** expected to modify code to manage products, schedules, promos or daily orders. Development source code can be provided later in independently testable, complete pieces.

---

## 12. CONCEPTUAL DATA MODEL — PROPOSED ENGINEERING BASELINE

These are entities/records to design, **not** a claim that database tables already exist.

| Entity group | Key records and relationships |
|---|---|
| Identity & access | `users`, `customer_profiles`, `staff_roles`, `permissions`, `notification_preferences`, `marketing_consents` |
| Catalog | `categories`, `products`, `product_variants`, `product_media`, `add_ons`, `recipe_links`, `product_availability` |
| Ready inventory | `finished_batches`, `batch_stock_movements`, `batch_quality_decisions`, `stock_reservations`, `waste_records` |
| Baking schedule | `recurring_rules`, `calendar_exceptions`, `production_days`, `fulfillment_windows`, `capacity_limits`, `capacity_reservations` |
| Cart and payment | `carts`, `cart_items`, `orders`, `order_items`, `order_status_history`, `payment_transactions`, `stripe_event_log`, `refunds` |
| Delivery | `service_areas`, `pickup_settings`, `delivery_fees`, `fulfillment_events`, `pickup_or_delivery_details` |
| Recipes/purchasing | `ingredients`, `recipe_versions`, `recipe_ingredients`, `purchase_units`, `ingredient_stock`, `purchase_entries`, `shopping_list_runs`, `production_plans` |
| Campaigns | `promotions`, `promotion_rules`, `promotion_products`, `promotion_batches`, `promotion_audiences`, `coupon_redemptions`, `campaign_messages` |
| Site notices | `announcements`, `announcement_placements`, `announcement_audiences`, `media_assets` |
| Messages/reviews | `conversations`, `messages`, `custom_order_requests`, `custom_quotes`, `reviews`, `review_images`, `review_moderation_events` |
| Notifications | `notification_events`, `notification_inbox`, `notification_templates`, `delivery_attempts`, `unsubscribes`, `suppression_list` |
| Finance/admin | `expense_entries`, `expense_allocations`, `report_periods`, `audit_events`, `business_settings`, `tax_rules` |

Critical integrity rules:

1. Separate finished-stock inventory from future production capacity, even for the same product.
2. Transactionally reserve/release stock or capacity; never allow negative available quantity.
3. Scope private customer/guest/order information to its authorized owner or staff permission.
4. Preserve paid-order snapshots for prices, discounts, options, tax and required fulfillment terms.
5. Store promotions by rules/eligible associations; do not mutate all product list prices to run a sale.
6. Track promotion redemption exactly once for a successful order; reconcile refunds/cancellations according to published policy.
7. Keep announcements, promotions and notifications as linked but distinct entities.
8. Support idempotent Stripe webhook processing with durable event IDs.
9. Store ingredient cost assumptions and actual purchase/usage records separately.
10. Keep time values as UTC internally with bakery local time zone shown in the interface.

---

## 13. REQUIRED PAGE / WORKFLOW ACCEPTANCE TESTS

The following tests define the V1 completion standard. An untested item is **not** a verified pass.

| Test ID | Scenario | Expected result |
|---|---|---|
| CAT-01 | Admin creates a new category and published sellable product | Category appears and opens a page showing its eligible products |
| CAT-02 | Last eligible product unpublished/sold out | Empty category automatically disappears publicly, remains in Admin |
| CAT-03 | Product has both modes | Ready inventory and future preorder availability are correct and independent |
| INV-01 | Two customers attempt to buy the last pie | Only one paid order can claim the final unit; no oversell |
| INV-02 | Pending Stripe checkout expires/fails | Held stock/capacity releases; order not falsely marked paid |
| INV-03 | Batch expires/is blocked | Product from that batch cannot be purchased |
| CAL-01 | Owner sets baking days, limits and 2-day cutoff | Checkout offers only valid dates and closes precisely on time |
| CAL-02 | Owner enables vacation blackout | Ineligible dates are not offered; existing orders flagged for review if necessary |
| CAL-03 | Combined items exceed workload cap | Checkout refuses overcapacity even if individual product caps are not exceeded |
| FUL-01 | Pickup and delivery enabled separately | Customer can choose only valid method, area, window and fee |
| FUL-02 | Items need incompatible dates | System explains problem and offers separate-order path |
| PAY-01 | Stripe payment success webhook received | Exactly one paid order created/updated, reserve finalized, receipt sent |
| PAY-02 | Duplicate webhook delivered | No duplicate order, stock reduction or campaign redemption |
| PAY-03 | Refund initiated/confirmed | Payment, order and financial reports reconcile; authorization enforced |
| ADM-01 | Unauthorized user visits Admin/API | Access denied regardless of client UI |
| ADM-02 | Owner updates home background/header images | Visible, optimized change appears on phone and desktop |
| ANC-01 | Announcement scheduled for date window | Publishes/expires automatically to selected placement/audience |
| PRO-01 | Product- or category-specific promotion | Only eligible items receive correct discount |
| PRO-02 | Selected customer offer shared with unauthorized account | Code/assignment rejected; redemption cap enforced |
| PRO-03 | Campaign end date or usage limit reached | No new discount can be redeemed |
| PRO-04 | Batch clearance campaign | Only owner-approved eligible batch is discounted; future preorders retain full pricing |
| CLR-01 | Uncollected order or prior-day goods flagged | Cannot be re-listed until original order disposition and explicit safety approval |
| MSG-01 | Customer sends custom request / message | Appropriate Admin accounts receive visible inbox notification |
| MSG-02 | Admin responds / quote issued | Correct customer receives secure reply/payment instructions |
| REV-01 | Guest attempts review upload | Sign-in required |
| REV-02 | Signed-in customer uploads 4 review photos | Fourth image rejected; max 3 accepted with validation |
| REV-03 | Review awaiting moderation | Not publicly published before approved according to policy |
| NOT-01 | Order status changes to Ready | Customer receives intended essential notice without marketing opt-in requirement |
| NOT-02 | Customer opts out of marketing | Future marketing suppressed, essential operational notifications unaffected |
| FIN-01 | Ingredient purchase and ingredient usage entered | Expense/margin reports distinguish cash spending from consumed cost |
| FIN-02 | Discounts/refunds/delivery/Stripe fees recorded | Net report uses correct components; sales tax is not profit |
| QR-01 | QR downloads as PNG/PDF | Both point to correct live domain and scan on mobile |
| MOB-01 | Main customer and Admin workflows on small-screen mobile | Responsive, accessible, no clipped checkout controls |
| SEC-01 | Cross-account review/order/message access | Private data remains inaccessible to unauthorized users |

Acceptance evidence should include code revision, test scenario, expected vs actual result, test account/role, date, and any unresolved defects. The owner's agreement with this **design** is not the same as implementation or legal certification.

---

## 14. PHASED BUILD PLAN — COMPLETE V1, MANAGEABLE PARTS

Each phase must be usable/testable, with simple setup instructions for a non-developer. **The owner has requested only this first Markdown file now; none of these phases are authorized as current work by this document.**

### Phase 1 — Platform foundation, storefront and checkout

- Choose/establish repository, hosting, database, Stripe test environment and secure configuration.
- Set up public layout, branding, category/product browsing and product photo management.
- Create guest/account paths, cart, ready-to-sell + preorder selection, schedule and capacity validation, Stripe sandbox checkout and webhook reconciliation.
- Ensure no stock overselling or false payment confirmation. Deliver working code with setup instructions and test checklist before continuing.

### Phase 2 — Bakery operations

- Admin product/category editor; calendar and blackout controls; inventory batches; orders and payment states.
- Local pickup and delivery rules and customer instructions; production sheets, recipes, ingredient costs, shopping lists and expense capture.
- Print/CSV output and dashboard core KPIs.

### Phase 3 — Communications and website administration

- Unified inbox, custom-order quotation flow, reviews with max three photos, role-aware Admin alerts.
- Transactional customer emails, messaging history, review moderation, appearance editor, announcement scheduling and QR exports.

### Phase 4 — Promotional engine and automation

- Product/category/batch/customer-specific coupons and automatic discounts; scheduling and audience eligibility.
- Clearance inspection/release controls, campaign reports, marketing preferences and consent-aware delivery.
- Payment/quote reminders, checkout follow-up where permitted and notification send logs.

### Phase 5 — Finance, full validation and launch readiness

- Financial filters, actual-vs-estimated costs, bestsellers and period results.
- Legal/tax/food label configuration validated by appropriate professionals or authorities.
- Full device, accessibility, security, load/concurrency, stock, payment sandbox, refund and messaging tests.
- Domain/production deployment and backup/restore testing **only after owner separately authorizes implementation and release**.

---

## 15. FUTURE FEATURES — PRESERVED, NOT V1 BLOCKERS

- Customer favorites and wishlists.
- Digital gift cards.
- Customer loyalty/rewards program.
- Recurring baked-goods subscriptions or scheduled repeat orders.
- Automated SMS messages and SMS marketing after cost/consent review.
- Carrier shipping, labels and tracking integrations **only after legal/operational clearance**.
- Distance-based delivery calculation and delivery-route optimization if volume warrants it.
- Sophisticated customer segmentation, marketing automation or analytics requiring paid integrations.

These items should remain visible in the roadmap, but should not delay the first complete operational store unless owner reprioritizes them.

---

## 16. NIXA, MISSOURI — REGULATORY, TAX, PRIVACY AND OPERATIONAL REVIEW

**Status: Research references, not a legal finding or license determination.** Verify legal and tax applicability to actual products, pickup activity, delivery services, kitchen practices and company structure before accepting live orders.

1. **Missouri cottage-food law — RSMo 196.298.** Defines eligible home-production categories, excludes potentially hazardous baked goods as defined by rule, addresses labeling, and restricts internet sales under the cottage-food exemption where the producer/purchaser are not both in Missouri. Verify that each proposed cookie, cake, pie, filling, frosting and delivery arrangement qualifies. Source: <https://revisor.mo.gov/main/OneSection.aspx?section=196.298>.
2. **Missouri DHSS home-based kitchen guidance.** Provides practical labeling and home-producer guidance; check current applicable requirements. Source: <https://health.mo.gov/safety/foodsafety/pdf/home-based-kitchen-food-prod-guidance.pdf>.
3. **Nixa licensing and home-business status.** City guidance distinguishes retail sales and home-based exemptions; the municipal code references the state-defined no-impact home-based business rule. The facts of this operation (including pickup activity and retail sales) must be reviewed with the City and, if necessary, Christian County. Do not infer that all home bakeries are automatically exempt. Sources: <https://www.nixa.com/business-licensing/>, <https://ecode360.com/50995481>, and <https://revisor.mo.gov/main/OneSection.aspx?section=71.990>.
4. **Missouri sales tax.** Some qualified food sales may receive a reduced state rate but local tax and classification rules still apply; do not hardcode a guessed rate. Source: <https://dor.mo.gov/taxation/business/tax-types/sales-use/reduction-on-food.html>.
5. **Food allergens.** Build ingredient/label fields for nine major allergens (milk, eggs, fish, crustacean shellfish, tree nuts, peanuts, wheat, soy and sesame); validate specific legal requirements for the chosen products. Source: <https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies>.
6. **Marketing email and privacy.** Distinguish order notices from advertising. Provide an effective unsubscribe and honor opt-outs in accordance with applicable law, including CAN-SPAM. Source: <https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business>.
7. **Stripe payment reliability.** Rely on authenticated server-side event handling and reconciliation; do not mark orders paid because the customer visited a successful-looking screen. Source: <https://docs.stripe.com/payments/existing-customers?platform=web&ui=stripe-hosted>.
8. **Handling of home address.** Avoid unnecessary publication of residential pickup details online, but do not suppress address data that legally must be provided on a physical product label. Seek appropriate clarification if privacy and statutory label obligations differ.
9. **Pricing and terms.** Clearly publish cancellation, refund, failed pickup, order-change, reservation, delivery, special-order and abandoned goods policies before allowing transactions.

---

## 17. OPEN BUSINESS SETTINGS AND ASSUMPTIONS

**These are not reasons to discard approved functionality.** They are values the owner can enter later through setup/Admin, and they should be separately confirmed before activating affected functionality.

| Setting | Current status / implementation approach |
|---|---|
| Business/public website URL and GitHub repository | Not selected in this discussion; do not invent URLs or repository IDs |
| Exact pickup site/address and instructions | Private owner entry, with compliance review |
| Delivery ZIP codes, radius, schedule, flat fee and minimum | Owner configurable; not specified yet |
| Weekly baking days, time windows, holiday closures, lead times | Owner configurable; no example date treated as a real opening |
| Max daily product quantities, kitchen workload and inventory shelf-life | Owner configurable with safe defaults and review |
| Real product catalog, photos, recipes, prices, category lineup | Owner data required; sample photos/values are not approved live content |
| Custom-order pricing, deposits and final payment policy | Full checkout payment is simplest proposed default, but deposit choice remains open |
| Discount maximums, exceptions to no stacking, per-customer limits | Owner configurable; no stacking default recommended |
| Promotional marketing distribution provider and opt-in flow | Must be selected and verified before campaigns are sent |
| Food product legality, prep-age disclosure, resale and storage | Item-by-item verified before publication |
| License/permit, entity/business registration, sales tax setup | Local/state review needed |
| Checkout shipping | Disabled; local pickup and local delivery approved |
| Staff/Admin accounts and exact permissions | Owner creates; suggested role model needs approval |
| Provider accounts, budget beyond $0, domain choice | Open; free-tier constraints must be validated |
| Backup, mail-sending limits, privacy/data retention, terms | To be configured and tested |
| Exact order cutoff and failure/reminder timing | Admin-configurable; not hardcoded from examples |

---

## 18. OWNER APPROVAL AND SCOPE BASELINE

The owner expressly approved all discussed functionality and asked that it be captured **together in this first, manually uploaded GitHub file**. This covers:

- Category-based shop pages with automatic empty-category hiding.
- Product photos/prices/descriptions, guest checkout, optional accounts, review/comments and a maximum of three uploaded review photos per signed-in account.
- **Both preorders and ready-to-sell goods**, with separate inventory and capacity.
- **Both local pickup and local delivery**; delivery/shipment-related messages, with carrier shipping not yet active.
- Product/category management, configurable dates/cutoffs/limits, order verification and statuses, header/background management.
- Dashboard, recipes, ingredient costs and shopping lists, financial/expense tracking and filtered sales reports.
- Announcements/alerts with edit/delete/archive, target placements, audiences and scheduling.
- Product/category/batch/customer-specific discounts, promotions, holiday offers, clearance with owner approval, customer targeting and coupon-code delivery.
- Unified customer messages, special requests, custom quotes, Admin alerts for authorized accounts, customer notices, payment reminders and consent-controlled promotional communication.
- Photography gallery, featured items, gift options, FAQ, policies, printable QR PNG/PDF, mobile quality, affordability and secure implementation.
- Future ideas preserved but distinguished from V1 commitments.

**Do not quietly reverse an approved decision.** If technical/security/food-law evidence reveals a conflict, record the issue, the proposed compliant alternative and the Owner decision before changing the scope. **This document does not itself implement code, connect service accounts, authorize charging cards, or certify legal compliance.**

---

### End of document
**Document ID:** MBB-PRD-001  
**Version:** 1.0  
**Status:** Owner-approved functional requirements; proposed implementation architecture; external legal/tax checks pending.  
**Control:** Changes should be recorded in the revision history and approved before replacing this baseline.
