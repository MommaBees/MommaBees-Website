# Mamma Bee's Bakery — QR PNG Download Reliability Repair

**Document ID:** MBB-QR-026  
**Project:** Mamma Bee's Bakery (Nixa, Missouri)  
**Version:** 1.16  
**Date:** 2026-10-26  
**File type:** Markdown  
**Filename:** `docs/MBB_QR_026_PNG_DOWNLOAD_REPAIR_V1_16.md`  
**Controlled location:** `MommaBees/MommaBees-Website`, `main`, `docs/`  
**Google Drive location:** Not established.  
**Status:** Code implemented, SVG and PNG paths updated, QR payload independently decoded, GitHub tests successful, Cloudflare production deployment successful. Interactive browser download acceptance remains outstanding.

## Reported issue

The downloadable QR image page reported `Download unavailable: undefined` when **Download PNG** was pressed. The existing handler first created an SVG Blob URL, then attempted to load the SVG with `new Image()`, draw the image onto a canvas and asynchronously convert it to a PNG. The image `onerror` callback used a bare `reject` function, which rejected the Promise with an Event rather than an Error with a usable `.message`. The catch handler displayed `err.message`, resulting in `undefined`.

## Remediation

Rather than relying on an SVG-to-image-to-canvas conversion that can be inconsistent across browser contexts:

1. Generated the QR raster offline as a **900 × 900 PNG** with four-module quiet-zone margins.
2. Decoded the generated image independently using OpenCV QRCodeDetector. **Verified decoded value:** `https://mommabees-website.pages.dev/`.
3. Uploaded the binary directly to `site/assets/MammaBeesBakery-Homepage-QR.png` through the existing MommaBees GitHub account and deployed to the same-origin URL `https://mommabees-website.pages.dev/assets/MammaBeesBakery-Homepage-QR.png`.
4. Made **Download PNG** a standard same-origin HTML link with a `download` filename, not a JavaScript image conversion.
5. Kept the existing SVG download and Print / Save as PDF actions; replaced unhelpful SVG error text with a concrete browser fallback.
6. Added compact responsive layout rules for the PNG link and long homepage destination URL.

## Files modified

- `site/assets/MammaBeesBakery-Homepage-QR.png`: new binary PNG, 900 × 900, verified scanner output
- `site/qr-code.js`: direct static PNG download URL; removed SVG-to-canvas PNG conversion
- `site/country-home-v2.css`: align PNG link with other download actions and wrap address on small screens
- `tests/source.test.js`: assert same-origin downloadable PNG link, file presence, PNG header, IHDR and dimensions, and absence of obsolete canvas conversion

## QA

- [x] QR PNG raster independently decoded to exact bakery homepage.
- [x] Local PNG signature, dimensions and repository file presence regression-tested.
- [x] Production code no longer loads SVG into `new Image()` for PNG download.
- [x] GitHub CI passed.
- [x] Cloudflare deployed matching latest main revision.
- [ ] Human browser click/download validation on Windows, Android, iOS.
- [ ] Physical phone-camera scan of paper printout.

**No payments, credentials, customer data, or product inventory were modified.**

## Revision history

| Date | Version | Change |
|---|---|---|
| 2026-10-26 | 1.16 | Replaced unreliable browser QR PNG conversion with a verified, static, same-origin image download |

**Footer:** Mamma Bee's Bakery · MBB-QR-026 · v1.16 · GitHub controlled
