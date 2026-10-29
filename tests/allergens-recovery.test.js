import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DIETARY_CLAIMS,approvedDietaryClaims,knownAllergenStatement} from '../site/dietary-labels.js';
import {MAJOR_ALLERGENS} from '../site/allergens.js';
import {onRequestPost as recover} from '../functions/api/auth/recover.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('all nine FDA major allergen choices remain available on product details but not cards',()=>{
 assert.equal(MAJOR_ALLERGENS.length,9);
 const app=read('site/app.js'),admin=read('site/admin.js');
 assert.doesNotMatch(app,/class="showcase-card-allergens"/);
 assert.match(app,/showcase-photo-information/);
 assert.match(app,/knownAllergenStatement/);
 assert.match(app,/knownAllergenStatement/);
 assert.match(admin,/showcase-allergen-choices/);
 assert.match(admin,/showcase-allergens-reviewed/);
 assert.match(admin,/allergenReviewed/);
 assert.equal(knownAllergenStatement({allergens:''}),'Allergen information not yet provided. Ask Momma Bee before ordering.');
 assert.equal(knownAllergenStatement({allergen_reviewed:true,major_allergens:['Milk','Eggs']}),'Contains: Milk, Eggs.');
});

test('bakery dietary claims require explicit review and never appear by inference',()=>{
 assert.ok(DIETARY_CLAIMS.some(([code])=>code==='gluten-free'));
 assert.ok(DIETARY_CLAIMS.some(([code])=>code==='dairy-free'));
 assert.ok(DIETARY_CLAIMS.some(([code])=>code==='vegan'));
 assert.deepEqual(approvedDietaryClaims({dietary_claims:['gluten-free']}),[]);
 assert.deepEqual(approvedDietaryClaims({dietary_claims:['gluten-free','vegan'],dietary_claims_reviewed:true}),['Gluten-free','Vegan']);
 const admin=read('site/admin.js'),migration=read('supabase/migrations/20261029_food_dietary_allergens_v146.sql');
 assert.match(admin,/dietary-claim-panel/);
 assert.match(admin,/if\(chosen.length&&!reviewed\)throw Error/);
 assert.match(migration,/bakery_product_dietary_review_required/);
 assert.match(migration,/bakery_showcase_dietary_review_required/);
 assert.match(migration,/bakery_showcase_allergen_review_required/);
});
test('password reset email requires verified CAPTCHA and never identifies unknown email',async()=>{
 const request=(input)=>new Request('https://mommabees-website.pages.dev/api/auth/recover',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});
 const env={SITE_URL:'https://mommabees-website.pages.dev',SUPABASE_URL:'https://test-project.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'};
 assert.equal((await recover({request:request({email:'user@example.test'}),env})).status,400);
 assert.equal((await recover({request:request({email:'invalid',captcha_token:'fake'}),env})).status,400);
 const saved=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,init)=>{calls.push({url:String(url),init});return new Response(JSON.stringify({}),{status:200,headers:{'Content-Type':'application/json'}});};
 try{
  const r=await recover({request:request({email:'user@example.test',captcha_token:'test-captcha-token'}),env});
  assert.equal(r.status,200);
  assert.match((await r.json()).message,/If an account uses this email address/);
  assert.equal(calls.length,1);
  assert.match(calls[0].url,/\/auth\/v1\/recover\?redirect_to=/);
  assert.equal(JSON.parse(calls[0].init.body).gotrue_meta_security.captcha_token,'test-captcha-token');
  assert.equal(JSON.parse(calls[0].init.body).email,'user@example.test');
  assert.match(calls[0].url,/mommabees-website.pages.dev/);
 }finally{globalThis.fetch=saved;}
});

test('recovery link tokens are removed from URL and not placed into the normal account session',async()=>{
 const oldWindow=globalThis.window,oldStorage=globalThis.sessionStorage,oldFetch=globalThis.fetch;
 const store=new Map();
 globalThis.sessionStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 globalThis.window={MAMMA_BEES_CONFIG:{supabaseUrl:'https://test-project.supabase.co',supabasePublishableKey:'sb_publishable_test'}};
 try{
  const recovery=await import('../site/password-recovery.js');
  const historyCalls=[];
  const browser={location:{pathname:'/',hash:'#access_token=temporary-recovery-token&refresh_token=private-refresh&type=recovery'},
   history:{replaceState:(...args)=>historyCalls.push(args)}};
  assert.equal(recovery.capturePasswordRecoveryRedirect(browser),true);
  assert.equal(recovery.pendingRecovery(),true);
  assert.equal(historyCalls[0][2],'/#account/reset-password');
  assert.equal(store.has('mb_session'),false);
  const calls=[];
  globalThis.fetch=async(url,init)=>{calls.push({url:String(url),init});return new Response(JSON.stringify({id:'test-id'}),{status:200,headers:{'Content-Type':'application/json'}});};
  assert.equal(await recovery.setRecoveryPassword('test-new-password-123'),true);
  assert.equal(calls[0].init.method,'PUT');
  assert.equal(calls[0].init.headers.Authorization,'Bearer temporary-recovery-token');
  assert.equal(JSON.parse(calls[0].init.body).password,'test-new-password-123');
  assert.equal(calls[1].init.method,'POST');
  assert.equal(recovery.pendingRecovery(),false);
  assert.equal(store.has('mb_session'),false);
 }finally{globalThis.window=oldWindow;globalThis.sessionStorage=oldStorage;globalThis.fetch=oldFetch;}
});
test('Forgot password and change password screens are reachable from sign-in',()=>{
 const a=read('site/account.js'),app=read('site/app.js');
 assert.match(a,/href="#account\/forgot-password">Forgot password\?/);
 assert.match(a,/id="bakery-forgot-password"/);
 assert.match(a,/id="bakery-reset-password"/);
 assert.match(a,/if\(section==='forgot-password'\)/);
 assert.match(a,/if\(section==='reset-password'\)/);
 assert.match(a,/await setRecoveryPassword/);
 assert.match(a,/await requestRecoveryEmail/);
 assert.match(app,/capturePasswordRecoveryRedirect\(\)/);
 const server=read('functions/api/auth/recover.js');
 assert.match(server,/gotrue_meta_security:\{captcha_token:token\}/);
 assert.match(server,/const path='\/auth\/v1\/recover\?redirect_to='/);
 assert.doesNotMatch(server,/SUPABASE_SECRET_KEY/);
});
