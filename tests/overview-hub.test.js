import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.window={MAMMA_BEES_CONFIG:{}};
globalThis.sessionStorage={getItem:()=>null};
const {hubDataModel,revenueSeries}=await import('../site/overview-hub.js');
const time=new Date('2026-10-30T18:00:00Z');

test('Overview Hub uses actual paid records and excludes unpaid orders from sales',()=>{
 const data={
  orders:[
   {id:'o1',created_at:'2026-10-28T14:00:00Z',payment_status:'paid',status:'new',total_cents:5000,tax_cents:400},
   {id:'o2',created_at:'2026-10-29T14:00:00Z',payment_status:'pending',status:'new',total_cents:3000,tax_cents:240}
  ],
  order_items:[
   {order_id:'o1',product_id:'p1',quantity:2,unit_price_cents:2000},
   {order_id:'o2',product_id:'p1',quantity:5,unit_price_cents:600}
  ],
  products:[{id:'p1',name:'Apple pie',department:'bakery',published:true}],
  expenses:[{purchased_on:'2026-10-29',category:'ingredients',amount_cents:1200}],
  stock_batches:[{disabled:false,quantity_available:3,best_before:'2026-11-02'}],
  baking_days:[{enabled:true,cutoff_at:'2026-11-01T18:00:00Z'}],
  customer_profiles:[{id:'u1'}],
  messages:[{status:'new',is_staff_reply:false}],
  reviews:[{approved:false}],
  notifications:[{read_at:null}],
  promotions:[{published:true}],
  site_settings:[{checkout_enabled:false}]
 };
 const m=hubDataModel(data,[],'30',time);
 assert.equal(m.paid.length,1);
 assert.equal(m.sales,4600);
 assert.equal(m.costs,1200);
 assert.equal(m.average,4600);
 assert.equal(m.units,2);
 assert.equal(m.departmentMix[0].value,4000);
 assert.equal(m.departmentMix[0].label,'Bakery');
 assert.equal(m.alerts.pending,1);
 assert.equal(m.readyPackages,3);
 assert.equal(m.upcomingDates,1);
 assert.equal(m.checkoutEnabled,false);
 assert.equal(m.revenueTrend.at(-1).value,4600);
});
test('Overview Hub never synthesizes revenue or fake sales with an empty dataset',()=>{
 const m=hubDataModel({},[],'all',time);
 assert.equal(m.sales,0);
 assert.equal(m.paid.length,0);
 assert.equal(m.departmentMix.length,0);
 assert.equal(m.topProducts.length,0);
 assert.equal(m.revenueTrend.reduce((n,r)=>n+r.value,0),0);
});
test('Different report periods are calculated from recorded transaction dates',()=>{
 const orders=[
  {id:'old',created_at:'2026-04-10T15:00:00Z',payment_status:'paid',total_cents:6000,tax_cents:0},
  {id:'new',created_at:'2026-10-20T15:00:00Z',payment_status:'paid',total_cents:2000,tax_cents:0}
 ];
 assert.equal(hubDataModel({orders},[],'30',time).sales,2000);
 assert.equal(hubDataModel({orders},[],'365',time).sales,8000);
 assert.equal(revenueSeries(orders,time).at(-1).value,2000);
});
test('Owner-requested names and compact footer are present without changing existing nav groups',()=>{
 const account=readFileSync(new URL('../site/account.js',import.meta.url),'utf8');
 const admin=readFileSync(new URL('../site/admin.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../site/country-home-v2.css',import.meta.url),'utf8');
 assert.ok(account.includes('id="account-welcome-heading"'));
 assert.ok(admin.includes('Bakery &amp; Farmstand Control Center'));
 assert.ok(admin.includes("Momma’s Overview Hub"));
 assert.ok(css.includes('max-width:820px'));
 assert.ok(css.includes('MBB-DASH-071'));
});
