# Product Showcase Master Switch and Item Information
**Document ID:** MBB-CATALOG-049 · **Version:** 1.37 · **Date:** 2026-10-27
**Project:** MommaBee Bakery&Farmstand · **Filename:** docs/MBB_CATALOG_049_PRODUCT_SHOWCASE_CONTROL_AND_DETAILS_V1_37.md
**Source of record:** GitHub MommaBees/MommaBees-Website, main. **Google Drive folder:** Not established.

## Scope
Existing `store_showcase_items` stays the presentation catalog: eight bakery and eleven homestand entries with original owner-approved photographs. The canonical sales/Stripe tables remain separate. Admin → Products & Inventory → Product Showcase is its new customer-facing name and gives the Owner/Admin a single master enabled toggle plus existing per-item active toggles. Default enabled preserves published showcase. When disabled, promotional cards, detail routes and auto carousel item sources are hidden, while actual purchasable `products` remain. Staff can still manage hidden records.

## Buyer information
Descriptions are seeded only from owner-confirmed provenance: baked goods homemade in Nixa, MO and vegetables/berries grown in Nixa, MO without chemical sprays. Do not label the farm USDA-certified organic absent certification or a verified USDA small-producer exemption and required production records.
Individual page includes photo, title/category, owner-edited description, provenance, known price/unit or clear price inquiry route, availability, and filled ingredients/allergen/storage/fulfillment notes, plus Contact and related products. Price is nullable. No checkout is enabled solely by adding showcase price. No invented allergens, recipe formulas, stock quantities, dates, prices or certified-organic status.
Admin form edits price in dollars, sold-by unit, availability, ingredients, allergen statement, storage and fulfillment notes. Rows can be edited independently without changing master setting.

## Security/acceptance
DB public SELECT policy checks the master setting, active flag, and same-department category. Owner/Admin RLS policy still permits managing hidden items. Tests: master on/off, per-item active behavior, pricing null vs formatted values, category isolation, no checkout effect, migrated 19 descriptions, source update and CI/deployment evidence. Browser acceptance remains separate.

**Footer:** MBB-CATALOG-049 · v1.37 · GitHub main.
