# Mamma Bee's Bakery — Global Account Navigation and Homepage Copy Corrections

**Document ID:** MBB-UX-025  
**Project:** Mamma Bee's Bakery (Nixa, Missouri)  
**Version:** 1.15  
**File type:** Markdown (.md)  
**Filename:** `MBB_UX_025_ACCOUNT_DROPDOWN_V1_15.md`  
**Google Drive location:** Not established for this project. GitHub remains the controlled source.  
**GitHub location:** `MommaBees/MommaBees-Website` → `main` → `docs/MBB_UX_025_ACCOUNT_DROPDOWN_V1_15.md`  
**Date:** October 26, 2026 (America/Chicago)  
**Status:** Code deployed, automated regression suite accepted; real-user device/session testing still pending  
**Purpose:** Remove owner-unapproved home-page labels and make customer and Owner/Admin profile, settings and sign-out actions available throughout the site.  
**Dependencies:** Existing Supabase Auth session, `site/api.js` logout method, `site/account.js` customer account screen, Cloudflare Pages, existing authorized staff roles.

## Approved change control

### Removed from public homepage

- `From Nixa, with care`
- Standalone `Rooted in Faith` on the now-removed promotional values band
- `Something sweet for your table`
- `A little note from our kitchen`

The *entire* three-part homepage values band was removed rather than merely hidden with CSS. The note's unwanted eyebrow label was deleted, while its explanatory section and useful navigation remain. The approved official business slogan, `Rooted in Faith. Made with Love. Shared with Joy.`, is retained in the established brand and footer locations.

### Global customer account dropdown

- Unauthenticated: the existing **Sign In** navigation entry remains.
- Authenticated: a **My Account** dropdown is present in the shared navigation, including the Admin Center.
- Entries: **Account Overview**, **Profile**, **Settings**, **Sign Out**.
- Routes: `#account`, `#account/profile`, `#account/settings`.
- Profile and Settings deep links go to actual sections of the existing customer account dashboard. `Edit Profile` remains the only way to reveal editable personal fields; username remains locked against member self-editing.
- Settings currently exposes the existing promotional notification opt-in preference, rather than making a misleading empty Settings page.

### Interaction and security

- Desktop mouse: delayed open of 150 milliseconds, and a 350-millisecond closing grace period after pointer exit.
- Click/tap: opens or closes the menu immediately.
- Keyboard: standard button focus/activation and Escape to close.
- ARIA: explicit trigger/panel association and `aria-expanded` state; links and Sign Out are real focusable controls.
- Outside click dismisses the dropdown; changing routes resets the menu without leaving obsolete document listeners.
- Sign Out uses the existing Supabase Auth logout, removes the local session, clears the verified back-office role and demo catalog, reloads the guest-visible catalog under the anonymous context, and navigates to the home page.
- Sign Out does not change any Stripe configuration, prices, privileges, orders, or database schema.

## Source changes

| Repository path | Purpose |
|---|---|
| `site/account-navigation.js` | Dropdown markup, timed mouse behavior, keyboard/click navigation, one-at-a-time Sign Out and listener cleanup |
| `site/app.js` | Home-copy removal, shared dropdown in navigation, sign-out transition and deep-link support |
| `site/account.js` | Named profile and settings sections for deep links |
| `site/country-home-v2.css` | Warm rustic dropdown styling, mobile stacking and accessible focus/anchor margins |
| `tests/source.test.js` | Regression tests for removed copy, displayed menu, links, delays, sign-out state and section routing |

## Acceptance record

- [x] Unapproved homepage words removed from rendered templates.
- [x] Approved official slogan retained.
- [x] My Account dropdown code integrated in shared site header.
- [x] Profile and Settings connect to existing real account controls.
- [x] Sign Out uses existing Supabase logout and clears cached privileged data before guest rendering.
- [x] Responsive and keyboard-friendly markup and styles included.
- [x] GitHub source/regression test suite completed successfully.
- [x] Matching Cloudflare Pages deployment confirmed successful.
- [x] Deployed dropdown module and updated stylesheet verified accessible by URL.
- [ ] Actual authenticated browser test using user-controlled password and CAPTCHA.
- [ ] Owner/Admin sign-out and guest role isolation browser test.
- [ ] Visual device acceptance with hover/pointer/focus interactions on desktop, tablet and phone.

## Revision history

| Date | Version | Change | Status |
|---|---|---|---|
| 2026-10-26 | 1.15 | Removed unwanted homepage value band and eyebrow; integrated global account dropdown and deep links | Deployed; device-level acceptance pending |

**Footer:** Mamma Bee's Bakery · MBB-UX-025 · v1.15 · GitHub controlled
