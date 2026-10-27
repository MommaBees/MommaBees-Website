# Mamma Bee's Bakery — Username or Email Sign-In

**Project:** Mamma Bee's Bakery, Nixa, Missouri  
**Document ID:** MBB-AUTH-023  
**Version:** 1.13  
**Document type:** Markdown  
**Filename:** `docs/MBB_AUTH_023_USERNAME_OR_EMAIL_SIGNIN_V1_13.md`  
**Google Drive location:** Not established. GitHub is the controlled source.  
**GitHub:** `MommaBees/MommaBees-Website` → `main` → `docs/`  
**Date:** 2026-10-26  
**Status:** Implemented, Supabase migration verified, regression tests passed, Cloudflare deployment successful; actual credential-based sign-in on browser pending  
**Purpose:** Allow customers and authorized staff to sign in using their existing username **or** registered email address, without changing the password, weakening account controls, or disclosing email addresses.

## Approved customer experience

**Sign In:** One text field labeled **Username or email address** and one password field. Customer can enter either identifier and the same password. The same Cloudflare Turnstile challenge remains mandatory. The user is signed into the same account and retains order history, private messages, profile, notifications, and account ID.

**Create Account:** Remains email-and-password registration with a unique username selected at sign-up and standard address fields. Guest checkout is unchanged.

**Username management:** Username is case-insensitive for lookup and unique case-insensitively. Customer usernames remain locked after sign-up. Owner/Admin may rename using the existing audited management workflow; changes automatically take effect on the next login. The Owner username `MommaBee` was confirmed to exist without retrieving or displaying its linked email or password.

## Server-side implementation

- The Cloudflare Pages endpoint `functions/api/auth/login.js` accepts either `identifier` or legacy `email` requests.
- `functions/_lib/username-auth.js` uses the server-only Supabase secret key to resolve an existing username to a user ID, then privately retrieves the associated Auth email.
- Supabase still verifies the submitted password and single-use Turnstile token using its native password login endpoint. **The CAPTCHA must not be redeemed twice.**
- Browser code in `site/account.js` displays one user-name-or-email input; `site/api.js` sends `identifier`.
- The credential request is always same-origin and no public username-to-email resolver is introduced.
- Missing or incorrectly entered usernames receive a generic invalid-credentials error; email addresses are not returned by a failed username lookup.
- There is no new password store. Existing Supabase Auth records and customer profiles remain authoritative.

## Database security

Migration: `supabase/migrations/20261026_username_or_email_signin.sql`.

Function: `public.bakery_login_user_id(text)`.

- `SECURITY INVOKER`, not `SECURITY DEFINER`.
- Uses exact lowercased username equality rather than ILIKE wildcard matching (underscores remain literal).
- Rejects banned profile records from username lookup.
- Returns user UUID only, not email or password.
- EXECUTE revoked from PUBLIC, `anon`, and `authenticated`; granted to `service_role` only.
- Existing unique index `customer_profiles_username_ci_unique` already guarantees no two users can claim a username regardless of letter case.

**Live database verification:** `anon_can_execute=false`, `member_can_execute=false`, `server_can_execute=true`. Owner username matching count: 1.

## Test and deployment evidence

- [x] Email login compatibility test.
- [x] Username mixed-case login test with mocked Supabase service.
- [x] Single-use CAPTCHA is passed only to Supabase Auth.
- [x] Lookup secret is never sent to the browser.
- [x] Unknown username and bad password yield the same generic error.
- [x] Missing CAPTCHA stops username lookup.
- [x] Username database migration applied.
- [x] Role grants verified in MommaBees Supabase project.
- [x] GitHub CI source/regression suite passed.
- [x] Cloudflare Pages deployed the same main-branch commit.
- [ ] Human-authenticated browser test: login with known valid email and password.
- [ ] Human-authenticated browser test: logout and login with username and the same password.
- [ ] Human-authenticated browser test: wrong password, CAPTCHA refresh, and locked/banned access.
- [ ] Verify on phone/tablet and desktop.

**Payment operations:** No Stripe or LIVE payment settings were changed.

## Revision history

| Date | Version | Change | Status |
|---|---|---|---|
| 2026-10-26 | 1.13 | Username-or-email sign-in using unchanged Supabase Auth and single-use CAPTCHA | Deployed; user-session acceptance pending |

**Footer:** Mamma Bee's Bakery · MBB-AUTH-023 · v1.13 · GitHub controlled
