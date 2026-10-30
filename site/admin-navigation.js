// Functional Admin navigation. Does not grant permissions.
export const ADMIN_GROUPS=Object.freeze([["Overview",["dashboard"]],["Orders & Fulfillment",["orders","baking_days","product_day_limits","stock_batches","shopping","fulfillment_settings"]],["Products & Inventory",["products","store_showcase_items","categories","subcategories","catalog_varieties","product_photos","recipes","recipe_ingredients","ingredients","past_bakes","bulk_photo_uploads","media_cleanup"]],["Accounts & Permissions",["customer_profiles","users"]],["Customer Service",["messages","reviews","notifications"]],["Marketing & Promotions",["announcements","announcement_recipients","promotions","promotion_recipients"]],["Website & Design",["homepage_content","home_carousel_slides","store_display","website_size","website_background","site_appearance","site_settings","faqs"]],["Checkout & Finance",["live_sales","checkout_settings","reports","expenses"]],["Sandbox & Testing",["sandbox_settings","demo_catalog_items","demo_checkout_tests"]]]);
export function adminGroupsForRole(role){
 if(role==='moderator')return [['Customer Moderation',['messages','reviews']]];
 if(role==='owner')return [...ADMIN_GROUPS,['Security & Credentials',['owner_credentials']]];
 return role==='admin'?ADMIN_GROUPS.map(([group,ids])=>[group,ids.filter(id=>id!=='live_sales')]):[];
}
export const ADMIN_DESCRIPTIONS=Object.freeze({
 dashboard:'Sales, revenue charts, fulfillment, inventory, members and operational alerts.',
 faqs:'Add, edit, remove and arrange questions shown on FAQ & Policies.',
 orders:'Confirm, prepare and fulfill orders.',
 baking_days:'Manage bake dates, pickup, delivery and order cutoffs.',
 product_day_limits:'Set per-product limits for selected dates.',
 stock_batches:'Track products baked and ready to sell.',
 shopping:'Generate ingredient requirements from recorded orders.',
 products:'Add, classify, photograph and publish real products.',
 categories:'Organize major product families.',
 subcategories:'Manage named product groups within a family.',
 catalog_varieties:'Search and manage selectable product varieties, not inventory.',
 store_showcase_items:'Product Showcase controls, photos, pricing and item information.',
 product_photos:'Maintain product gallery images.',
 recipes:'Recipe yields and preparation instructions.',
 recipe_ingredients:'Recipe ingredient quantities.',
 ingredients:'Ingredients and supplies on hand.',
 past_bakes:'Photographs of past creations, not items automatically for sale.',
 bulk_photo_uploads:'Upload Homestand harvest photos or Past Bakes using separate tabs.',
 media_cleanup:'Permanently delete unreferenced uploaded images after reference verification.',
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
 store_display:'Homepage department visibility and configurable columns × rows.',
 website_background:'Site background artwork and display treatment.',
 site_appearance:'Header/footer text and backgrounds, fonts, photos, category buttons and tab colors.',
 homepage_content:'Homepage headline, introduction, hero and empty-section display.',
 site_settings:'Website header, contact, notices and public policy wording.',
 fulfillment_settings:'Pickup, delivery, service area and special dates.',
 live_sales:'Owner-only LIVE payment readiness, enable and emergency disable.',
 checkout_settings:'Pickup payment controls and restricted checkout configuration.',
 sandbox_settings:'Owner-only demo catalog visibility.',
 reports:'Sales and expense reporting.',
 expenses:'Record business expenses.',
 demo_checkout_tests:'Sandbox checkout evidence (not LIVE payments).',
 demo_catalog_items:'Owner-only sample items for sandbox testing.',
 owner_credentials:'Owner-only API credentials for TEST/LIVE, with password confirmation and provider rotation requirements.',
 users:'Accounts, staff permissions and access controls.'
});
