# Engineering Coverage and Gap Register

Document ID: MBB-ENG-STATUS-001  
Project: Mamma Bee's Bakery · Nixa, Missouri  
File: `docs/IMPLEMENTATION_STATUS.md` · Markdown · v0.1.0 · 2026-10-26  
Status: source files created; no Supabase migration run, no Stripe sessions processed, no deployed website validated  
Google Drive location: not established · GitHub repository: owner to create manually

| Approved V1 capability | Initial code status | Acceptance still required |
|---|---|---|
| Category shop/detail, hidden empty categories | Implemented basic browser filter | Server authoritative stock/production capacity visibility under concurrent demand |
| Product images, prices, description | Implemented base product and owner photo upload | Real owner content, image moderation, QA |
| Product variants, options and add-ons | Database field only; not usable in checkout | Full pricing and option integrity |
| Ready-to-sell inventory batches | Implemented | End-to-end oversell, expiry, shelf-life eligibility tests |
| Preorders, date/time choices, capacity and cutoff | Implemented initial server reservation | End-to-end concurrency and time-zone tests |
| Pickup/local delivery | Implemented with allowed ZIPs/flat fee | Address validity, tax/delivery treatment, driver dispatch |
| Stripe guest/account checkout | Code implemented; OFF by default | Stripe TEST/Tax; webhook replay, expiry, refund workflows |
| Customer accounts / My Orders | Initial implementation | Email verification, privacy/data request acceptance |
| Signed-in review + up to 3 photos | Initial upload + private storage | Hard DB quantity limit, public approved-photo display |
| Admin product/category/calendar/inventory CRUD | Initial implementation | Composite-key editor, role boundaries, real device QA |
| Admin announcements scheduling | Initial implementation | Audience selection editor, preview, full placement checks |
| Product/category/batch coupon codes | Initial server checks | Automatic deals; comprehensive stacking/margin controls |
| Targeted marketing and offers | Opted-in in-app offer delivery | Scheduled sends, email consent/revocation handling |
| Clearance and missed pickups | Clearance approval field and batch promos | Missed pickup original-rights workflow, handling eligibility |
| Customer messages, requests | Initial account + Turnstile-backed guest inbox | Customer notification on reply, guest email reply |
| Order/service notifications | In-app DB-trigger notices | Transactional email and delivery status messages |
| Profit, expenses and reports | Initial reports / CSV | Tax/refunds, cost allocation, labor/packaging model |
| Recipes, ingredient stock, shopping list | Initial editable recipes / calculator | Missing recipe alerts, stock deduction/reconciliation |
| Homepage/header photo controls | Implemented basic URLs | Preview, image transforms, per-placement design |
| QR PNG/PDF | Local Python generator | Admin UI generation/download |
| Site policies, Nixa compliance | Owner-editable public text fields | Licensed verification, label generation, tax/permit decisions |
| Security | Browser RLS, service-only RPC, signature check, default checkout off | Pen test, role tests, rate limits, identity/PII audit |
| Mobile presentation | Responsive CSS | Real-browser 390px/768px/1280px QA + WCAG audit |

No actual sales, verified compliance, product reviews or live payment capability are claimed by this document.
