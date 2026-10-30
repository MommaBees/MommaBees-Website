-- MBB-MOD-068: independent customer review-photo publication approval.
alter table public.review_photos
  add column if not exists approved boolean not null default false,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid;
create index if not exists mbidx_review_photos_public
  on public.review_photos(review_id) where approved=true;
-- Existing customer uploads remain private and unpublished until individually approved.
