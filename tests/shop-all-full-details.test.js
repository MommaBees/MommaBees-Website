import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('Shop All uses complete product-information disclosure for regular and Showcase entries',()=>{
 const app=read('site/app.js'),css=read('site/country-home-v2.css');
 assert.match(app,/const shopInformation=\(fields\)=>/);
 assert.match(app,/const productShopInformation=p=>/);
 assert.match(app,/const showcaseShopInformation=item=>/);
 for(const key of ['Description','Ingredients','Allergens','Storage & handling','Availability','Pickup & delivery'])
  assert.ok(app.includes("['"+key+"'"),'Missing Shop All field '+key);
 assert.match(app,/shopProducts\.map\(p=>card\(p,true\)\)/);
 assert.match(app,/shopShowcase\.map\(item=>showcaseCard\(item,true\)\)/);
 assert.match(app,/showShopDetails\?productShopInformation\(p\)/);
 assert.match(app,/showShopDetails\?'<div class="card-showcase-facts">'\+showcaseShopInformation\(item\)/);
 assert.match(css,/\.shop-card-information/);
 assert.match(css,/\.shop-card-fact/);
});

test('Shop All lists Showcase even when the two-department setting is off',()=>{
 const app=read('site/app.js');
 assert.match(app,/const showcase=!mode&&showcaseEnabled\(all\.settings\)/);
 assert.match(app,/\(split\?visibleDepartments:\['bakery','homestand'\]\)\.flatMap\(d=>showcaseItemsFor/);
 assert.match(app,/const linkedOnPage=new Set\(showcase\.map\(item=>item\.product_id\)/);
 assert.match(app,/shopProducts=items\.filter\(p=>!linkedOnPage\.has\(p\.id\)\)/);
});
test('Showcase-only Shop All entries do not bypass real inventory or create fake orders',()=>{
 const app=read('site/app.js');
 assert.match(app,/showShopDetails\?'<div class="card-showcase-buy"><div class="card-quick-buy is-unavailable">'/);
 assert.match(app,/disabled>Add to Cart/);
 assert.match(app,/Ask about ordering/);
 assert.match(app,/sale\?'<div class="card-showcase-buy">'\+quickCartMarkup\(sale\)/);
 const endpoint=read('functions/api/checkout.js');
 assert.match(endpoint,/reserve_checkout/);
});
