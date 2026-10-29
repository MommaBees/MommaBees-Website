import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {showcasePreviewLimit,previewRemaining,validPreviewQty,cartHasShowcase} from '../site/showcase-preview-cart.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Showcase cart quantities use Owner-entered preview quantity and never exceed stock or per-line limits',()=>{
 const item={id:'example-id',preview_quantity:30};
 assert.equal(showcasePreviewLimit(item),30);
 assert.equal(previewRemaining(item,[]),30);
 assert.equal(validPreviewQty(item,[],30),true);
 assert.equal(validPreviewQty(item,[],31),false);
 const cart=[{mode:'showcase',showcase_id:item.id,quantity:12}];
 assert.equal(previewRemaining(item,cart),18);
 assert.equal(validPreviewQty(item,cart,18),true);
 assert.equal(validPreviewQty(item,cart,19),false);
 assert.equal(cartHasShowcase(cart),true);
 assert.equal(cartHasShowcase([{mode:'ready',quantity:1}]),false);
 assert.equal(showcasePreviewLimit({...item,preview_quantity:0}),0);
 assert.equal(showcasePreviewLimit({...item,preview_quantity:100001}),100000);
});

test('Store layout Cards/Open is configurable in Website Settings and applies via data-card-style',()=>{
 const admin=read('site/admin.js'),app=read('site/app.js'),css=read('site/country-home-v2.css');
 assert.match(admin,/field\('site_card_style','Website layout: Cards or Open/);
 assert.match(admin,/site_card_style","header_url"/);
 assert.match(app,/document\.body\.dataset\.cardStyle=settings\.site_card_style==='open'\?'open':'cards'/);
 assert.match(css,/body\[data-card-style="open"\] #main/);
 assert.match(css,/background:transparent!important;border:0!important/);
});

test('Showcase preview Add to Cart works for guests and cannot enter real checkout',()=>{
 const app=read('site/app.js'),checkout=read('site/checkout-form.js'),migration=read('supabase/migrations/20261029_storefront_open_layout_preview_qty_v147.sql');
 assert.match(app,/const canTestShowcase=\(\)=>showcaseEnabled\(all\.settings\)/);
 assert.match(app,/data-showcase-test/);
 assert.match(app,/validPreviewQty\(item,cart,quantity\)/);
 assert.match(app,/mode:'showcase'/);
 assert.match(app,/const hasPreviews=cartHasShowcase\(cart\)/);
 assert.match(app,/if\(cartHasShowcase\(cart\)\)/);
 assert.match(checkout,/if\(!cart\.length\|\|cartHasShowcase\(cart\)\)/);
 assert.match(migration,/preview_quantity integer not null default 30/);
 assert.match(migration,/site_card_style text not null default 'cards'/);
 assert.doesNotMatch(migration,/insert into public\.products|insert into public\.stock_batches/i);
});

test('Product details place ingredients, allergens, handling below photo; Showcase copy has no inquiry banner',()=>{
 const app=read('site/app.js');
 const showcase=app.slice(app.indexOf('function showcaseDetail(item){'),app.indexOf('function detail(id){'));
 assert.match(showcase,/showcase-photo-column/);
 assert.match(showcase,/showcase-photo-information/);
 assert.match(showcase,/quickCartMarkup\(sale\)/);
 assert.match(showcase,/showcaseQuickCartMarkup\(item\)/);
 assert.match(showcase,/Available:/);
 assert.doesNotMatch(showcase,/Display listing only|Contact the bakery about ordering/);
 const detail=app.slice(app.indexOf('function detail(id){'),app.indexOf('async function reviewArea'));
 assert.ok(detail.indexOf('product-ingredient-details')<detail.indexOf('product-description'));
});
