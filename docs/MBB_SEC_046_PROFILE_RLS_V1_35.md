# Customer Profile RLS Tightening for Idle Preferences
**Document ID:** MBB-SEC-046 · **Version:** 1.35 · **Date:** 2026-10-27
**Project:** MommaBee Bakery&Farmstand · **Filename:** docs/MBB_SEC_046_PROFILE_RLS_V1_35.md
**Canonical location:** MommaBees/MommaBees-Website GitHub main · **Google Drive:** Not established.

Prior `public.customer_profiles` policy `active account only` was PERMISSIVE FOR ALL and matched every active user regardless of the target profile. Under PostgreSQL RLS policy OR composition, that unintentionally defeats the existing profile-owner and Owner/Admin policies. The release replaces that broad policy with a RESTRICTIVE active-account guard, retaining the existing owner-row SELECT, UPDATE and INSERT policies and staff-management RLS policies. This affects the entire customer-profile record set, not just timeout settings. No addresses, customer data, payment state or passwords are changed.

Acceptance: profile permissions inspected after migration and role-simulated read-only isolation checks, CI, Cloudflare deployment. Browser account journeys separately required.

**Footer:** MBB-SEC-046 v1.35 — MommaBees GitHub main.
