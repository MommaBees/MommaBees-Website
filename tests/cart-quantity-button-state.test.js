import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lineQuantity,cartActionLabel} from '../site/cart-action.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Selected Qty equal to cart amount shows Checkout, any changed amount shows Add to Cart',()=>{
 const c=[{mode:'showcase',showcase_id:'pie',quantity:3},
          {mode:'preorder',product_id:'bread',batch_id:null,quantity:2},
          {mode:'ready',product_id:'cookie',batch_id:'batch-a',quantity:4}];
 const show={mode:'showcase',showcase_id:'pie'};
 assert.equal(cartActionLabel(c,show,3),'Checkout');
 assert.equal(cartActionLabel(c,show,2),'Add to Cart');
 assert.equal(cartActionLabel(c,show,4),'Add to Cart');
 assert.equal(cartActionLabel(c,{mode:'preorder',product_id:'bread',batch_id:null},2),'Checkout');
 assert.equal(cartActionLabel(c,{mode:'ready',product_id:'cookie',batch_id:'batch-a'},4),'Checkout');
 assert.equal(lineQuantity(c,{mode:'ready',product_id:'cookie',batch_id:'batch-b'}),0);
 assert.equal(cartActionLabel(c,show,0),'Add to Cart');
});
test('Cart Qty control uses a collection and supports zero for removal',()=>{
 const app=read('site/app.js');
 assert.match(app,/\$\$\('\[data-cart-qty\]'\)\.forEach\(/);
 assert.ok(app.split('\n').some(line=>line.trimStart().startsWith("$('[data-cart-qty]').forEach(")));
 assert.match(app,/if\(quantity===0\)\{cart\.splice\(index,1\);saveCart\(\);cartPage\(\);return;\}/);
});
test('Adding storefront items does not force navigation and changes checkout button state',()=>{
 const app=read('site/app.js');
 const chunk=app.slice(app.indexOf('function bindQuickCart(){'),app.indexOf('const categories=',app.indexOf('function bindQuickCart(){')));
 const submits=chunk.split("document.addEventListener('submit',event=>{").slice(1);
 assert.equal(submits.length,2);
 for(const body of submits){
  assert.match(body,/cartActionLabel\(cart,selection,/);
  assert.match(body,/syncQuickCartButtons\(\)/);
  assert.doesNotMatch(body,/nav\('#cart'\)/);
 }
 assert.match(chunk,/event\.target\.matches\?\.\('form\[data-showcase-test\]/);
 const detail=app.slice(app.indexOf('function detail(id){'),app.indexOf('async function reviewArea'));
 assert.match(detail,/cartActionLabel\(cart,selection,/);
 assert.doesNotMatch(detail,/saveCart\(\);nav\('#cart'\)/);
 assert.match(app,/button\.textContent=label/);
});
test('Automatic API rotation is disabled by default, but manual key replacement remains possible',()=>{
 const sql=read('supabase/migrations/20261029_owner_rotation_switch_v152.sql');
 assert.match(sql,/automatic_activation_enabled boolean not null default false/);
 const client=read('site/credential-management.js');
 assert.match(client,/id="owner-auto-rotation"/);
 assert.match(client,/Save Rotation Setting/);
 assert.match(client,/manually replace and verify keys even when this switch is off/);
 assert.match(client,/data-webhook-activate/);
 const api=read('functions/api/admin/credentials.js');
 assert.match(api,/onRequestPost/);
 assert.match(api,/onRequestPatch/);
 assert.match(api,/activate_webhook/);
 assert.match(read('functions/api/stripe-webhook.js'),/if\(!rotation\.enabled\)/);
 assert.match(read('functions/api/stripe-webhook.js'),/markSignedWebhookProof\(env,pending\.id\)/);
});
