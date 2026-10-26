# Mamma Bee's Bakery — GitHub-Ready Website Repository

**Version:** 0.1.0 — working-code starter, not a completed or independently certified production release  
**Requirements baseline:** `docs/Mamma_Bees_Bakery_V1_Master_Project_Requirements.md` (Owner-approved Version 1)  
**Project:** Mamma Bee's Bakery, Nixa, Missouri  
**Prepared:** 2026-10-26  
**Repository:** To be created manually by owner  
**Google Drive location:** Not established  
**Document ID:** `MBB-CODE-001` (internal identifier, not a GitHub-generated ID)  
**Status:** Source code prepared; database deployment, connected tests, live commerce and legal/tax acceptance **not completed**

## What is inside

This ZIP is a **repository folder** you can unzip and upload to a new GitHub repository. It contains an original, responsive bakery storefront, owner Admin interface, database schema, secure Cloudflare Pages server endpoints, check scripts, a QR-code tool, and the complete approved requirements document. It contains **no product listings, customer accounts, passwords, payment keys or made-up sales**.

### Implemented in this initial code package

- Mobile-first homepage, category pages, product photos, featured items, product detail and cart.
- **Category links open full category pages**. Empty/unavailable categories are hidden in the basic storefront filter.
- Separate **ready-to-sell** inventory batches and **preorder** products using one product catalog.
- Configured fulfillment days and windows; pickup/local-delivery selection, postcode checks, production capacity and lead-time checks in the database checkout function.
- Guest checkout and Supabase Auth registration/sign-in for optional customer accounts.
- Stripe-hosted Checkout (test/live gated) with server-side price checks, reservation locking, and signed webhook processing.
- Guest order tracking by long random token; registered customer My Orders and in-app notifications.
- Owner/Admin role checks using the database, product/category management, gallery uploads, inventory, baking calendar, order statuses, customer requests, review moderation, announcements, coupons, audience records, expense/recipe/ingredient entry, basic sales reporting and shopping-list calculations.
- Marketing offers to **opted-in account inboxes** for active, eligible promotions (not bulk email or SMS).
- Production safety defaults: real checkout disabled until the owner completes settings, credentials, Stripe Tax review and testing. Private server secrets never belong in public `site/config.js`.

### Not yet implemented or validated (still REQUIRED by approved V1 scope)

This is not being silently deleted from V1. The following require further code and acceptance work:

- Verified end-to-end live Supabase migration and Stripe TEST checkout/webhook tests; no third-party accounts have been configured by this ZIP.
- Complete product variation and add-on pricing/selection at checkout; current base-price purchases do not support owner-created variants despite the database holding an initial `variants` field.
- Automatic no-code promotions without a coupon, robust per-recipient targeting interface and scheduled outbound marketing delivery.
- Transactional **email delivery**, abandoned-checkout/payment reminders, optional local-delivery push messages, and shipment-carrier extension. In-app notification records work in the database; external email sending is not set up.
- Staff review/reply notifications visible to customers, and public display of approved customer-uploaded photos (photos are kept private until a safe approval display path is built).
- Owner-approved refund integration with Stripe, proper discounts for partial refunds, dispute handling and customer-account deletion/export workflow.
- Tax-code-specific checkout and delivery tax treatments. Current checkout uses a single aggregated Stripe Tax line item and requires expert review before actual commerce.
- Fully correct public category/sellout visibility under concurrent reservations, tax reporting by category, batch cost allocation, reconciliation of refunds and actual profit, and comprehensive production calendar operations.
- An **Admin download button** for QR PNG/PDF (the repository instead includes a command-line QR generator under `tools/`).
- Guest-message Turnstile setup; signed-in customers can message through Auth, but guest messages require Turnstile keys.
- Automatic reservation expiry cron (an owner-triggered cleanup endpoint is included).
- Final Missouri cottage-food eligibility, labels, licensing, tax, food-handling, accessibility, privacy and terms review.

Treat this as **Step 1 code foundation**, not as permission to collect real payments immediately.

## What it costs

This design is intended to use free tiers where possible: **Cloudflare Pages + Functions**, **Supabase Postgres/Auth/Storage**, and **Stripe Checkout**. Free offerings have quotas, inactive-project behavior and possible future changes; Stripe processing fees still apply. A custom domain is optional and usually costs money. No account or paid service has been created for you.

## Exactly how to upload it manually to GitHub

1. Download `Mamma_Bees_Bakery_GitHub_Repository.zip` from ChatGPT.
2. On your computer, right-click the ZIP and choose **Extract All**.
3. Open https://github.com/new and create a new empty repository, for example `mamma-bees-bakery`. You choose Public or Private; **Private is fine**.
4. Open that GitHub repository. Choose **uploading an existing file** (or **Add file → Upload files**).
5. Drag the **contents of the extracted `mamma-bees-bakery-website` folder**, keeping the `site/`, `functions/`, `supabase/`, `docs/`, `tests/`, `.github/` and `tools/` paths. Do not upload just the ZIP into GitHub and expect GitHub to run it as a website.
6. Enter commit message `Add Mamma Bee's Bakery starter website` and choose **Commit changes**.
7. Confirm you can see `README.md`, `site/index.html`, `functions/api/checkout.js`, and `supabase/schema.sql` in the repository.
8. **Stop here if all you want to do today is upload to GitHub.** Your files are safely stored; nothing is deployed or charged.

