# Carousel Size Presets — MommaBee Bakery&Farmstand

**Document ID:** MBB-UI-035  
**Project:** MommaBees Website, Nixa, Missouri  
**Version:** 1.25  
**Date:** October 27, 2026  
**Status:** Implementation — verify GitHub, Supabase and Cloudflare release gates  
**File type:** Markdown  
**Filename:** `docs/MBB_UI_035_CAROUSEL_SIZE_PRESETS_V1_25.md`  
**Google Drive location:** Not established. Canonical location: MommaBees GitHub repository, `main`.  
**Dependencies:** MBB-UI-034 v1.24 uniform slide sizing, MBB-ADMIN-033 v1.23 timer, existing site settings RLS.  
**Purpose:** Let Owner/Admin choose the homepage carousel size without modifying individual slides or images.

## Approved configuration
- **Extra Small**: desktop 300–360px, mobile 440px.
- **Small**: desktop 370–430px, mobile 530px.
- **Medium**: existing desktop 440–570px, mobile 600–730px; default.
- **Large**: desktop 540–680px, mobile 740–860px.

Exact rendered heights depend on viewport width within the stated ranges. All slides share the same height in the selected preset. Photos are proportionally cropped (`object-fit:cover`), not stretched. Long text scrolls inside the text area rather than changing the outer size.

## Owner control
Admin → Website & Design → Homepage Carousel → Carousel size (required) → Save size. The private carousel preview reflects changes on selection before saving. Saving writes the whitelisted value to `site_settings.home_carousel_size`; reentering the homepage fetches current settings. No other Admin roles are granted by this setting.

## Release boundaries
Do not edit original slide media, content, order, publication flags, autoplay period, customer orders, LIVE payments or product catalog. Retain accessibility controls and reduced-motion behavior. Browser-based visual acceptance is a separate check from CI and production deployment.

## Revision history
| Version | Date | Description |
|---|---|---|
| 1.25 | 2026-10-27 | Four shared carousel size presets with Owner/Admin save and preview | 

**Footer:** MommaBee Bakery&Farmstand · MBB-UI-035 · v1.25 · GitHub main
