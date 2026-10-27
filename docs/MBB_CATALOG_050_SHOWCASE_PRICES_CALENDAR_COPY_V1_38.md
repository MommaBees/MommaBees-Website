# Product Showcase Reference Prices and Calendar Date — v1.38

**Document ID:** MBB-CATALOG-050  
**Project:** MommaBee Bakery&Farmstand, Nixa, Missouri  
**Version:** 1.38 · **Date:** 2026-10-27  
**Filename:** `docs/MBB_CATALOG_050_SHOWCASE_PRICES_CALENDAR_COPY_V1_38.md`  
**Canonical source:** `MommaBees/MommaBees-Website`, `main` · **Google Drive:** Not established.

## Product Showcase
Replaced legacy generic availability phrases with an optional owner-selected `availability_date` column (Postgres date, `YYYY-MM-DD`), formatted at display time in local calendar semantics: `Aug. 23, 2026`. Require date when creating NEW showroom items in Admin; earlier seeded 19 records retain NULL dates until owner schedules them. Existing actual date values are preserved. No imaginary future harvest date.

Average reference values are stored separately from owner-approved prices using `price_kind='market_average'`. Existing owner-set `price_cents` is never overwritten by the migration. Avg. prefix appears for a market reference. Updating a price in Admin to an owner price changes kind to owner. Neither kind enables checkout, inventory, Stripe sync or product publication.

## Price research and assumptions
**Missouri University Extension — Missouri Farmers Market Reported Prices 2025 Summary (May 2026):**
https://extension.missouri.edu/publications/mx801
Green Beans (tender beans) $3.97/lb; Blackberries $4.94/pint; Broccoli $3.45/bunch; Cauliflower $3.88/head; Jalapeño $0.39/each; Salad Cucumber $0.80/each (rural+urban observed $0.79/$0.96); Okra $3.45/lb; Slicing Tomatoes ~ $3.30/lb; Yellow Summer Squash $0.95/each; Zucchini $1.36/each. Mini Green Peppers $0.65/each is an estimate based on reported pepper mix averages; no exact mini-pepper benchmark published.

**Local bakery reference listings:**
- Nixa Robin's Sweets 9-inch cream pies ~$26: https://robinssweets.com/
- Mo Pie Banana Cream Pie ~$30: https://www.mopieco.com/shop
- Springfield Breadsmith Cinnamon Swirl ~$8.50 and cookies ~$3.50 each: https://www.breadsmith.com/wp-content/uploads/2025/04/springfield-menu.pdf
- Nixa Sensitively Sweet cookies $2, breads $10: https://www.toasttab.com/local/order/sensitively-sweet-107-aldersgate-drive-suite-10/item-bread_ec07ab8f-7987-4157-aaff-198d98088c7e
- Springfield Prairie Pie dozen cookies $30: https://www.prairiepie.com/order/cookies
- Four Little Acres Cinnamon Swirl from $11: https://fourlittleacres.com/collections/fresh-bread
Bakery cookie values are estimated representative local prices, not measured item-specific means.

## Seeded reference prices
| Showcase | Average reference | Unit |
|---|---:|---|
| banana-creme-pie | $28.00 | each |
| cinnamon-swirl-bread | $9.50 | loaf |
| dream-cookie-drommar | $2.50 | each |
| ginger-bread | $2.50 | each |
| chocolate-chip-cookies | $2.75 | each |
| meringue-cookies | $1.50 | each |
| oatmeal-old-fashioned-cookies | $2.75 | each |
| pecan-dreams | $2.75 | each |
| green-beans | $3.97 | pound |
| blackberries | $4.94 | pint |
| broccoli | $3.45 | bunch |
| cauliflower | $3.88 | each |
| jalapenos | $0.39 | each |
| mini-green-peppers | $0.65 | each |
| salad-cucumbers | $0.80 | each |
| spineless-okra | $3.45 | pound |
| tomatoes | $3.30 | pound |
| yellow-summer-squash | $0.95 | each |
| zucchini | $1.36 | each |

## Copy cleanup
Remove public-facing fake/demo/example menu cards, illustration disclosures, empty-featured promotional filler, repeated Past Bakes disclaimers, redundant footer availability and stock photo warnings; keep critical food safety, genuine policy, consent, tax, payment, and order disclosures. Remove generic availability notes from public detail pages. Do not display a date until Owner chooses it.

## Acceptance
Test date formatting across time zones and invalid dates, reference vs owner price labels, 19 intact records/prices, Admin new-record date control, NULL-safe old records, no fabricated dates, no Stripe change, public demo invisibility, GitHub CI and production Cloudflare. Separate browser acceptance still required.

**Footer:** MBB-CATALOG-050 | v1.38 | GitHub main