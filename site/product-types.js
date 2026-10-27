// MBB-ADMIN-029: keep Admin product categories and checkout product classes consistent.
// Type is a business/fulfillment classification, not a legal clearance determination.
export const PRODUCT_TYPES=Object.freeze(['food','handmade','regulated']);
export const FOOD_CATEGORY_SLUGS=Object.freeze([
 'cookies','cakes','pies','cheesecakes','pastries','bars-brownies','breads',
 'cake-pops','candies'
]);
export function productTypeForCategory(slug){
 if(slug==='natural-homemade-products')return 'regulated';
 if(slug==='handmade'||slug==='signs-decor')return 'handmade';
 if(slug==='seasonal')return null; // Seasonal can describe food or handmade goods.
 if(FOOD_CATEGORY_SLUGS.includes(slug))return 'food';
 return 'unclassified';
}
export function nonfoodHoldMessage(type){
 return type==='regulated'
  ?'Regulated personal-care products are draft-only pending a documented product-specific compliance review and a later checkout release.'
  :type==='handmade'
   ?'Handmade goods are draft-only until non-food fulfillment, inventory, and checkout handling are accepted.'
   :'';
}
