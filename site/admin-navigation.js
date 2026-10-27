// Owner/Admin navigation hierarchy. No permissions granted by navigation itself.
export const ADMIN_GROUPS=Object.freeze([
 ['Overview',['dashboard']],
 ['Orders & Fulfillment',['orders','baking_days','product_day_limits','stock_batches','shopping']],
 ['Products & Inventory',['products','categories','subcategories','product_photos','recipes','recipe_ingredients','ingredients','past_bakes']],
 ['Customers & Communication',['messages','reviews','notifications','customer_profiles']],
 ['Marketing & Promotions',['announcements','announcement_recipients','promotions','promotion_recipients']],
 ['Website & Design',['home_carousel_slides','website_size','website_background','site_settings']],
 ['Finance & Administration',['reports','expenses','demo_checkout_tests','demo_catalog_items','users']]
]);
export function adminGroupsForRole(role){
 if(role==='moderator')return [['Customer Moderation',['messages','reviews']]];
 return role==='owner'||role==='admin'?ADMIN_GROUPS:[];
}
export const ADMIN_DESCRIPTIONS=Object.freeze({
 dashboard:'Key metrics, action items and shortcuts.',
 orders:'Confirm, prepare and fulfill orders.',
 baking_days:'Manage bake dates, pickup, delivery and order cutoffs.',
 product_day_limits:'Set per-product limits for selected dates.',
 stock_batches:'Track products baked and ready to sell.',
 shopping:'Generate ingredient requirements from recorded orders.',
 products:'Add, classify, photograph and publish real products.',
 categories:'Organize major product families.',
 subcategories:'Manage the varieties within a product family.',
 product_photos:'Maintain product gallery images.',
 recipes:'Recipe yields and preparation instructions.',
 recipe_ingredients:'Recipe ingredient quantities.',
 ingredients:'Ingredients and supplies on hand.',
 past_bakes:'Photographs of past creations, not items automatically for sale.',
 messages:'Customer questions, requests and responses.',
 reviews:'Review publication and moderation.',
 notifications:'Order, request and review alerts.',
 customer_profiles:'Customer account records.',
 announcements:'Create and schedule customer announcements.',
 announcement_recipients:'Target private announcement recipients.',
 promotions:'Discount campaigns and eligibility.',
 promotion_recipients:'Private promotional audiences.',
 home_carousel_slides:'Homepage featured slides, photographs and buttons.',
 website_size:'Scale all site pages, text, navigation, cards and forms.',
 website_background:'Site background artwork and display treatment.',
 site_settings:'Header, homepage information and checkout settings.',
 reports:'Sales and expense reporting.',
 expenses:'Record business expenses.',
 demo_checkout_tests:'Sandbox checkout evidence (not LIVE payments).',
 demo_catalog_items:'Owner-only sample items for sandbox testing.',
 users:'Accounts, staff permissions and access controls.'
});
