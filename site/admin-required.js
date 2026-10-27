
export const ADMIN_REQUIRED=Object.freeze({
 categories:['department','name','slug'],subcategories:['category_id','name','slug'],catalog_varieties:['category_id','name','slug'],store_showcase_items:['department','category_id','name','slug'],
 products:['department','category_id','product_type','name','slug','price_cents'],
 past_bakes:['title','image_url'],demo_catalog_items:['name','category','price_cents'],
 product_photos:['product_id','url'],stock_batches:['product_id','baked_on','best_before'],
 baking_days:['date','cutoff_at'],product_day_limits:['product_id','baking_date','max_quantity'],
 recipes:['product_id'],recipe_ingredients:['recipe_id','ingredient_id','quantity'],
 ingredients:['name','unit'],promotions:['title','value','starts_at','ends_at'],
 promotion_recipients:['promotion_id','customer_id'],announcements:['title','body'],
 announcement_recipients:['announcement_id','customer_id'],expenses:['purchased_on','description','amount_cents'],
 home_carousel_slides:['title','image_url','image_alt']
});
export const adminFieldIsRequired=(area,key)=>ADMIN_REQUIRED[area]?.includes(key)??false;
