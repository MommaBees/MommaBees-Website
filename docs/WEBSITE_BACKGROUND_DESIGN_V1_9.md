# Mamma Bee's Bakery — Website Background Management

**Project:** Mamma Bee's Bakery (Nixa, Missouri)  
**Document ID:** MBB-DESIGN-019  
**Version:** 1.9  
**Filename:** `docs/WEBSITE_BACKGROUND_DESIGN_V1_9.md`  
**File type:** Markdown  
**GitHub:** `MommaBees/MommaBees-Website` → `main` → `docs/`  
**Google Drive location:** Not established; GitHub is the controlled source  
**Date:** October 26, 2026  
**Status:** Source, security migration, tests, and Cloudflare deployment passed; authenticated Owner-browser upload test remains pending  
**Purpose:** Control how Owner/Admin users set and publish a consistent Missouri prairie farmhouse background on the public bakery website.  
**Dependencies:** MommaBees Supabase project `ryqcfojzdncrshinlpue`, Cloudflare Pages `mommabees-website`, active Owner/Admin login, Supabase Storage.

## Approved visual direction

Missouri prairie farmhouse, with a welcoming country kitchen feeling: weathered wooden barn-door panels, soft limestone and linen, warm cream, light woodgrain, subtle grain texture, barn-red accents, and real bakery photographs. Avoid overly large product/gallery images, fabricated merchandise photos, or text stickers on baked-good photographs.

### Owner/Admin background options

The Admin Control Panel contains **Design → Website Background**, with these presets:

1. **Missouri Prairie — Weathered Wooden Barn Doors** (default): decorative wooden-door panel treatment in CSS, not a photograph.
2. **Weathered Barnwood Planks**: warm woodgrain texture.
3. **Country Linen and Gingham**: unobtrusive fabric-inspired background.
4. **Warm Country Cream**: simple background with a selectable HEX color.
5. **My Uploaded Background Photo**: a real JPG, PNG, or WebP image selected by the Owner/Admin, e.g., weathered barn doors, an actual Missouri prairie or farmhouse.

**Preview** shows the background choice, the lightening overlay, and photo positioning before saving. The overlay ranges from 30% to 95% to preserve legibility.

**Save Background** writes settings and updates the public site. **Restore Missouri Barn Doors** resets the form to the approved design. **Disable Background** displays plain cream without deleting previous photo settings.

### Upload security / retention

- Public storage bucket: `bakery-backgrounds` (published images are publicly readable).
- File size limit: 5 MB. Allowed MIME types: `image/jpeg`, `image/png`, and `image/webp`.
- Upload is restricted by Supabase Storage RLS to authenticated, active Owner/Admin accounts. Moderators, customers, and guests cannot upload.
- File names are newly generated UUIDs; `upsert=false`. Current functionality does not replace an existing image in place.
- Only verified URLs under the specific MommaBees Supabase project's `bakery-backgrounds` path may be published.
- Uploading happens when the Owner/Admin selects **Save Background**. An unsuccessful settings save may leave an unreferenced image for later manual cleanup.
- The public website uses the image without granting visitors access to upload or change settings.
- Always obtain permission to publish third-party photographs.

### Technical controls

- Migration: `supabase/migrations/20261026_rustic_background_controls.sql`
- Public style resolver and safe-image-URL validation: `site/background.js`
- Owner/Admin editor: `site/background-admin.js`
- Admin sidebar: `site/admin.js`
- Layout styling: `site/styles.css`
- Public background application: `site/app.js`
- Background upload support: `site/api.js`
- Automated regression checks: `tests/source.test.js`

Settings columns include `background_enabled`, `background_style`, `background_image_url`, `background_position`, `background_overlay_percent`, and `background_solid_color`. The settings row remains subject to existing Owner/Admin RLS; no additional broad write rights were added.

### Acceptance checklist

- [x] Database columns, constraints, and public Storage bucket created
- [x] Owner/Admin upload policy verified
- [x] Website background selector and preview deployed
- [x] Default Missouri prairie wooden barn-door CSS selected
- [x] Restore and disable controls installed
- [x] Saved background applied across site routes
- [x] Unwanted *From Our Country Kitchen to Your Table* banner and hero sticker removed
- [x] Smaller product and gallery photo sizing deployed
- [x] GitHub automated regression tests passed
- [x] Cloudflare Pages deployment successful on `main`
- [ ] Authenticated Owner uploads an actual photo, saves it, and verifies the public page on desktop and mobile
- [ ] Confirm custom background maintains adequate contrast with long product lists and account forms

### Revision history

| Date | Version | Summary | Status |
|---|---|---|---|
| 2026-10-26 | 1.9 | Owner/Admin appearance controls, prairie wooden doors, photo uploads, previews, restores and public rendering | Deployed, browser acceptance pending |

**Footer:** Mamma Bee's Bakery · MBB-DESIGN-019 · v1.9 · GitHub-controlled
