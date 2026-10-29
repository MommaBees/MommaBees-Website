import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('Shop All, homepage, Bakery and Homestand share compact product details and consistent Qty actions',()=>{
 const app=read('site/app.js'),css=read('site/country-home-v2.css');
 assert.match(app,/const card=\(p,showShopDetails=false\)=>/);
 assert.match(app,/const showcaseCard=\(item,showShopDetails=false\)=>/);
 assert.match(app,/view\.products\.map\(card\)/);
 assert.match(app,/shopProducts\.map\(p=>card\(p,true\)\)/);
 assert.match(app,/shopShowcase\.map\(item=>showcaseCard\(item,true\)\)/);
 assert.match(app,/quickCartMarkup\(p\)/);
 assert.match(app,/quickCartMarkup\(sale\)/);
 assert.match(app,/showcaseQuickCartMarkup\(item\)/);
 assert.match(app,/data-showcase-test/);
 assert.doesNotMatch(app,/Product information|Ask about ordering|shop-card-information/);
 assert.match(css,/\.card-quick-actions/);
 assert.match(css,/\.store-showcase-card>.card-showcase-buy/);
});
test('Shop All still lists Showcase even with Bakery-Homestand split off',()=>{
 const app=read('site/app.js');
 assert.match(app,/const showcase=!mode&&showcaseEnabled\(all\.settings\)/);
 assert.match(app,/\(split\?visibleDepartments:\['bakery','homestand'\]\)\.flatMap\(d=>showcaseItemsFor/);
 assert.match(app,/const linkedOnPage=new Set\(showcase\.map\(item=>item\.product_id\)/);
});
test('Showcase-only cards cannot bypass a published, real-stock product for checkout',()=>{
 const app=read('site/app.js');
 assert.match(app,/const showcaseSaleProduct=item=>publicShowcaseSaleProduct/);
 assert.match(app,/quickCartMarkup\(sale\)/);
 assert.match(app,/cartHasShowcase\(cart\)/);
 assert.match(read('functions/api/checkout.js'),/reserve_checkout/);
});
