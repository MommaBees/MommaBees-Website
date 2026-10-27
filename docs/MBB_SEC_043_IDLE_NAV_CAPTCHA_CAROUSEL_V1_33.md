# Account inactivity, staff navigation, CAPTCHA and product carousel
**Document ID:** MBB-SEC-043  
**Version:** 1.33  
**Date:** 2026-10-27  
**Status:** Implementation / release evidence tracked separately  
**Owner:** MommaBee Bakery&Farmstand  
**Filename:** `docs/MBB_SEC_043_IDLE_NAV_CAPTCHA_CAROUSEL_V1_33.md`  
**Canonical repository:** `MommaBees/MommaBees-Website` on `main`  
**Google Drive:** Not established.

## Requirements
- Owner/Admin link only inside their authenticated Profile dropdown; moderator menu may retain Moderation.
- Sign Out in all signed-in users' Profile dropdown.
- All roles default to five-minute inactivity logout. Personal setting allows 1, 3, 5, 10, 15, 20, 25, 30, 45, 60 minutes. Background-tab expiration is checked on return. This is a client-side inactivity cutoff, not instantaneous revocation of already-issued JWT.
- Cloudflare Managed Turnstile must begin only after an explicit Verify button click. Managed mode itself may grant success without an interactive checkbox; server Siteverify remains mandatory.
- Homepage carousel can incorporate actual photo-backed Bakery/Homestand items. Admin can independently enable sources. No placeholder photos and no paid product publication.
- Photos from uploads preserved; Alamy-watermarked cherry tomatoes excluded pending license.

## Release verification
Automated syntax/security tests, Supabase migration, Cloudflare deployment, followed by browser testing of role controls, idle logout, signup/login CAPTCHA, carousel source ordering and mobile menu.

**Footer:** MBB-SEC-043 · v1.33 · GitHub main
