import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {availableReadyBatches,validQuickQty,publicShowcaseSaleProduct} from '../site/quick-cart.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('quick card selects available real packages and subtracts the existing cart',()=>{
 const p={id:'sale-one'},today='2026-10-29',now=new Date('2026-10-29T17:00:00Z');
 const batches=[
  {id:'expired',product_id:p.id,baked_on:today,best_before:'2026-10-28',quantity_available:10},
  {id:'b',product_id:p.id,baked_on:today,best_before:'2026-10-31',quantity_available:7},
  {id:'another-product',product_id:'other',baked_on:today,best_before:'2026-10-31',quantity_available:40}
 ];
 const days=[{date:'2026-10-30',enabled:true,cutoff_at:'2026-10-30T18:00:00Z'}];
 const cart=[{mode:'ready',batch_id:'b',quantity:3}];
 const available=availableReadyBatches(p,batches,days,cart,today,now);
 assert.equal(available.length,1);
 assert.equal(available[0].id,'b');
 assert.equal(available[0].remaining,4);
 assert.equal(availableReadyBatches(p,batches,days,[{mode:'ready',batch_id:'b',quantity:7}],today,now).length,0);
 assert.equal(validQuickQty(4,4),true);
 for(const bad of [0,-1,4.5,5,31])assert.equal(validQuickQty(bad,4),false);
});
test('Showcase may render a real sale only when explicitly linked, published, category-matched and available',()=>{
 const p={id:'p1',category_id:'c1',department:'bakery',published:true,price_cents:1299,unit:'dozen'};
 const item={product_id:'p1',department:'bakery',category_id:'c1'};
 const find=(x)=>x.department;
 assert.equal(publicShowcaseSaleProduct(item,[p],find,()=>true),p);
 assert.equal(publicShowcaseSaleProduct({...item,product_id:null},[p],find,()=>true),null);
 assert.equal(publicShowcaseSaleProduct({...item,department:'homestand'},[p],find,()=>true),null);
 assert.equal(publicShowcaseSaleProduct({...item,category_id:'other'},[p],find,()=>true),null);
 assert.equal(publicShowcaseSaleProduct(item,[{...p,published:false}],find,()=>true),null);
 assert.equal(publicShowcaseSaleProduct(item,[p],find,()=>false),null);
});
test('same small Qty/Add to Cart form is reused by homepage, Bakery, Homestand and Showcase',()=>{
 const site=source('site/app.js'),admin=source('site/admin.js'),css=source('site/country-home-v2.css');
 for(const x of ['const quickCartMarkup=p=>','data-quick-buy','card-quick-qty','card-quick-add','Add to Cart','function bindQuickCart()','form[data-quick-buy]','availableQuickBatches','saveCart()','view.products.map(card)','shopProducts.map(p=>card(p,true))','featured.map(card)','quickCartMarkup(sale)','function showcaseDetail(item)'])
  assert.ok(site.includes(x),'Missing inline commerce behavior '+x);
 assert.match(site,/publicShowcaseSaleProduct\(item,all\.products/);
 assert.match(site,/showcaseSaleProduct\(item\)/);
 assert.match(css,/\.card-quick-actions/);
 assert.match(css,/\.card-quick-add/);
 assert.match(css,/\.showcase-detail-gallery/);
 assert.match(admin,/field\('product_id','Linked sale product/);
 assert.match(admin,/linkedProduct\.department!==body\.department/);
});
test('showcase purchase link is a foreign key, not a second price or checkout system',()=>{
 const migration=source('supabase/migrations/20261029_showcase_linked_cart_v145.sql');
 assert.match(migration,/add column if not exists product_id uuid references public\.products\(id\) on delete set null/);
 assert.match(migration,/v_category_id is distinct from new\.category_id/);
 assert.doesNotMatch(migration,/insert into public\.products/);
 const site=source('site/app.js');
 assert.match(site,/productReady\(sale\)/);
 assert.match(site,/showcaseFields\(info\)/);
 assert.match(site,/reviewArea\(sale\.id\)/);
 const backend=source('functions/api/checkout.js');
 assert.match(backend,/reserve_checkout/);
});