GitHub's upload UI might not show hidden `.github/` and `.gitignore` files when dragging folders on some systems. You can add those separately, or later upload via GitHub Desktop.

## When you are ready to configure the website (not required to upload to GitHub)

### A. Create a separate Supabase project

1. Sign in at https://supabase.com/ and create a **new Mamma Bee's Bakery project**. Do not reuse the Supabase database for another business.
2. In Supabase open **SQL Editor → New query**. Paste `supabase/schema.sql` and run it **only against the new, empty bakery project**. This creates the initial tables, authorization rules, storage buckets, and checkout functions.
3. In your Supabase project's **Connect** dialog (or **Settings → API Keys**), copy the project URL and **publishable** `sb_publishable_...` key.
4. In GitHub edit `site/config.js`, replacing `https://YOUR_PROJECT.supabase.co` and `PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY` with the two values above. This key is intended for public browsers. **Never enter a secret/service_role key here.**
5. In Supabase **Authentication → Providers**, enable email/password sign-in. For production, require email confirmation and configure the permitted site URL and redirect settings. Configure suitable abuse protections.
6. Create your own account from the website (once deployed), then look up the user UUID in **Authentication → Users**. In Supabase SQL Editor run this with the actual UUID:

   ```sql
   insert into public.staff_roles (user_id, role)
   values ('REPLACE-WITH-YOUR-SUPABASE-AUTH-USER-UUID', 'owner');
   ```

   The Admin system does not assign owner rights automatically from an email address, form field or user profile. **Do not paste your password into SQL.**

### B. Connect GitHub to Cloudflare Pages

1. Sign in to https://dash.cloudflare.com/.
2. Choose **Workers & Pages → Create → Pages → Connect to Git** (the wording may vary).
3. Authorize the new GitHub repository and select it.
4. Build settings: **Framework preset: None**, **Build command: leave empty**, **Build output directory: `site`**.
5. Deploy. Cloudflare Pages Functions in `/functions` require a **Git-integrated Pages deployment**; dragging only the `site` folder into direct upload will not deploy secure checkout endpoints.
6. Keep the generated `*.pages.dev` address initially to avoid paying for a domain.

### C. Configure Cloudflare server secrets and variables

In **Pages project → Settings → Variables and Secrets**, configure these for the environment you are testing:

