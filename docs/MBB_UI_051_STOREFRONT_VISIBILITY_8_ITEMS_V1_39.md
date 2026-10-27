# Product Showcase: Active Storefront Filtering and Compact Cards
**Document ID:** MBB-UI-051 · **Version:** 1.39 · **Date:** 2026-10-27
**Owner project:** MommaBee Bakery&Farmstand · **Filename:** `docs/MBB_UI_051_STOREFRONT_VISIBILITY_8_ITEMS_V1_39.md`
**Source:** GitHub MommaBees/MommaBees-Website, main · **Google Drive:** Not established.

**Requirements accepted:** Split Store visibility selectors in Admin → Website & Design → Store Display control homepage department panels and unscoped Shop All results. Bakery alone shows up to eight cards; Homestand alone shows up to eight; both show up to four per department. Explicit direct department and category URL pages continue to work regardless of homepage visibility selections. With neither selected, homepage shows neither and unscoped Shop All shows no product department. With Split Store disabled, combined store behavior is unchanged. All settings remain Owner/Admin-controlled.

**Layout:** Denser product grids with narrower gaps, shorter card-photo areas, tighter content padding. Single department uses four product columns desktop, responding to three, two columns on smaller screens. Two departments remain side-by-side on wide screens with two columns in each. Sitewide size-density variables remain respected. Carousel DOM/CSS/behavior untouched.

**Verification gates:** GitHub source tests, repo main commit, Cloudflare deployment, role-gated Admin save, manual desktop/mobile review. No migrations, Stripe updates, product changes, or sales-authority changes.

**Footer:** MBB-UI-051 · v1.39 · GitHub main.
