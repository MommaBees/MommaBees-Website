# Sitewide Website Size — MommaBee Bakery&Farmstand

**Document ID:** MBB-UI-037  
**Project:** MommaBees Website, Nixa, Missouri  
**Version:** 1.27  
**Status:** Engineering release; automated and production acceptance separately verified  
**Date:** October 27, 2026  
**Google Drive location:** Not established; controlled GitHub `main`  
**Filename:** `docs/MBB_UI_037_SITEWIDE_SIZE_V1_27.md`  
**File type:** Markdown  
**Purpose:** Add one Owner/Admin-selected size for website-wide content and layout, independently of the existing carousel size.

## Owner-facing specification
Admin Center → Website & Design → Website Size. Four settings: Extra Small, Small, Medium (default), Large. The selection adjusts layout max-width, typography, cards, images, spacing, navigation, form inputs, and Admin modules. It is a shared website presentation setting for all visitors and staff; not a per-member preference. The Admin form offers a live, unsaved preview and Reset preview, with Save to persist to site settings.

## Size parameters
- Extra Small: 90% base text; ~78% density and photo frame; 1280 px desktop content max.
- Small: 96% base text; 89% density and 90% photo frame; 1460 px content max.
- Medium: 100% text/density/photos and 1700 px content max (existing default).
- Large: 111% base text; 113% density and 114% photo frame; 1840 px content max.
Mobile adapts to available viewport without forcing horizontal scrolling. Inputs and buttons retain minimum 44 px interactive height regardless of compact selection. Browser zoom is preserved.

## Independence and safety
No change to carousel timing or carousel's separate size selection. Original media, products, checkout rules, receipts, payment settings and policies are untouched. CSS explicitly restores carousel variables after sitewide typography rules. A broad Supabase RLS policy on `site_settings` was identified as permitting active nonstaff user modifications; migration removes this policy, preserving public SELECT and staff Owner/Admin update policy.

## Dependencies and checks
Supabase `site_settings.website_size` with database value constraint and existing staff policy, production Cloudflare Pages, GitHub main. Verify Supabase constraints/policies and release CI, followed by Owner desktop/mobile visual acceptance.

## Revision history
| Version | Date | Description | Status |
|---|---|---|---|
| 1.27 | 2026-10-27 | Sitewide size choices and settings authorization hardening | Release verification pending |

**Footer:** MommaBee Bakery&Farmstand · MBB-UI-037 · v1.27 · GitHub main
