import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SELLING_UNITS,sellingUnitLabel,itemCountPerUnit,validCartQuantity,availablePackages,packageTotal} from '../site/selling-units.js';
const source=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('Single, Half-Dozen and Dozen display as package units without modifying item prices',()=>{
 const units=SELLING_UNITS.map(([v])=>v);
 for(const name of ['single','half-dozen','dozen'])assert.ok(units.includes(name));
 assert.equal(sellingUnitLabel('single'),'Single');
 assert.equal(sellingUnitLabel('each'),'Single');
 assert.equal(sellingUnitLabel('half-dozen'),'Half-Dozen');
 assert.equal(sellingUnitLabel('dozen'),'Dozen');
 assert.equal(itemCountPerUnit('half-dozen'),6);
 assert.equal(itemCountPerUnit('dozen'),12);
 assert.equal(packageTotal(1200,2),2400);
});
test('Cart enforces whole package quantities and batch availability',()=>{
 assert.equal(validCartQuantity(1),true);
 assert.equal(validCartQuantity(30),true);
 for(const x of [0,31,1.5,NaN,-4])assert.equal(validCartQuantity(x),false);
 assert.equal(availablePackages({quantity_available:7},3),4);
 assert.equal(availablePackages({quantity_available:2},4),0);
 assert.equal(availablePackages({quantity_available:1000},0),30);
});
test('Admin can enter packaged selling unit and publish a dated ready-to-sell batch',()=>{
 const admin=source('site/admin.js');
 assert.match(admin,/field\('unit','Selling unit \(price per selected package\)','select'/);
 assert.match(admin,/new-batch-quantity/);
 assert.match(admin,/new-batch-baked/);
 assert.match(admin,/new-batch-best-before/);
 assert.match(admin,/quantity_available:quantity/);
 assert.match(admin,/await add\('stock_batches'/);
 assert.match(admin,/batchError/);
 assert.match(admin,/body\.allergens=publicAllergenStatement/);
});
test('Product page displays Description, Ingredients, Allergens, Qty and Add to Cart with package checks',()=>{
 const app=source('site/app.js');
 for(const s of ['Product description','<h2>Description</h2>','<h2>Ingredients</h2>','<h2>Allergens</h2>','Qty (number of','Add to Cart','data-qty-step','data-cart-qty','availablePackages','validCartQuantity','packageTotal','saveCart()'])
  assert.ok(app.includes(s),'Missing customer product sales element '+s);
 assert.match(app,/reviewArea\(p\.id\)/);
 const checkout=source('site/checkout-form.js');
 assert.match(checkout,/sellingUnitLabel/);
 assert.match(checkout,/packageTotal/);
 assert.match(checkout,/cart\.map\(x=>\(\{product_id:x\.product_id,mode:x\.mode,batch_id:x\.batch_id,quantity:x\.quantity\}\)\)/);
 const server=source('functions/api/checkout.js');
 assert.match(server,/reserve_checkout/);
 assert.doesNotMatch(server,/i\.price_cents/);
});
