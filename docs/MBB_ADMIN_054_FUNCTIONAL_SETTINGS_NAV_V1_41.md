# Functional Admin Settings Navigation
**Document ID:** MBB-ADMIN-054
**Project:** Mommy Bee Farmstand and Bakery (MommaBees Website)
**Version:** 1.41
**Status:** Implemented in source; live authenticated Admin acceptance pending
**Date:** October 27, 2026
**Filename:** `docs/MBB_ADMIN_054_FUNCTIONAL_SETTINGS_NAV_V1_41.md`
**File type:** Markdown
**Google Drive location:** Not established. Controlled copy: GitHub `MommaBees/MommaBees-Website`, main.
**Purpose:** Group Admin controls by business function.

## Navigation
- Products & Inventory: products, categories, Product Showcase, varieties, inventory, recipes, photos.
- Accounts & Permissions: customers, account and staff access.
- Customer Service: messages, reviews, notifications.
- Website & Design: homepage content, carousel, store/department layout (columns × rows), site size, background, website information.
- Orders & Fulfillment: orders, bake days, pickup and delivery settings.
- Checkout & Finance: checkout controls, expenses, reports.
- Sandbox & Testing: sample catalog visibility and payment sandbox testing.
- Marketing & Promotions: campaigns, announcements, offers.

## Implementation
Existing single `public.site_settings` row remains authoritative. Each Admin editor displays and changes only its group's fields. Product Showcase visibility remains in Product Showcase. Payment behavior and existing authorization/RLS rules remain unchanged. The Pay at Pickup tax-review check is preserved in Checkout & Payment Settings. No migration or live transaction required.

## Revision history
v1.41 · 2026-10-27 · Functional navigation and settings editor separation.

**Footer:** MBB-ADMIN-054 · v1.41 · GitHub main.
