-- MBB-BRAND-026 v1.16 | Owner-approved header offerings and catalog expansion.
-- No products are created, published, repriced, or made available for checkout.
begin;
update public.site_settings set brand_subtitle = 'Decorated Cakes, Cake Pops, & Cookies | Homemade Cheesecakes & Pies | Candies | Bread & Pastries | Handmade crocheted&sewn items | Custom engraved cutting boards | Natural homemade products - bug spray, sunscreen, lip balm, soaps & more' where id = 1;
insert into public.categories (name,slug,description,sort_order,active) values
 ('Handmade','handmade','Handmade, crocheted and sewn items, subject to published availability.',80,true),
 ('Signs/Decor','signs-decor','Decorative signs, home decor and custom engraved or handcrafted pieces.',90,true),
 ('Seasonal','seasonal','Seasonal baked goods, gifts and limited-time handmade offerings.',100,true)
on conflict (slug) do nothing;
commit;
