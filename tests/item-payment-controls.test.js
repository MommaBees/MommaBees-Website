import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Item Payment Controls are visible in Products & Inventory and use a dedicated Admin module',()=>{
 const nav=source('site/admin-navigation.js'),admin=source('site/admin.js'),screen=source('site/item-payment-controls.js');
 assert.match(nav,/"Products & Inventory",\["item_payments","products","store_showcase_items"/);
 assert.match(admin,/selected==='item_payments'/);
 assert.match(admin,/import\('\.\/item-payment-controls\.js'\)/);
 assert.match(admin,/open-item-payment-settings/);
 assert.match(screen,/showItemPayments/);
 assert.match(screen,/data-save-payment/);
});

test('Real product editor contains independent Online Stripe and Pay at Pickup switches',()=>{
 const admin=source('site/admin.js');
 assert.match(admin,/field\('online_payment_enabled','Accept online Stripe payments for this product','bool'\)/);
 assert.match(admin,/field\('pay_at_pickup_enabled','Allow Pay at Pickup for this product','bool'\)/);
 assert.match(admin,/Item Payment Controls/);
});

test('Showcase entries cannot independently switch on payment without a real sale product',()=>{
 const screen=source('site/item-payment-controls.js');
 assert.match(screen,/No sale product linked/);
 assert.match(screen,/Display only — no payment accepted/);
 assert.match(screen,/byId\.get\(item\.product_id\)/);
 assert.doesNotMatch(screen,/update\('store_showcase_items'.*payment_enabled/);
});

test('No real order item can bypass product-specific payment flags at reservation',()=>{
 const sql=source('supabase/migrations/20261030_product_payment_permissions_v162.sql');
 assert.match(sql,/online_payment_enabled boolean not null default false/);
 assert.match(sql,/pay_at_pickup_enabled boolean not null default false/);
 assert.match(sql,/v_method='stripe' and v_online is true/);
 assert.match(sql,/v_method='pay_at_pickup' and v_pickup is true/);
 assert.match(sql,/before insert on public\.order_items/);
});

test('Customer checkout only presents payment methods that every cart product permits',()=>{
 const form=source('site/checkout-form.js'),cards=source('site/app.js');
 assert.match(form,/cart\.every\(item=>all\.products\.some\(p=>p\.id===item\.product_id&&p\.online_payment_enabled===true\)\)/);
 assert.match(form,/cart\.every\(item=>all\.products\.some\(p=>p\.id===item\.product_id&&p\.pay_at_pickup_enabled===true\)\)/);
 assert.match(cards,/p\.online_payment_enabled!==true&&p\.pay_at_pickup_enabled!==true/);
});
