import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cookiePreferences,selectionToChoices,acceptCookieSelection,rejectOptionalForSession,permitsOptionalCookies} from '../site/cookie-consent.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const createStore=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};

test('Cookie Accept remembers dropdown selection; Reject overrides optional tracking for this browsing session only',()=>{
 const previous=Object.fromEntries(['localStorage','sessionStorage','document','window','CustomEvent'].map(k=>[k,globalThis[k]]));
 const local=createStore(),session=createStore(),el={innerHTML:''};
 globalThis.localStorage=local;globalThis.sessionStorage=session;
 globalThis.document={getElementById:()=>el};
 globalThis.CustomEvent=class{constructor(type,init){this.type=type;this.detail=init.detail;}};
 globalThis.window={dispatchEvent:()=>{}};
 try{
  assert.deepEqual(selectionToChoices('necessary'),{necessary:true,analytics:false,marketing:false});
  assert.deepEqual(selectionToChoices('analytics'),{necessary:true,analytics:true,marketing:false});
  assert.deepEqual(selectionToChoices('marketing'),{necessary:true,analytics:false,marketing:true});
  assert.deepEqual(selectionToChoices('both'),{necessary:true,analytics:true,marketing:true});
  assert.deepEqual(acceptCookieSelection('both'),{necessary:true,analytics:true,marketing:true});
  assert.equal(permitsOptionalCookies('marketing'),true);
  assert.equal(rejectOptionalForSession().analytics,false);
  assert.deepEqual(cookiePreferences(),{necessary:true,analytics:false,marketing:false});
  assert.equal(permitsOptionalCookies('marketing'),false);
  // A new browsing session restores the last explicitly accepted persistent choice.
  globalThis.sessionStorage=createStore();
  assert.equal(permitsOptionalCookies('marketing'),true);
  assert.equal(permitsOptionalCookies('analytics'),true);
 }finally{
  for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
 }
});
test('Cookie dialog contains one dropdown and only two decisions',()=>{
 const cookie=read('site/cookie-consent.js');
 assert.match(cookie,/id="mbee-cookie-selection"/);
 assert.match(cookie,/Necessary — Always active/);
 assert.match(cookie,/Optional analytics/);
 assert.match(cookie,/Optional marketing/);
 assert.match(cookie,/data-cookie-action="reject">Reject</);
 assert.match(cookie,/data-cookie-action="accept">Accept</);
 assert.doesNotMatch(cookie,/Reject optional|Save choices|Accept optional/);
 assert.match(cookie,/sessionStorage.setItem\(SESSION_REJECTION_KEY/);
 assert.match(cookie,/localStorage.setItem\(STORAGE_KEY/);
});
test('Sign In Securely is disabled until human verification success and locks again upon reset',()=>{
 const account=read('site/account.js');
 assert.match(account,/type="submit" disabled>Sign In Securely/);
 assert.match(account,/function syncAuthSubmit\(form\)/);
 assert.match(account,/form\.dataset\.captchaVerifiedToken/);
 assert.match(account,/callback:\(token\)=>/);
 assert.match(account,/submit.disabled=!verified/);
 assert.match(account,/delete form\.dataset\.captchaVerifiedToken/);
 assert.match(account,/captchaToken\(login\)/);
 assert.match(read('functions/api/auth/login.js'),/captcha_token/);
});
test('Admin navigation grows with page rather than using its own scrollbar',()=>{
 const css=read('site/country-home-v2.css');
 const all=css.match(/body\[data-page="admin"\] \.admin-workspace \.admin-side\{[^}]+\}/g)||[];
 assert.ok(all.length>=2,'Expected final admin nav override');
 assert.match(all.at(-1),/position:static/);
 assert.match(all.at(-1),/max-height:none/);
 assert.match(all.at(-1),/overflow:visible/);
});
test('Sandbox detail pages support item description, allergies, Qty and isolated TEST cart',()=>{
 const p=read('site/sandbox-products.js'),app=read('site/app.js');
 for(const text of ['sandboxProductPage','sandboxCartPage','Add to Sandbox Cart','Description','Ingredients','Allergens','sandbox-qty','data-sandbox-cart-qty','/api/admin/demo-checkout','validCartQuantity','mb_sandbox_cart'])
  assert.ok(p.includes(text),'Missing sandbox product detail or cart '+text);
 assert.match(app,/#sandbox-product/);
 assert.match(app,/route==='sandbox-cart'/);
 assert.match(app,/demo_store_enabled===true/);
 const server=read('functions/api/admin/demo-checkout.js');
 assert.match(server,/Array\.isArray\(input\?\.items\)/);
 assert.match(server,/!Number\.isInteger\(quantity\)/);
 assert.match(server,/catalog\.amount!==item\.price_cents/);
 assert.match(server,/checkoutFields\['line_items\['\+index\+'\]\[quantity\]'\]=String\(line\.quantity\)/);
 assert.match(server,/checkout\.livemode!==false/);
 assert.doesNotMatch(server,/reserve_checkout/);
 const migration=read('supabase/migrations/20261029_sandbox_product_details_v144.sql');
 assert.match(migration,/add column if not exists allergens text/);
 const admin=read('site/admin.js');
 assert.match(admin,/View Sandbox Product/);
});
