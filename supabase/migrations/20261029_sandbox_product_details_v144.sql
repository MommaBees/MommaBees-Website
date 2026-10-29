-- MBB-SANDBOX-056: separate informational fields for staff-only sandbox product detail pages.
-- Never make test products publicly visible or eligible for real inventory/orders.
alter table public.demo_catalog_items
 add column if not exists ingredients text not null default '',
 add column if not exists allergens text not null default '',
 add column if not exists storage_notes text not null default '';
-- Existing RLS staff-only controls remain unchanged. Unknown ingredient/allergen values stay blank.
