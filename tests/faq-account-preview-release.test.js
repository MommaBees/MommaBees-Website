import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {faqPage} from '../site/customer-faq.js';
import {cartActionLabel} from '../site/cart-action.js';
import {onRequestGet as faqGet,onRequestPost as faqPost} from '../functions/api/faqs.js';
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const env={SUPABASE_URL:'https://mommabees-test.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SITE_URL:'https://mommabees-website.pages.dev'};
test('FAQ defaults retain the original eleven approved policy-linked answers',()=>{
 const html=faqPage();
 assert.equal((html.match(/class="customer-faq-item"/g)||[]).length,11);
 for(const link of ['#legal/pickup','#legal/delivery','#legal/food','#legal/privacy'])assert.ok(html.includes(link));
});
test('Manager cannot modify FAQs without a signed-in staff account',async()=>{
 const request=new Request(env.SITE_URL+'/api/faqs',{method:'POST',headers:{'Content-Type':'application/json',Origin:env.SITE_URL},body:JSON.stringify({question:'Test question?',answer:'A test answer',sort_order:10,published:true})});
 const result=await faqPost({request,env});
 assert.equal(result.status,401);
});
test('Public FAQ endpoint filters out unpublished records',async()=>{
 const prior=globalThis.fetch;
 let called='';
 globalThis.fetch=async(url)=>{called=String(url);return new Response(JSON.stringify([{id:'1',source_index:0,question:'Test',answer:null,sort_order:10,published:true}]),{status:200,headers:{'Content-Type':'application/json'}});};
 try{
  const result=await faqGet({request:new Request(env.SITE_URL+'/api/faqs'),env});
  assert.equal(result.status,200);
  assert.ok(called.includes('published=eq.true'));
  assert.equal((await result.json()).items.length,1);
 }finally{globalThis.fetch=prior;}
});
test('Cart Add Update and Checkout labels are distinct',()=>{
 const cart=[{mode:'showcase',showcase_id:'pie',quantity:2}];
 const selection={mode:'showcase',showcase_id:'pie'};
 assert.equal(cartActionLabel(cart,selection,1),'Update');
 assert.equal(cartActionLabel(cart,selection,2),'Checkout');
 assert.equal(cartActionLabel([],selection,2),'Add to Cart');
});
test('Preview checkout never creates an order or accesses payment services',()=>{
 const srcPreview=src('site/checkout-preview.js');
 assert.ok(srcPreview.includes('Place Order — Disabled in Preview'));
 assert.ok(srcPreview.includes('disabled aria-disabled="true"'));
 assert.doesNotMatch(srcPreview,/fetch\(|createStripeSession|reserve_checkout|\/api\/checkout/);
 assert.ok(src('site/app.js').includes("import('./checkout-preview.js')"));
});
test('Requested account tabs, navigation alert entry, and full-width footer are present',()=>{
 const account=src('site/account.js'),app=src('site/app.js'),css=src('site/country-home-v2.css');
 for(const tab of ['orders','settings','notifications','messages'])assert.ok(account.includes('data-account-tab="'+tab+'"'));
 assert.ok(account.includes('account-welcome-heading'));
 assert.ok(app.includes('class="nav-alerts-link"'));
 assert.ok(app.includes('Got a Question Ask Momma Bee'));
 assert.ok(css.includes('max-width:none!important'));
 assert.ok(!app.includes('Please ask about ingredients and allergens before ordering.'));
});
