# Carousel Rotation Diagnostics and Required Form Labels

**Document ID:** MBB-ADMIN-032
**Project:** MommaBees Website, Nixa, Missouri
**Version:** 1.22
**Date:** 2026-10-27
**Status:** Engineering ready, CI and production verification separate
**Filename:** docs/MBB_ADMIN_032_CAROUSEL_AND_REQUIRED_FIELDS_V1_22.md
**File type:** Markdown
**Google Drive location:** Not established; GitHub main is the system of record.
**Dependencies:** MBB-ADMIN-031 v1.21, Supabase home_carousel_slides, Admin Center.
**Purpose:** Clarify why an Owner carousel draft is not advancing publicly and apply * Required labeling to mandatory form inputs.

## Findings
At inspection the database had two actual carousel records: one published and one unpublished test draft titled "Yes Just a Test". The public carousel correctly requires at least two eligible published slides to animate. The Owner draft must not automatically become public.

## Changes
- Admin displays published/draft counts, clear activation prerequisites and a private interactive preview including drafts.
- The private preview does not change record publication settings.
- Subtle carousel slide-in transition respects reduced motion.
- A sitewide observer labels required native controls "* Required", including dynamic checkout contact and registration address fields.
- A database-informed Admin field map adds corresponding HTML required validation and labels; image URL fields validated on save are marked as required without making a read-only URL input block upload.
- Food ingredient and allergen verification are conditionally required for published food products.

## Acceptance limits
No data rows or customer orders were changed. No second slide was published automatically. Automated CI and production deployment are evidence of release readiness, not proof of a real owner-authenticated mobile/browser workflow.

## Revision History
| Date | Version | Description |
|---|---|---|
| 2026-10-27 | 1.22 | Carousel activation clarity and standardized mandatory-field indicators |

**Footer:** MommaBee Bakery&Farmstand · MBB-ADMIN-032 · v1.22 · GitHub main
