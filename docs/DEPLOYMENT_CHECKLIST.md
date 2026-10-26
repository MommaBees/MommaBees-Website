# Owner's Deployment Checklist

Document ID: MBB-DEPLOY-001 · Version 0.1.0 · 2026-10-26 · Mamma Bee's Bakery

## Phase 0 — Manual GitHub upload (the only required action today)

- [ ] Download and extract the website repository ZIP.
- [ ] Create a new **empty** GitHub repository (do not mix with other businesses).
- [ ] Upload all extracted files, preserving folders including `/functions`, `/site`, `/supabase`, `/docs`.
- [ ] Confirm `README.md` is displayed on GitHub.
- [ ] Confirm no secrets or personal customer data were uploaded.

## Phase 1 — Infrastructure (only when owner is ready)

- [ ] Create separate bakery Supabase project and backup/recovery plan.
- [ ] Run `supabase/schema.sql` on a new empty project.
- [ ] Create owner account and assign role from Supabase SQL Editor.
- [ ] Configure `site/config.js` with Supabase URL + public publishable key.
- [ ] Connect GitHub repository to Cloudflare Pages: build `site`, no build command.
- [ ] Set Supabase URL, publishable key, secret key, SITE_URL and Stripe test secret in Cloudflare.
- [ ] Configure Stripe TEST webhook and `STRIPE_WEBHOOK_SECRET`.
- [ ] Configure Turnstile for guest contact.

## Phase 2 — Actual business records

- [ ] Create real bakery categories and products (verified prices and descriptions).
- [ ] Upload real photographs and verified ingredient/allergen information.
- [ ] Configure pickup/delivery eligibility, order cutoffs, prep days and capacity.
- [ ] Publish reviewed business/pickup/cancellation/food disclosures.
- [ ] Add actual recipe yields, ingredient costs and on-hand quantities if using shopping reports.
- [ ] Configure optional announcements/promotions carefully with no misleading claims.

## Phase 3 — Payments and quality gates

- [ ] Have Missouri tax treatment and Stripe Tax configuration independently checked.
- [ ] Test sample orders only with Stripe TEST keys.
- [ ] Test two concurrent customers buying the final finished unit.
- [ ] Test cutoff, production caps, delivery ZIPs, expired/failed Stripe Checkout and webhook replay.
- [ ] Test guest order token confidentiality and registered-customer account isolation.
- [ ] Test Admin access: unauthenticated visitor, ordinary customer, Owner and staff.
- [ ] Test upload rules, reviews, marketing opt-in, privacy and message abuse.
- [ ] Test refund/chargeback and customer recovery handling once those modules are implemented.
- [ ] Test mobile at 390px and desktop at 1280px, keyboard and screen reader.
- [ ] Review local Nixa/Missouri licensing, cottage-food rules, tax registration and labeling.
- [ ] Only the owner may authorize LIVE Stripe keys / actual charges after acceptance.

Do not interpret a checked source-code test as proof of a real Stripe, Supabase or Cloudflare deployment.