| Name | Type | Source |
|---|---|---|
| `SUPABASE_URL` | Variable | New bakery Supabase Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Variable | Supabase publishable key (`sb_publishable_...`) |
| `SUPABASE_SECRET_KEY` | **Encrypted secret** | Supabase **secret** key (`sb_secret_...`); backend ONLY |
| `STRIPE_SECRET_KEY` | **Encrypted secret** | Start with Stripe **TEST** secret (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | **Encrypted secret** | Stripe webhook `whsec_...` for this exact endpoint |
| `SITE_URL` | Variable | Your exact Pages origin, e.g. `https://your-site.pages.dev` (NO trailing slash) |
| `STRIPE_AUTOMATIC_TAX_ENABLED` | Variable | Keep unset until Stripe Tax configuration has been reviewed; only then set `yes` |
| `LIVE_PAYMENT_ALLOWED` | Variable | Keep unset. Live transactions remain **disabled** by default. |
| `TURNSTILE_SECRET_KEY` | Encrypted secret | Optional during account-only messaging; required for guest contact |

In `site/config.js`, enter the matching **public** Turnstile site key if accepting guest messages. The corresponding secret goes into Cloudflare, not GitHub.

**Never upload actual secrets**, Stripe webhook credentials, or customer data to the GitHub repository, even if it is private.

### D. Connect Stripe in TEST mode first

1. Create a Stripe account or use a **dedicated bakery Stripe account** with its own owner authorization. Select **Test mode**.
2. Locate **Developers / API keys** and copy the **test secret** to encrypted Cloudflare variable `STRIPE_SECRET_KEY`.
3. Register a Stripe webhook endpoint: `https://YOUR-PAGES-DOMAIN/api/stripe-webhook`.
4. Subscribe to `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, and `checkout.session.async_payment_failed`. Save the webhook **signing secret** as `STRIPE_WEBHOOK_SECRET`.
5. Review tax obligations and product/delivery tax codes with an appropriate Missouri tax professional. The current code requests Stripe automatic tax on an aggregate line item and is **not certified tax-accurate**. Keep checkout disabled until corrected/approved.
6. Set Admin `Website Appearance & Settings` → ZIP codes, fulfillment choices, food disclosures/policies, then create a category, your actual product(s), inventory batch or baking day, and finally enable checkout **in test environment**.
7. Use Stripe's documented test payment methods. Verify the success webhook, order status, inventory deduction, failed/expired session restock and guest/account access.
8. **Do not add LIVE Stripe keys until you personally authorize live transaction testing.**

## Day-to-day owner workflow once connected

1. **Products** → add product to a category and enter genuine description, price, allergens and photograph.
2. **Ready-to-Sell Inventory** → record each finished batch, baked-on date, available quantity, and last eligible fulfillment date.
3. **Baking & Fulfillment Calendar** → enable dates, cutoff times, order capacity, pickup/delivery windows.
4. **Product Day Limits** → optional extra quantity limits for particular product/date pairs.
5. **Order Management** → review paid orders and move New → Confirmed → Baking → Ready → Completed.
6. **Announcements & Alerts** → publish banners with scheduled start and end.
7. **Promotions** → set coupon, scope, period and audience. Recipient mappings can be entered from the separate recipient section. For in-account marketing, click **Send in-app offer** once active.
8. **Customer Messages & Requests** → review custom order inquiries. Currently replies are stored in the account inbox only; email to guests needs a provider.
9. **Expenses / Recipes / Ingredients** → maintain actual recipe yields and recorded costs; reports and the generator need this data to be meaningful.

## Local previews and checks

**No Node or npm dependencies are required.** The site is vanilla HTML/CSS/JavaScript.

Run a static design preview:

```bash
python -m http.server 8080 --directory site
```

Visit `http://localhost:8080`. Without a configured Supabase project it correctly displays a setup notice. The Stripe backend will **not** run under Python's static server.

To run repository checks when Node.js 22+ is installed:

```bash
npm test
```

For Cloudflare Pages Functions local execution, use Cloudflare Wrangler with `.dev.vars` secrets and `wrangler pages dev site` (check the latest Cloudflare documentation). Never commit `.dev.vars`.

## Important food-safety and privacy notes

- Specific cottage-food eligibility, home pickup/delivery rules, labels, net weight, allergen disclosures, tax registrations and any local Nixa requirements need independent confirmation before real sales. **This code is not legal or tax advice.**
- **Do not put your private home pickup address in `site_settings.pickup_instructions`.** That table is public to allow the storefront to read its general business settings. Private pickup instructions require a separate protected communication workflow.
- Product photos are deliberately public; customer review photos are private in Supabase Storage and should be moderated. Customer contact information is restricted through RLS.
- Product variation price integrity, event replay/disputes, rate limits, abuse and security testing need further development before public launch.
- Restrict sales to legally permitted products and Missouri customers. Local delivery ZIP validation is implemented but cannot prove the buyer is physically in Missouri; additional address validation is required.
- For scheduled announcements/promotions, enter your times using the **America/Chicago** zone; the current Admin datetime input is interpreted using your browser's timezone and should be improved if you administer the business while travelling.
- Do not advertise products as fresh today unless they are; approve clearance batches manually and verify eligibility and original customer rights.

## Repo map

```
.
├── README.md                  # Start here
├── package.json               # Dependency-free checks
├── site/
│   ├── index.html             # Mobile-first public website
│   ├── styles.css             # Warm bakery design system
│   ├── config.js              # Public Supabase settings ONLY
│   ├── api.js                 # Auth / REST / Storage calls
│   ├── app.js                 # Storefront, cart, account, reviews
│   └── admin.js               # Owner/Admin management pages
├── functions/
│   ├── _lib/                  # Server-side database + Stripe helpers
│   └── api/                   # Checkout, signed webhook, order status, guest contact, cleanup
├── supabase/schema.sql        # Initial schema, RLS, storage and reservation logic
├── docs/
│   ├── Mamma_Bees_Bakery_V1_Master_Project_Requirements.md
│   ├── IMPLEMENTATION_STATUS.md
│   └── DEPLOYMENT_CHECKLIST.md
├── tools/generate_qr.py       # Generate QR PNG/PDF once URL is known
└── tests/                     # Local source/security checks
```

## Source references used for the code architecture

- Cloudflare Pages Functions: https://developers.cloudflare.com/pages/functions/get-started/
- Cloudflare environment secrets: https://developers.cloudflare.com/pages/functions/bindings/
- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase row-level security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Stripe Checkout Sessions: https://docs.stripe.com/api/checkout/sessions/create
- Stripe webhooks: https://docs.stripe.com/webhooks
- Missouri cottage-food statute: https://revisor.mo.gov/main/OneSection.aspx?section=196.298

## Revision history

| Version | Date | Changes | Status |
|---|---|---|---|
| 0.1.0 | 2026-10-26 | Original uploadable repository with storefront, Admin scaffolding, SQL RLS schema and Stripe TEST-gated checkout | Source package; integration not yet tested |

**Owner-approved V1 scope remains the master requirements document.** Gaps shown above are follow-on implementation work, not deleted requirements.
