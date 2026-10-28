# Page Width and Uniform Product Cards
**Document ID:** MBB-UI-056  
**Version:** 1.43  
**Date:** 2026-10-27  
**Project:** MommaBee Bakery&Farmstand  
**Filename:** `docs/MBB_UI_056_PAGE_WIDTH_UNIFORM_CARDS_V1_43.md`  
**Type:** Markdown  
**Status:** GitHub release pending CI and Cloudflare evidence  
**Source location:** GitHub `MommaBees/MommaBees-Website`, `main`. Google Drive location not established.

## Owner-approved layout adjustments
1. All website pages: reduce desktop content rail to 84% of the selected Website Size preset. The preset remains functional across Extra Small, Small, Medium and Large.
2. Home carousel: cap outer width at 1080 px, center it. Retain carousel slide size presets, content scaling, timer, active slide logic, arrows, dots, transition, images, auto-pause and controls.
3. Admin: wider than customer pages, at 93% of the preset width; slightly slimmer sidebar and page padding. Pages can grow vertically. Preserve module permissions, search, navigation, table scroll, forms and audit/security controls.
4. Bakery/Homestand product cards: equal-height grid rows, equal-width columns, normalized product photos and two-line titles with overflow truncation. Cards fill equal row heights without distorting photographs. Content and details remain accessible through dedicated item pages. Product descriptions are clamped for card compactness, not deleted.
5. Homepage grid display counts and configurable columns × rows remain unchanged (separate Owner Admin settings). Mobile/tablet switch to responsive, full-width layouts.
6. No data migration, prices, stock, Stripe, Supabase project, or checkout settings changed.

## Checks
Regression assertions cover width rules, product grid row equality, image heights, clamping, Admin space, and unchanged carousel logic. CI and production deployment to be verified. Authenticated browser acceptance and mobile screenshots are separate.

**Footer:** MBB-UI-056 · v1.43 · GitHub main
