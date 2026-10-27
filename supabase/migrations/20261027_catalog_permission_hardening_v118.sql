-- MBB-CATALOG-028 v1.18: catalog write-access hardening.
-- Before this correction, "active account only" was permissive FOR ALL, allowing
-- any active authenticated customer to edit catalog records despite staff policies.
-- Retain public read of active categories/subcategories and published products,
-- and retain Owner/Admin-only write policies that already exist on these tables.
begin;
drop policy if exists "active account only" on public.categories;
drop policy if exists "active account only" on public.subcategories;
drop policy if exists "active account only" on public.products;
commit;
