-- MBB-CATALOG-028 v1.18 — Owner-requested product taxonomy additions.
-- Idempotent category/subcategory additions only. No product, stock, price, or checkout changes.
-- Existing Cakes, Cookies, Cheesecakes, Pies, Breads, Pastries, Handmade,
-- Signs/Decor and Seasonal categories remain unchanged.
begin;

insert into public.categories (name,slug,description,sort_order,active) values
 ('Cake Pops','cake-pops','Hand-decorated cake pops for occasions and made-to-order requests.',110,true),
 ('Candies','candies','Homemade candy varieties; product availability and ingredients vary.',120,true),
 ('Natural Homemade Products','natural-homemade-products',
  'Personal-care and outdoor products. Regulatory classification, safety, labeling and any required registrations must be reviewed before publication.',130,false)
on conflict (slug) do nothing;

with requested(category_slug, name, slug, description, sort_order, active) as (
 values
 ('cakes','Decorated Cakes','decorated-cakes','Custom decorated celebration and special-occasion cakes.',110,true),
 ('cookies','Decorated Cookies','decorated-cookies','Custom decorated cookies for occasions and celebrations.',110,true),
 ('handmade','Crocheted Items','crocheted-items','Handmade crocheted accessories, gifts and other crafts.',10,true),
 ('handmade','Sewn Items','sewn-items','Handmade sewn accessories, gifts and other crafts.',20,true),
 ('signs-decor','Custom Engraved Cutting Boards','custom-engraved-cutting-boards','Custom engraved cutting boards and related handcrafted gifts.',10,true),
 ('natural-homemade-products','Bug Spray','bug-spray','Potential insect-repellent products; do not publish or sell before EPA and Missouri review.',10,false),
 ('natural-homemade-products','Sunscreen','sunscreen','Sun-protection products require FDA nonprescription-drug compliance review before any sale.',20,false),
 ('natural-homemade-products','Lip Balm','lip-balm','Lip-care products; classification, manufacturing and labeling require review before any sale.',30,false),
 ('natural-homemade-products','Soaps','soaps','Soap and cleansing products; classification and labeling require review before any sale.',40,false)
)
insert into public.subcategories (category_id,name,slug,description,sort_order,active)
select c.id, r.name, r.slug, r.description, r.sort_order, r.active
from requested r join public.categories c on c.slug=r.category_slug
on conflict (category_id,slug) do nothing;

commit;
