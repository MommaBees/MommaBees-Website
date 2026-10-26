# Mamma Bee's Bakery — Native Supabase CAPTCHA Integration

**Project:** Mamma Bee's Bakery, Nixa, Missouri
**Document ID:** MBB-AUTH-CAPTCHA-002
**File name:** `docs/AUTH_CAPTCHA_INTEGRATION_V1_2.md`
**File type:** Markdown
**Repository:** `MommaBees/MommaBees-Website` — `main`
**Google Drive location:** Not established
**Version:** 1.2
**Date:** 2026-10-26
**Status:** Implemented and subject to automated CI; real-browser login/registration acceptance pending
**Purpose:** Correct the missing CAPTCHA token error after Supabase native CAPTCHA was enabled
**Dependencies:** MommaBees Cloudflare Pages and Turnstile; MommaBees Supabase Auth project `ryqcfojzdncrshinlpue`

## Verified problem
Supabase's Authentication → Attack Protection now requires CAPTCHA on password sign-in and sign-up. The original bakery Pages Functions redeemed the single-use Cloudflare Turnstile response at Cloudflare Siteverify, then sent an Auth request without the CAPTCHA token. Supabase rejected that request with: `captcha protection: request disallowed (no captcha_token found)`.

## Controlling implementation
1. The client renders the existing bakery Cloudflare Turnstile sitekey at sign-in and registration.
2. The client sends `captcha_token` to the corresponding first-party endpoint, either `/api/auth/login` or `/api/auth/register`.
3. The first-party endpoint validates the token is present and is at most 2,048 characters, but **does not redeem it**.
4. The endpoint forwards that original token to Supabase Auth in `gotrue_meta_security: { captcha_token: token }`, alongside the normal email/password or email/password/profile metadata.
5. **Supabase native Auth** performs the only server-side Turnstile verification, including direct requests to Supabase's Auth endpoints.
6. Missing/expired/incorrect CAPTCHA tokens cause registration or login to be rejected. The existing interface resets the Turnstile challenge after an unsuccessful attempt.

**Never verify the same Turnstile token both at Cloudflare Siteverify and again in Supabase Auth.** Turnstile tokens are single use. Non-Auth flows, such as a separate guest-contact endpoint, can use their own Turnstile token and server validation without reusing the login token.

## Administration
- Supabase: Authentication → Attack Protection → Enable CAPTCHA protection → Turnstile by Cloudflare.
- Cloudflare: existing dedicated bakery widget allowed for `mommabees-website.pages.dev`.
- **Required alignment:** The Turnstile secret installed in Supabase must match the Turnstile public sitekey used by the website. The screenshot hides the secret, so its value cannot be independently compared here.
- Existing Owner credentials, roles, customer IDs, and database records are unaffected.
- Never store Turnstile secret, Supabase secret key, or a customer's password in public GitHub source.
- The Cloudflare Pages `TURNSTILE_SECRET_KEY` remains available for other CAPTCHA-protected endpoints if applicable; it is **not** used to redeem account login/registration tokens.

## Testing and acceptance
- Automated tests assert that login and signup both forward a single token in Supabase's native Auth request structure, with no first-party token consumption.
- Automated tests assert login and registration reject missing tokens before making an Auth request.
- After a successful CI and Cloudflare deployment, the bakery Owner must test signing out and signing back in with a fresh valid CAPTCHA; then test registration with a separate real test email.
- If Supabase responds with invalid/failed CAPTCHA even after the code update, verify that the Supabase Turnstile **secret belongs to the same widget sitekey** displayed on the website; do not disable protection as a workaround.
- Leave Stripe live payments disabled.

## Revision history
| Date | Version | Summary | Status |
|---|---|---|---|
| 2026-10-26 | 1.2 | Fixed missing `captcha_token` and single-use double-verification mismatch | CI and browser verification tracked separately |

**Footer:** Mamma Bee's Bakery · MBB-AUTH-CAPTCHA-002 · v1.2
