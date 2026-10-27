-- MBB-CATALOG-045 — Bind ten user-supplied WebP harvest photos to Homestand showcase cards.
-- The WebP sprite itself is stored in this repository. Does not create products or prices.
begin;
update public.store_showcase_items
set photo_url='https://mommabees-website.pages.dev/assets/harvest-2027-sprite.webp#'||slug
where department='homestand' and photo_url is null
 and slug in('broccoli','cauliflower','green-beans','jalapenos','mini-green-peppers',
  'salad-cucumbers','spineless-okra','tomatoes','yellow-summer-squash','zucchini');
commit;
