# Uniform Homepage Carousel Slide Sizing — MommaBee Bakery&Farmstand

**Document ID:** MBB-UI-034  
**Project:** MommaBees Website, Nixa, Missouri  
**Version:** 1.24  
**Date:** October 27, 2026  
**Status:** Source changes committed; CI and production checks required separately  
**File type:** Markdown  
**Filename:** `docs/MBB_UI_034_CAROUSEL_UNIFORM_SIZING_V1_24.md`  
**Google Drive location:** Not established; GitHub main is the controlled system of record.  
**Purpose:** Prevent homepage carousel height and image-frame changes when different slide text lengths or image aspect ratios are displayed.

## Specifications
- Every public slide shares one carousel viewport height at each breakpoint: desktop 440–570 px, mobile/tablet 600–730 px. These are responsive CSS bounds, not independent per-slide dimensions.
- Desktop retains side-by-side copy and photograph. Below 850 px, the image appears above the slide text.
- Photograph frame size is consistent and `object-fit: cover` crops different image proportions without stretching. Original image files are unchanged.
- Text remains fully available using internal scrolling when a slide exceeds its available height. Longer headlines, descriptions, and buttons are not removed.
- Admin private carousel preview uses the same uniform-size principle in a smaller fixed preview area.
- Existing slide order, scheduling, publication, interval, controls, styling, brand colors, reduced-motion behavior, products and checkout are unchanged.

## Acceptance evidence
Regression source tests confirm fixed equal heights at every breakpoint, consistent photograph framing, and the existing hide/show carousel behavior. GitHub automated checks and matching Cloudflare production deployment must pass independently. Final desktop and mobile visual inspection remains a browser acceptance item.

## Revision history
| Version | Date | Change | Status |
|---|---|---|---|
| 1.24 | 2026-10-27 | Uniform height/photograph frame with safe overflow and responsive constraints | Pending CI/deployment verification |

**Footer:** MommaBee Bakery&Farmstand · MBB-UI-034 · v1.24 · GitHub main
