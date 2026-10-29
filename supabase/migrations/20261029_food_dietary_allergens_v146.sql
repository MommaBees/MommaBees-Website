-- MBB-FOOD-146: owner-reviewed dietary descriptions and Showcase major allergens.
-- Does not infer or certify any free-from claim. Existing empty values remain unverified.
alter table public.products
 add column if not exists dietary_claims text[] not null default '{}',
 add column if not exists dietary_claims_reviewed boolean not null default false;
alter table public.store_showcase_items
 add column if not exists major_allergens text[] not null default '{}',
 add column if not exists allergen_reviewed boolean not null default false,
 add column if not exists dietary_claims text[] not null default '{}',
 add column if not exists dietary_claims_reviewed boolean not null default false;

alter table public.products
 add constraint bakery_product_dietary_review_required
 check (coalesce(cardinality(dietary_claims),0)=0 or dietary_claims_reviewed=true);
alter table public.store_showcase_items
 add constraint bakery_showcase_dietary_review_required
 check (coalesce(cardinality(dietary_claims),0)=0 or dietary_claims_reviewed=true);
alter table public.store_showcase_items
 add constraint bakery_showcase_allergen_review_required
 check (coalesce(cardinality(major_allergens),0)=0 or allergen_reviewed=true);

-- Never silently carry over a free-from claim after recipe or ingredients change.
-- The Admin editor re-collects the review on edit; the DB enforces review on selected claims.
