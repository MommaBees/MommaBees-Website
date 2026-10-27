import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHmac} from 'node:crypto';
import {verifyStripeSignature} from '../functions/_lib/stripe.js';
import {onRequestPost as checkout} from '../functions/api/checkout.js';
import {onRequestPost as demoCheckout,onRequestGet as demoHistory} from '../functions/api/admin/demo-checkout.js';
import {onRequestPost as payAtPickup} from '../functions/api/pay-at-pickup.js';
import {onRequestPost as collectPickup} from '../functions/api/admin/collect-pickup.js';
import {onRequestPost as cancelPickup} from '../functions/api/admin/cancel-pickup.js';
import {onRequestPost as contact} from '../functions/api/contact.js';
import {onRequestPost as orderStatus} from '../functions/api/order-status.js';
import {onRequestPost as protectedLogin} from '../functions/api/auth/login.js';
import {onRequestPost as protectedRegistration} from '../functions/api/auth/register.js';
import {onRequestGet as listUsers,onRequestPost as manageUser} from '../functions/api/admin/users.js';
import {onRequestPost as moderateRequest} from '../functions/api/admin/moderate.js';
import {isBackOfficeRole,backOfficeNavigation} from '../site/role-navigation.js';
import {MAJOR_ALLERGENS,suggestMajorAllergens,publicAllergenStatement} from '../site/allergens.js';
import {PAST_BAKE_IMAGE_NAMES,pastBakeName} from '../site/past-bakes.js';
import {BUILTIN_PHOTO_PRESETS,photoFor} from '../site/photo-library.js';
import {TEST_PRICES} from '../functions/_lib/demo-prices.js';
import {STOCK_PHOTOGRAPHY,stockPhotoFor,sandboxProductPhoto,demoMatchesView} from '../site/stock-photography.js';
import {SAMPLE_MENU,samplesFor} from '../site/sample-menu.js';
import {accountNavigationMarkup,ACCOUNT_MENU_OPEN_MS,ACCOUNT_MENU_CLOSE_MS} from '../site/account-navigation.js';
import {BACKGROUND_OPTIONS,backgroundChoice,verifiedBackgroundUrl,applyBakeryBackground} from '../site/background.js';
import {referenceKeyFor} from '../site/reference-keys.js';
import {WEBSITE_SIZE_OPTIONS,DEFAULT_WEBSITE_SIZE,normalizeWebsiteSize,applyWebsiteSize} from '../site/website-size.js';

import {ADMIN_REQUIRED,adminFieldIsRequired} from '../site/admin-required.js';
import {syncRequiredMarkers,bindRequiredMarkers} from '../site/required-fields.js';
import {eligibleHomeSlides,homeCarouselMarkup,carouselIntervalMilliseconds,DEFAULT_CAROUSEL_INTERVAL_SECONDS,CAROUSEL_SIZE_OPTIONS,normalizeCarouselSize} from '../site/home-carousel.js';
import {ADMIN_GROUPS,adminGroupsForRole} from '../site/admin-navigation.js';

import {PRODUCT_TYPES,productTypeForCategory,nonfoodHoldMessage} from '../site/product-types.js';
import {centralInputFromIso,isoFromCentralInput} from '../site/admin-time.js';
import {HOME_URL,QR_PNG_PATH,qrSvg,qrMarkup} from '../site/qr-code.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(path.join(root,p),'utf8');
const required=['site/account.js','site/message-center.js','functions/_lib/turnstile.js','functions/api/auth/login.js','functions/api/auth/register.js','supabase/migrations/20261026_customer_profiles_message_photos.sql','README.md','site/index.html','site/styles.css','site/config.js','site/app.js','site/api.js','site/admin.js','functions/api/checkout.js','functions/api/stripe-webhook.js','functions/api/order-status.js','functions/api/contact.js','functions/api/reconcile.js','supabase/schema.sql','docs/Mamma_Bees_Bakery_V1_Master_Project_Requirements.md'];
test('repository contains the complete expected source layout',()=>{for(const p of required)assert.equal(existsSync(path.join(root,p)),true,'missing '+p);});
test('JavaScript source files parse without syntax errors',()=>{
 const walk=dir=>readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(dir+'/'+item.name):item.name.endsWith('.js')?[dir+'/'+item.name]:[]);
 const js=[...walk('site'),...walk('functions')];
 for(const p of js){const r=spawnSync(process.execPath,['--check',path.join(root,p)],{encoding:'utf8'});assert.equal(r.status,0,p+'\n'+r.stderr);}
});
test('client config contains no apparent private credentials',()=>{
 const s=read('site/config.js'); assert.doesNotMatch(s,/sk_(?:test|live)_[A-Za-z0-9]{12}/);
 assert.doesNotMatch(s,/sb_secret_[A-Za-z0-9]{12}/);assert.doesNotMatch(s,/whsec_[A-Za-z0-9]{12}/);
});
test('SQL enables RLS on public tables and requires explicit server privilege for checkout',()=>{
 const s=read('supabase/schema.sql');assert.match(s,/alter table public\.staff_roles enable row level security|foreach t in array array\['staff_roles'/i);
 assert.match(s,/revoke all on function public\.reserve_checkout\(/);assert.match(s,/grant execute on function public\.reserve_checkout\(/);
 assert.match(s,/checkout_enabled boolean not null default false/);
 assert.match(s,/grant update\(status,note\) on public\.orders to authenticated/);
});
test('Stripe webhook signatures verify valid HMAC and reject modified/expired signatures',async()=>{
 const secret='whsec_this_is_only_a_test_example'; const raw='{"id":"evt_test","type":"checkout.session.completed"}';const ts=Math.floor(Date.now()/1000);
 const signature=createHmac('sha256',secret).update(ts+'.'+raw).digest('hex');
 const req=s=>new Request('https://example.org/api/stripe-webhook',{headers:{'Stripe-Signature':s}});
 assert.equal(await verifyStripeSignature(req(`t=${ts},v1=${signature}`),secret,raw),true);
 assert.equal(await verifyStripeSignature(req(`t=${ts},v1=${signature}`),secret,raw+'x'),false);
 assert.equal(await verifyStripeSignature(req(`t=${ts-3600},v1=${signature}`),secret,raw),false);
});
test('checkout refuses live processing until explicitly authorized',async()=>{
 const request=new Request('https://example.org/api/checkout',{method:'POST',body:JSON.stringify({items:[]})});
 const r=await checkout({request,env:{STRIPE_SECRET_KEY:'sk_live_EXAMPLE_ONLY'}});
 assert.equal(r.status,503);assert.match((await r.json()).error,/Live payments are disabled/);
});
test('checkout refuses unset Stripe Tax configuration',async()=>{
 const request=new Request('https://example.org/api/checkout',{method:'POST',body:JSON.stringify({items:[]})});
 const r=await checkout({request,env:{STRIPE_SECRET_KEY:'sk_test_EXAMPLE_ONLY'}});
 assert.equal(r.status,503);assert.match((await r.json()).error,/Tax setup is not verified/);
});
test('guest contact refuses traffic without human verification setup',async()=>{
 const request=new Request('https://example.org/api/contact',{method:'POST',body:JSON.stringify({})});
 const r=await contact({request,env:{}});assert.equal(r.status,503);
});
test('order-status requires an unpredictable format for tracking token',async()=>{
 const request=new Request('https://example.org/api/order-status',{method:'POST',body:JSON.stringify({token:'small'})});
 const r=await orderStatus({request,env:{}});assert.equal(r.status,400);
});

test('account and messaging enhancements enforce CAPTCHA and private storage',()=>{
 const account=read('site/account.js'), auth=read('functions/_lib/turnstile.js'), migration=read('supabase/migrations/20261026_customer_profiles_message_photos.sql');
 assert.match(account,/captchaToken/); assert.match(auth,/siteverify/);
 assert.match(migration,/create table if not exists public.message_photos/i);
 assert.match(migration,/Maximum five photos per message/);
 assert.match(migration,/message-photos','message-photos',false/);
 assert.match(migration,/create unique index if not exists customer_profiles_username_ci_unique/);
});

test('sign-in requires verified Turnstile before contacting authentication',async()=>{
 const request=new Request('https://mommabees-website.pages.dev/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'example@example.test',password:'NotARealPassword123',captcha_token:''})});
 const result=await protectedLogin({request,env:{TURNSTILE_SECRET_KEY:'fake-test-secret',SITE_URL:'https://mommabees-website.pages.dev'}});
 assert.equal(result.status,400);
 assert.match((await result.json()).error,/Human verification/);
});
test('account creation rejects missing CAPTCHA before saving private profile',async()=>{
 const request=new Request('https://mommabees-website.pages.dev/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'example@example.test',password:'NotARealPassword123',first_name:'Test',last_name:'User',username:'tester123',address_line1:'address',city:'Exampleville',state:'CA',country:'US',postal_code:'90210',billing_same:true,captcha_token:''})});
 const result=await protectedRegistration({request,env:{TURNSTILE_SECRET_KEY:'fake-test-secret',SITE_URL:'https://mommabees-website.pages.dev'}});
 assert.equal(result.status,400);
 assert.match((await result.json()).error,/Human verification/);
});

test('user management is blocked without a signed-in Supabase session',async()=>{
 const get=new Request('https://mommabees-website.pages.dev/api/admin/users');
 const post=new Request('https://mommabees-website.pages.dev/api/admin/users',{method:'POST',body:JSON.stringify({action:'ban'})});
 assert.equal((await listUsers({request:get,env:{}})).status,401);
 assert.equal((await manageUser({request:post,env:{}})).status,401);
 assert.equal((await moderateRequest({request:post,env:{}})).status,401);
});
test('role management is Owner protected and suspended JWTs are restricted',()=>{
 const sql=read('supabase/migrations/20261026_role_management_and_bans_v1_2.sql');
 const admin=read('functions/api/admin/users.js');
 const ui=read('site/user-management.js');
 assert.match(sql,/bakery_account_active/);
 assert.match(sql,/as restrictive for all to authenticated/);
 assert.match(sql,/protect_owner_role/);
 assert.match(sql,/account_admin_audit/);
 assert.match(admin,/Only the Owner can grant Admin access/);
 assert.match(admin,/cannot change your own role or account status/);
 assert.match(admin,/role!=='owner'/);
 assert.match(ui,/Accounts & Roles/);
});


test('native Supabase CAPTCHA receives a single unspent Turnstile token for both auth flows', async()=>{
 const previousFetch=globalThis.fetch;
 const outbound=[];
 globalThis.fetch=async (url,options)=>{
  outbound.push({url:String(url),payload:JSON.parse(options.body)});
  return new Response(JSON.stringify({access_token:'unit-test-only',user:{id:'test-id'}}),{status:200,headers:{'content-type':'application/json'}});
 };
 const env={SUPABASE_URL:'https://ryqcfojzdncrshinlpue.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock_test'};
 try{
  const loginToken='example-login-turnstile-token-not-real';
  const loginRequest=new Request('https://mommabees-website.pages.dev/api/auth/login',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({email:'unit-test@example.test',password:'NotARealPassword123',captcha_token:loginToken})
  });
  assert.equal((await protectedLogin({request:loginRequest,env})).status,200);
  const signupToken='example-signup-turnstile-token-not-real';
  const signupRequest=new Request('https://mommabees-website.pages.dev/api/auth/register',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({email:'unit-test@example.test',password:'NotARealPassword123',first_name:'Test',
    last_name:'Member',username:'unit_test_signup',address_line1:'Not a real address',
    city:'Exampleville',state:'CA',country:'US',postal_code:'90210',billing_same:true,
    captcha_token:signupToken})
  });
  assert.equal((await protectedRegistration({request:signupRequest,env})).status,200);
  assert.equal(outbound.length,2,'only Supabase should receive the challenge; Cloudflare must not redeem it first');
  assert.equal(outbound[0].url,env.SUPABASE_URL+'/auth/v1/token?grant_type=password');
  assert.equal(outbound[1].url,env.SUPABASE_URL+'/auth/v1/signup');
  assert.deepEqual(outbound[0].payload.gotrue_meta_security,{captcha_token:loginToken});
  assert.deepEqual(outbound[1].payload.gotrue_meta_security,{captcha_token:signupToken});
  assert.equal(outbound[1].payload.data.username,'unit_test_signup');
  for(const call of outbound){
   assert.equal(Object.hasOwn(call.payload,'captcha_token'),false,'must use expected nested gotrue field');
   assert.equal(Object.hasOwn(call.payload.data||{},'captcha_token'),false,'never persist token in account metadata');
   assert.ok(!call.url.includes('siteverify'),'Turnstile tokens are single-use');
  }
 }finally{globalThis.fetch=previousFetch;}
});

test('auth endpoints do not contact Supabase without a Turnstile response',async()=>{
 const env={SUPABASE_URL:'https://ryqcfojzdncrshinlpue.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock_test'};
 const req=new Request('https://mommabees-website.pages.dev/api/auth/login',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email:'unit-test@example.test',password:'FakePassword!',captcha_token:''})
 });
 const result=await protectedLogin({request:req,env});
 assert.equal(result.status,400);
 assert.match((await result.json()).error,/Human verification/);
});


test('Admin role lookup stays inside its declared scope and retains Owner/Admin/Moderator access',()=>{
 const code=read('site/admin.js');
 assert.match(code,/const roles=await list\('staff_roles'/);
 assert.match(code,/const authorizedRole=roles\.find\(x=>\['owner','admin','moderator'\]\.includes\(x\.role\)\)/);
 assert.match(code,/if\(!authorizedRole\)throw Error/);
 assert.match(code,/ctx\.role=authorizedRole\.role;/);
 assert.doesNotMatch(code,/ctx\.role\s*=\s*roles\.find/, 'Role lookup must not reference try-scoped roles after catch');
 assert.match(code,/if\(ctx\.role==='moderator'\)selected='messages'/);
});


test('registration username is copied to the matching customer profile and displayed with Account ID',()=>{
 const signup=read('functions/api/auth/register.js');
 const migration=read('supabase/migrations/20261026_customer_profiles_message_photos.sql');
 const profile=read('site/account.js');
 assert.match(signup,/username:clean\(input\.username,30\)/);
 assert.match(signup,/email,password,data,gotrue_meta_security/);
 assert.match(migration,/nullif\(left\(m->>'username',30\),''\)/);
 assert.match(migration,/customer_profiles_username_ci_unique/);
 assert.match(profile,/Username:<\/strong>.*h\(profile\.username/);
 assert.match(profile,/Account ID:<\/strong>.*h\(profile\.account_code/);
 assert.match(profile,/text',p\.username/);
});


test('member username is locked and Edit Profile must be opened explicitly',()=>{
 const account=read('site/account.js');
 const migration=read('supabase/migrations/20261026_lock_member_username_v1_3.sql');
 assert.match(migration,/revoke update \(username\) on public\.customer_profiles from authenticated;/);
 assert.match(account,/profileFields\(profile,\{editableUsername:false\}\)/);
 assert.match(account,/id="edit-profile">Edit Profile/);
 assert.match(account,/id="profile-editor" hidden/);
 assert.match(account,/collect\(form,\{includeUsername:false\}\)/);
 assert.match(account,/Locked after registration/);
});
test('username updates are reserved for Admin and Owner management with audit trail',()=>{
 const manage=read('functions/api/admin/users.js');
 const directory=read('site/user-management.js');
 const admin=read('site/admin.js');
 const migration=read('supabase/migrations/20261026_lock_member_username_v1_3.sql');
 assert.match(manage,/if\(action==='username'\)/);
 assert.match(manage,/Only the Owner can edit the Owner username/);
 assert.match(manage,/Only the Owner can edit another Admin username/);
 assert.match(manage,/auditAccount\(env,actor,target,'change_username'/);
 assert.match(directory,/data-username/);
 assert.match(directory,/action:'username'/);
 assert.match(admin,/f\.key==='username'\)continue/);
 assert.match(migration,/'change_username'/);
});

test('private Admin navigation never appears to anonymous visitors or customers',()=>{
 for(const role of [null,undefined,'','customer','guest','staff','banned','administrator']){
  assert.equal(isBackOfficeRole(role),false);
  assert.equal(backOfficeNavigation(role),'');
 }
 for(const role of ['owner','admin']){
  assert.equal(isBackOfficeRole(role),true);
  assert.match(backOfficeNavigation(role),/href="#admin">Admin<\/a>/);
 }
 assert.equal(isBackOfficeRole('moderator'),true);
 assert.match(backOfficeNavigation('moderator'),/href="#admin">Moderation<\/a>/);
 assert.doesNotMatch(backOfficeNavigation('moderator'),/>Admin</);
});

test('staff role comes from Supabase RLS and direct access is guarded',()=>{
 const app=read('site/app.js');
 assert.match(app,/const roles=await list\('staff_roles',\{select:'role',user_id:'eq\.'\+user\.id/);
 assert.match(app,/verifiedBackOfficeRole=null; \/\/ Fail closed/);
 assert.match(app,/await refreshBackOfficeRole\(\)/);
 assert.match(app,/backOfficeNavigation\(verifiedBackOfficeRole\)/);
 assert.match(app,/route==='admin'&&!isBackOfficeRole\(verifiedBackOfficeRole\)/);
 assert.match(app,/Page unavailable/);
 assert.doesNotMatch(app,/<a href="#admin">Admin<\/a>/, 'Admin must never be hardcoded into public navigation');
});

test('customer pages avoid revealing internal operational setup instructions',()=>{
 const app=read('site/app.js');
 assert.doesNotMatch(app,/owner must connect a Supabase project|Confirm cottage-food labeling and operating permissions before accepting real orders|Ordering has not yet been activated by the bakery owner|Featured products will appear when the bakery owner publishes/);
});

test('FDA nine-major-allergen checklist suggests ingredients but does not claim certainty',()=>{
 assert.equal(MAJOR_ALLERGENS.length,9);
 for(const item of ['Milk','Eggs','Fish','Crustacean shellfish','Tree nuts','Peanuts','Wheat','Soybeans','Sesame'])
  assert.ok(MAJOR_ALLERGENS.includes(item));
 const detected=suggestMajorAllergens({name:'Caramel Pecan',ingredients:'Cream cheese, eggs, pecans, graham crackers, butter'});
 for(const expected of ['Milk','Eggs','Tree nuts','Wheat'])assert.ok(detected.includes(expected));
 assert.ok(!detected.includes('Fish'));
 assert.equal(publicAllergenStatement(['Milk','Tree nuts']),'Contains: Milk, Tree nuts.');
 assert.match(publicAllergenStatement([]),/No major allergens declared/);
});
test('Past Bakes Gallery cannot create a sale product by importing an image',()=>{
 const app=read('site/app.js'),admin=read('site/admin.js'),migration=read('supabase/migrations/20261026_past_bakes_and_allergens.sql');
 assert.match(app,/all\.pastBakes\.filter\(x=>x\.published&&x\.image_url\)/);
 assert.match(app,/Past Bakes Gallery/);
 assert.match(app,/Past creation · Not for sale/);
 assert.match(admin,/upload\('past-bakes',file\)/);
 assert.match(admin,/add\('past_bakes'/);
 assert.match(admin,/selected==='products'/);
 assert.match(migration,/create table if not exists public\.past_bakes/);
 assert.doesNotMatch(migration,/product_id uuid references public\.products/, 'Past Bakes must remain independent of products');
 assert.equal(Object.keys(PAST_BAKE_IMAGE_NAMES).length,12);
 assert.equal(pastBakeName('641606795_26269991649297341_1895014751577267796_n.jpg'),'Caramel Pecan');
});
test('product editor requires acknowledged allergen review before publication',()=>{
 const admin=read('site/admin.js'),sql=read('supabase/migrations/20261026_past_bakes_and_allergens.sql');
 assert.match(admin,/MAJOR_ALLERGENS\.filter\(name/);
 assert.match(admin,/id="allergen-reviewed"/);
 assert.match(admin,/body\.allergen_reviewed=reviewed/);
 assert.match(admin,/body\.major_allergens=groups/);
 assert.match(admin,/body\.allergens=publicAllergenStatement\(groups\)/);
 assert.match(sql,/validate_allergens_before_publish/);
 assert.match(sql,/new\.allergen_reviewed/);
});


test('demo catalog and placeholders are isolated from real sales',()=>{
 const migration=read('supabase/migrations/20261026_demo_catalog_placeholders.sql');
 const site=read('site/app.js'),admin=read('site/admin.js');
 assert.match(migration,/demo_store_enabled boolean not null default false/);
 assert.match(migration,/create table if not exists public.demo_catalog_items/);
 assert.match(migration,/create table if not exists public.demo_checkout_tests/);
 assert.match(migration,/revoke all on public.demo_catalog_items from anon,authenticated/);
 assert.match(migration,/role in \('owner','admin'\)/);
 assert.match(site,/demoStorePreview\(mode\|\|'all'/);
 assert.doesNotMatch(site,/function sandboxStore\(/);
 assert.match(site,/(TEST MODE|SANDBOX|TEST ONLY)/);
 assert.match(site,/placeholder_empty_shop===false/);
 assert.match(site,/placeholder_empty_gallery===false/);
 assert.match(site,/placeholder_featured===false/);
 assert.match(site,/placeholder_missing_image===false/);
 assert.match(admin,/demo_catalog_items:\{label:'Sandbox Test Products'/);
 assert.match(admin,/past_bakes:\{label:'Past Bakes Gallery'/);
 assert.match(admin,/field\('demo_store_enabled'/);
 assert.doesNotMatch(site,/Homemade in Nixa, Missouri/);
});
test('sandbox checkout denies anonymous access and never uses live Stripe credentials',async()=>{
 const req=new Request('https://mommabees-website.pages.dev/api/admin/demo-checkout',
  {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item_id:crypto.randomUUID()})});
 const emptyEnv={STRIPE_SECRET_KEY:'sk_live_not_a_real_key'};
 assert.equal((await demoCheckout({request:req,env:emptyEnv})).status,401);
 assert.equal((await demoHistory({request:req,env:emptyEnv})).status,401);
 const src=read('functions/api/admin/demo-checkout.js');
 assert.match(src,/!\/\^sk_test_\/\.test\(env\.STRIPE_SECRET_KEY/);
 assert.match(src,/demo_store_enabled!==true/);
 assert.match(src,/checkout\.livemode!==false/);
 assert.doesNotMatch(src,/automatic_tax\[enabled\]/);
 assert.doesNotMatch(src,/reserve_checkout/);
 const webhook=read('functions/api/stripe-webhook.js');
 assert.match(webhook,/event\.livemode!==false\|\|session\.livemode!==false/);
 assert.match(webhook,/metadata\?\.demo_checkout_test_id/);
});


test('pickup reservations are protected by CAPTCHA and admin collection requires authorization',async()=>{
 const req=new Request('https://mommabees-website.pages.dev/api/pay-at-pickup',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({items:[],first_name:'Test',last_name:'Guest'})
 });
 const anonymous=await payAtPickup({request:req,env:{SITE_URL:'https://mommabees-website.pages.dev',TURNSTILE_SECRET_KEY:'test_dummy_only'}});
 assert.equal(anonymous.status,400);
 const collect=new Request('https://mommabees-website.pages.dev/api/admin/collect-pickup',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({})});
 assert.equal((await collectPickup({request:collect,env:{}})).status,401);
});

test('pay-at-pickup is isolated from Stripe and disallows unapproved dates',()=>{
 const migration=read('supabase/migrations/20261026_pickup_fair_pay_at_pickup.sql');
 const api=read('functions/api/pay-at-pickup.js');
 const collect=read('functions/api/admin/collect-pickup.js');
 assert.match(migration,/pay_at_pickup_enabled boolean not null default false/);
 assert.match(migration,/pay_at_pickup_available boolean not null default false/);
 assert.match(migration,/special_date_convenience_fee_cents integer not null default 0/);
 assert.match(migration,/p_date<v_today/);
 assert.match(migration,/d.cutoff_at<=now/);
 assert.match(migration,/not d.pay_at_pickup_available/);
 assert.match(migration,/p_contact_channel='text'/);
 assert.match(migration,/reservation_expires_at/);
 assert.match(migration,/payment_status','awaiting_pickup'/);
 assert.match(migration,/confirm_pickup_payment/);
 assert.match(api,/verifyTurnstile/);
 assert.doesNotMatch(api,/createStripeSession|checkout\.session/);
 assert.match(collect,/requireBakeryManager/);
});

test('checkout supports accessible highlighted calendar, unavailable-day inquiry and text-only guest contact',()=>{
 const calendar=read('site/pickup-calendar.js');
 const form=read('site/checkout-form.js');
 const app=read('site/app.js');
 const admin=read('site/admin.js');
 assert.match(calendar,/data-pickup-day/);
 assert.match(calendar,/dialog\.showModal/);
 assert.match(calendar,/calendar-available/);
 assert.match(calendar,/mb_requested_special_date/);
 assert.match(form,/select name="date" id="date"/);
 assert.match(form,/First name<input/);
 assert.match(form,/Last name<input/);
 assert.match(form,/Street address<input/);
 assert.match(form,/ZIP code<input/);
 assert.match(form,/Phone \(text messages only\)/);
 assert.match(form,/contact-channel/);
 assert.match(form,/pay-at-pickup/);
 assert.match(form,/\/api\/pay-at-pickup/);
 assert.match(app,/mb_requested_special_date/);
 assert.match(admin,/pay_at_pickup_enabled/);
 assert.match(admin,/pay_at_pickup_available/);
 assert.match(admin,/Record Pickup Payment/);
});

test('unpaid pickup cancellation and payment recording are owner/admin-only',async()=>{
 const request=new Request('https://mommabees-website.pages.dev/api/admin/cancel-pickup',
 {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({order_id:'00000000-0000-4000-8000-000000000001',reason:'Test cancel'})});
 assert.equal((await cancelPickup({request,env:{}})).status,401);
 const sql=read('supabase/migrations/20261026_cancel_unpaid_pickup.sql');
 const protect=read('supabase/migrations/20261026_prevent_cancelled_pickup_collection.sql');
 assert.match(sql,/quantity_available=quantity_available\+row_item.quantity/);
 assert.match(sql,/o\.payment_status/);
 assert.match(sql,/payment_status<>'awaiting_pickup'/);
 assert.match(protect,/r\.reservation_released or r\.status='cancelled'/);
});
test('guest online checkout captures address and requires an email',()=>{
 const src=read('functions/api/checkout.js');
 assert.match(src,/guestAddress=body\.guest_address/);
 assert.match(src,/Guest checkout requires first and last name/);
 assert.match(src,/email address is required for Stripe online payments/i);
 assert.match(src,/guest_contact_address/);
});
test('four-day fair generator and tax confirmation must be configured by staff',()=>{
 const admin=read('site/admin.js');
 const form=read('site/checkout-form.js');
 assert.match(admin,/Set Up 4-Day Bake Fair/);
 assert.match(admin,/Array\.from\(\{length:4\}/);
 assert.match(admin,/America\/Chicago/);
 assert.match(admin,/pay_at_pickup_tax_reviewed/);
 assert.match(admin,/Record Pickup Payment/);
 assert.match(admin,/Cancel Unpaid Pickup/);
 assert.match(form,/calendar-picker/);
 assert.match(form,/Pickup reservation received/);
 assert.match(form,/text_consent/);
 assert.match(form,/guest_contact_address|guest_address/);
});

test('available pickup dates respect cart product lead times and ready-stock limits',()=>{
 const checkout=read('site/checkout-form.js');
 assert.match(checkout,/canFulfillCartOn/);
 assert.match(checkout,/futureDate\(product\.lead_days\)/);
 assert.match(checkout,/batch\.best_before>=date/);
 assert.match(checkout,/batch\.quantity_available>=item\.quantity/);
 assert.match(checkout,/new Date\(d\.cutoff_at\)>new Date\(\)/);
});

test('verified real photograph fallback is visibly labeled rather than passed off as an actual product',()=>{
 const photos=BUILTIN_PHOTO_PRESETS;
 assert.ok(photos.length>=13);
 assert.ok(photos.every(x=>x.url.startsWith('https://') && x.source.startsWith('https://')));
 assert.ok(photos.every(x=>x.license && x.credit && x.type));
 assert.ok(photos.some(x=>x.type==='bakery_original'));
 assert.ok(photos.some(x=>x.license==='CC0 1.0'));
 assert.equal(photoFor('Pies','Apple Pies').sub,'Apple Pies');
 const store=read('site/app.js'),admin=read('site/admin.js');
 assert.match(store,/photoStatusLabel/);
 assert.match(store,/photo-disclosure/);
 assert.match(admin,/BUILTIN_PHOTO_PRESETS/);
 assert.match(admin,/data-photo-library-for/);
});
test('sandbox checkout uses exactly the six created Stripe prices, never live prices',()=>{
 const names=Object.keys(TEST_PRICES);
 assert.equal(names.length,6);
 for(const p of Object.values(TEST_PRICES)){
  assert.match(p.stripeProduct,/^prod_/);
  assert.match(p.stripePrice,/^price_/);
  assert.ok(p.amount>=50);
 }
 const source=read('functions/api/admin/demo-checkout.js');
 assert.match(source,/catalog\.stripePrice/);
 assert.match(source,/catalog\.amount!==item\.price_cents/);
 assert.match(source,/checkout\.livemode!==false/);
 assert.match(source,/sk_test_/);
 assert.doesNotMatch(source,/sk_live_/);
});
test('subcategory migration enforces same-parent consistency and preserves blank categories hidden',()=>{
 const sql=read('supabase/migrations/20261026_category_subcategory_image_presets.sql');
 const store=read('site/app.js'),admin=read('site/admin.js');
 assert.match(sql,/create table if not exists public\.subcategories/);
 assert.match(sql,/create table if not exists public\.photo_presets/);
 assert.match(sql,/product_subcategory_consistency/);
 assert.match(sql,/s\.category_id=new\.category_id/);
 assert.match(store,/subcategory-tabs/);
 assert.match(store,/items\.some\(p=>p\.subcategory_id===x\.id\)/);
 assert.match(admin,/const updateHierarchy=\(level='department'\)/);
 assert.match(admin,/if\(!el&&\['subcategory_id','variety_id'\]\.includes\(f\.key\)\)/);
});
test('terms do not treat an off-schedule inquiry as an accepted order',()=>{
 const store=read('site/app.js');
 assert.match(store,/Special-date requests are not confirmed orders/);
 assert.match(store,/A special-order request is an inquiry only/);
 assert.match(store,/location, product, and fulfillment restrictions required by applicable law/);
});


test('country background presets include weathered wooden doors and safe uploaded photos',()=>{
 assert.equal(backgroundChoice('prairie_doors'),'prairie_doors');
 assert.equal(backgroundChoice('malicious-style'),'prairie_doors');
 assert.equal(BACKGROUND_OPTIONS.length,6);
 assert.equal(backgroundChoice('chickens'),'chickens');
 assert.ok(BACKGROUND_OPTIONS.some(x=>x.label.includes('Wooden Barn Doors')));
 const base='https://ryqcfojzdncrshinlpue.supabase.co';
 const photo=base+'/storage/v1/object/public/bakery-backgrounds/00000000-0000-4000-8000-000000000001.jpg';
 assert.equal(verifiedBackgroundUrl(photo,base),photo);
 assert.equal(verifiedBackgroundUrl('https://other-site.com/storage/v1/object/public/bakery-backgrounds/00000000-0000-4000-8000-000000000001.jpg',base),'');
 assert.equal(verifiedBackgroundUrl(base+'/storage/v1/object/public/product-photos/00000000-0000-4000-8000-000000000001.jpg',base),'');
 assert.equal(verifiedBackgroundUrl('javascript:alert(1)',base),'');
 const vars=new Map();
 const fake={dataset:{},style:{setProperty:(key,val)=>vars.set(key,val)}};
 assert.equal(applyBakeryBackground({background_style:'prairie_doors'},base,fake),'prairie_doors');
 assert.equal(fake.dataset.siteBackground,'prairie_doors');
 assert.equal(applyBakeryBackground({background_enabled:false,background_style:'photo'},base,fake),'solid');
 assert.equal(fake.dataset.siteBackground,'solid');
});
test('website background settings, image storage and owner-only editor are connected',()=>{
 const migration=read('supabase/migrations/20261026_rustic_background_controls.sql');
 const app=read('site/app.js'),admin=read('site/admin.js'),editor=read('site/background-admin.js');
 const api=read('site/api.js'),css=read('site/styles.css');
 assert.match(migration,/background_style text not null default 'prairie_doors'/);
 assert.match(migration,/create policy "bakery management upload website backgrounds"/);
 assert.match(migration,/s\.role in \('owner','admin'\)/);
 assert.match(migration,/file_size_limit=5242880/);
 assert.match(admin,/website_background/);
 assert.match(editor,/Only Owner\/Admin accounts/);
 assert.match(editor,/upload\('bakery-backgrounds'/);
 assert.match(editor,/Save Background/);
 assert.match(editor,/Restore Watercolor Chickens/);
 assert.match(app,/applyBakeryBackground\(settings,config\.supabaseUrl\)/);
 assert.match(api,/'bakery-backgrounds'/);
 assert.match(css,/prairie_doors/);
 assert.doesNotMatch(app,/From Our Country Kitchen to Your Table|From Our Country Kitchen<br>/);
});

test('six staff sandbox products have fixed stock photos and truly separate view filters',()=>{
 const names=['Chocolate Chip Cookies','Cinnamon Rolls','Apple Pie','Carrot Cake','Classic Cheesecake','Brownie Box'];
 assert.equal(Object.keys(STOCK_PHOTOGRAPHY).length,7);
 assert.equal(new Set(names.map(name=>sandboxProductPhoto({name,category:'Test'}).url)).size,6);
 for(const name of names){
  const picture=sandboxProductPhoto({name});
  assert.match(picture.url,/^\/assets\/demo\/[a-z0-9-]+\.webp$/);
  assert.equal(picture.license,'Bakery-commissioned illustrative concept artwork');
  assert.equal(picture.disclosure,'Sample image — not an actual bakery product');
 }
 assert.equal(names.filter(name=>demoMatchesView({name},'all')).length,6);
 assert.equal(names.filter(name=>demoMatchesView({name},'ready')).length,3);
 assert.equal(names.filter(name=>demoMatchesView({name},'preorder')).length,3);
 assert.equal(stockPhotoFor('Bars & Brownies').category,'brownies');
 assert.equal(stockPhotoFor('Pies').category,'pies');
});
test('real shop routes contain staff-only test examples without customer test access',()=>{
 const app=read('site/app.js');
 const start=app.indexOf('function shop(mode=null,categoryId=null,subcategoryId=null,requestedDepartment=null)');
 const end=app.indexOf('function detail(id){',start);
 const shop=app.slice(start,end);
 assert.ok(start>0&&end>start);
 assert.match(shop,/demoStorePreview\(mode\|\|'all'/);
 assert.match(shop,/filter\(productReady\)/);
 assert.match(shop,/filter\(productPreorder\)/);
 assert.match(shop,/shop-page--/);
 assert.match(shop,/Shop All/);
 assert.match(shop,/Ready to Sell/);
 assert.match(shop,/Preorder/);
 assert.match(app,/if\(route==='sandbox-store'\)\{nav\('#shop'\);return;\}/);
 assert.doesNotMatch(app,/sandbox-nav-link|function sandboxStore\(/);
 assert.match(app,/aria-current="page"/);
 const home=app.slice(app.indexOf('function home(){'),app.indexOf('function shop('));
 assert.match(home,/stockPhotoFor\(c\.name\)/);
 assert.match(home,/categories\(\)\.map/);
 assert.match(app,/\['owner','admin'\]\.includes\(verifiedBackOfficeRole\)/);
});
test('missing stock images are replaced with an accessible fallback instead of broken-image icons',()=>{
 const app=read('site/app.js'),styles=read('site/styles.css');
 assert.match(app,/img\.addEventListener\('error'/);
 assert.match(app,/graceful-image-fallback/);
 assert.match(styles,/\.shop-hero/);
 assert.match(styles,/\.sandbox-store-page/);
});

test('QR is generated locally for verified bakery homepage and supports downloads/printing',()=>{
 assert.equal(HOME_URL,'https://mommabees-website.pages.dev/');
 const svg=qrSvg();
 assert.match(svg,/viewBox="0 0 45 45"/);
 assert.match(svg,/shape-rendering="crispEdges"/);
 assert.match(svg,/<path fill="#1b1713"/);
 assert.ok(svg.length>4000);
 assert.match(qrMarkup(),/data-qr-download="svg"/);
 assert.match(qrMarkup(),/data-qr-download="png"/);
 assert.match(qrMarkup(),/data-qr-print/);
 const app=read('site/app.js');
 assert.match(app,/route==='qr'\)qrPage/);
 assert.match(app,/qrSvg\(\)/);
 assert.match(app,/href="#qr"/);
});
test('mobile and tablet layouts take usable width and have accessible menu controls',()=>{
 const app=read('site/app.js'),css=read('site/styles.css');
 assert.match(app,/id="mobile-nav-toggle"/);
 assert.match(app,/aria-expanded="false"/);
 assert.match(app,/id="primary-navigation"/);
 assert.match(app,/toggle\.setAttribute\('aria-expanded'/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media\(max-width:460px\)/);
 assert.match(css,/max-width:1760px/);
 assert.match(css,/\.navlinks\.mobile-open/);
 assert.match(css,/@media print/);
 assert.doesNotMatch(app,/Missouri Prairie Roots/);
});

test('six actual optimized bakery photos are stored locally and all show modes differ',()=>{
 const expected=['chocolate-chip-cookies','apple-pie','cinnamon-rolls','brownie-box','strawberry-cake','caramel-pecan-cheesecake'];
 for(const imageName of expected){
  const filename='site/assets/demo/'+imageName+'.webp';
  assert.ok(existsSync(path.join(root,filename)),filename+' must be uploaded to GitHub');
  const bytes=readFileSync(path.join(root,filename));
  assert.ok(bytes.length>3000,filename+' contains image data');
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
 assert.equal(SAMPLE_MENU.length,6);
 assert.equal(samplesFor('all').length,6);
 assert.equal(samplesFor('ready').length,3);
 assert.equal(samplesFor('preorder').length,3);
 assert.equal(samplesFor('ready').filter(x=>samplesFor('preorder').some(y=>y.name===x.name)).length,0);
 assert.equal(samplesFor('all','Pies').length,1);
});
test('sample descriptions cannot claim product availability or take payments from guests',()=>{
 const app=read('site/app.js');
 const preview=app.slice(app.indexOf('function demoStorePreview('),app.indexOf('function bindDemoStore()'));
 assert.match(preview,/Menu example · Not available to order/);
 assert.match(preview,/staff&&stored/);
 assert.match(preview,/TEST MODE · NOT REAL INVENTORY/);
 assert.match(preview,/hasRealProducts/);
 assert.match(preview,/samplesFor\(mode,categoryName\)/);
 assert.match(app,/demoStorePreview\(mode\|\|'all'/);
 assert.doesNotMatch(read('site/stock-photography.js'),/images\.unsplash\.com/);
});

test('username/email login UI offers one field without changing email-only registration',()=>{
 const account=read('site/account.js'),api=read('site/api.js');
 assert.match(account,/item\('identifier','Username or email address','username',true,'text'\)/);
 assert.match(account,/login\.elements\.identifier\.value/);
 assert.match(account,/item\('email','Email address','email',true,'email'\)/);
 assert.match(api,/JSON\.stringify\(\{identifier:String\(identifier\|\|''\)\.trim\(\),password,captcha_token:captchaToken\}\)/);
 const migration=read('supabase/migrations/20261026_username_or_email_signin.sql');
 assert.match(migration,/lower\(cp\.username\) = lower\(p_username\)/);
 assert.match(migration,/cp\.banned_at is null/);
 assert.match(migration,/revoke all on function public\.bakery_login_user_id\(text\) from public, anon, authenticated/);
 assert.match(migration,/grant execute on function public\.bakery_login_user_id\(text\) to service_role/);
 const next=read('supabase/migrations/20261026_username_email_server_lookup_v115.sql');
 assert.match(next,/security definer/);
 assert.match(next,/security invoker/);
 assert.match(next,/revoke all on function public\.bakery_login_email\(text\) from public, anon, authenticated/);
 assert.match(next,/grant execute on function public\.bakery_login_email\(text\) to service_role/);
});
test('username login resolves email only on server and preserves single Supabase CAPTCHA verification',async()=>{
 const former=globalThis.fetch,calls=[],uuid='11111111-1111-4111-8111-111111111111';
 const env={SUPABASE_URL:'https://ryqcfojzdncrshinlpue.supabase.co',
  SUPABASE_SECRET_KEY:'sb_secret_test_only',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_only'};
 globalThis.fetch=async(url,options={})=>{
  const u=String(url);calls.push({url:u,headers:options.headers||{},body:options.body});
  if(u.includes('/rest/v1/rpc/bakery_login_email')){
   assert.equal(options.headers.apikey,env.SUPABASE_SECRET_KEY);
   assert.ok(!options.headers.Authorization,'No JWT-style bearer header with new secret');
   assert.equal(JSON.parse(options.body).p_username,'mommabee');
   return new Response(JSON.stringify('owner-for-test@example.test'),{status:200});
  }
  if(u.includes('/auth/v1/token?grant_type=password')){
   assert.equal(options.headers.apikey,env.SUPABASE_PUBLISHABLE_KEY);
   const data=JSON.parse(options.body);
   assert.equal(data.email,'owner-for-test@example.test');
   assert.equal(data.password,'test_password_not_real');
   assert.deepEqual(data.gotrue_meta_security,{captcha_token:'one-time-test-token'});
   return new Response(JSON.stringify({access_token:'mock-token',user:{id:uuid,email:data.email}}),{status:200});
  }
  throw Error('Unexpected request '+u);
 };
 try{
  const req=new Request('https://mommabees-website.pages.dev/api/auth/login',{method:'POST',
   headers:{'content-type':'application/json'},
   body:JSON.stringify({identifier:'MommaBee',password:'test_password_not_real',captcha_token:'one-time-test-token'})});
  const res=await protectedLogin({request:req,env});
  assert.equal(res.status,200);
  assert.equal((await res.json()).user.id,uuid);
  assert.equal(calls.length,2);
  assert.equal(calls.filter(c=>c.url.includes('/token?grant_type=password')).length,1);
  assert.ok(calls.every(c=>!c.url.includes('siteverify')),'Do not redeem single-use CAPTCHA before Supabase');
 }finally{globalThis.fetch=former;}
});
test('unknown username and incorrect password return identical non-enumerating failures',async()=>{
 const old=globalThis.fetch,env={SUPABASE_URL:'https://ryqcfojzdncrshinlpue.supabase.co',
  SUPABASE_SECRET_KEY:'sb_secret_test_only',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_only'};
 const uuid='11111111-1111-4111-8111-111111111111';
 let usernameExists=false;
 globalThis.fetch=async(url,options={})=>{
  const u=String(url);
  if(u.includes('/rest/v1/rpc/bakery_login_email'))
   return new Response(JSON.stringify(usernameExists?'private@example.test':null),{status:200});
  if(u.includes('/auth/v1/token?grant_type=password')){
   const auth=JSON.parse(options.body);
   assert.equal(auth.gotrue_meta_security.captcha_token,'fake-captcha');
   return new Response(JSON.stringify({error:'invalid_grant',msg:'Invalid login credentials'}),{status:400});
  }
  throw Error('Unexpected external request');
 };
 try{
  const req=()=>new Request('https://mommabees-website.pages.dev/api/auth/login',{method:'POST',
   body:JSON.stringify({identifier:'sample_user',password:'WrongNotRealPassword',captcha_token:'fake-captcha'})});
  let a=await protectedLogin({request:req(),env});
  usernameExists=true;
  let b=await protectedLogin({request:req(),env});
  assert.equal(a.status,400);assert.equal(b.status,400);
  assert.deepEqual(await a.json(),await b.json());
  assert.doesNotMatch(JSON.stringify(await (await protectedLogin({request:req(),env})).json()),/private@example/);
 }finally{globalThis.fetch=old;}
});
test('username sign-in with no CAPTCHA is stopped before privileged username lookup',async()=>{
 const previous=globalThis.fetch;
 let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('Should never call provider');};
 try{
  const req=new Request('https://mommabees-website.pages.dev/api/auth/login',{method:'POST',
   body:JSON.stringify({identifier:'MommaBee',password:'test-password',captcha_token:''})});
  const res=await protectedLogin({request:req,env:{}});
  assert.equal(res.status,400);
  assert.match((await res.json()).error,/Human verification/);
  assert.equal(calls,0);
 }finally{globalThis.fetch=previous;}
});

test('country-home stylesheet is loaded after established controls and is syntactically balanced',()=>{
 const html=read('site/index.html'),css=read('site/country-home-v2.css');
 assert.match(html,/<link rel="stylesheet" href="\/country-home-v2\.css"\/>/);
 assert.ok(html.indexOf('href="/styles.css"')<html.indexOf('href="/country-home-v2.css"'));
 assert.ok(css.length>14000);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
 assert.match(css,/--bakery-page:/);
 assert.match(css,/\.country-welcome-band/);
 assert.match(css,/\.bakery-home-note/);
 assert.match(css,/\.footer-inner/);
 assert.match(css,/\.page-crumbs/);
 assert.match(css,/@media\(max-width:850px\)/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media\(max-width:530px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/:focus-visible/);
});
test('whole-site rustic design covers actual storefront and member and staff pages',()=>{
 const css=read('site/country-home-v2.css');
 for(const route of ['home','shop','ready','preorder','product','cart','checkout','account','gallery','contact','faq','admin']){
  const unique=route==='shop'||route==='ready'||route==='preorder'?'shop-page--'+(route==='shop'?'all':route):'data-page="'+route+'"';
  assert.ok(css.includes(unique)||css.includes('page="'+route+'"')||route==='home'&&css.includes('.hero'),route+' must have dedicated presentation');
 }
 for(const selector of ['#bakery-login','#checkout-form','#pickup-calendar','.past-bakes-gallery','.admin-layout','.table-wrap','.footer-qr','.bakery-menu-grid'])
  assert.ok(css.includes(selector),'missing styling for '+selector);
});
test('new home, footer, cart and contact provide personality without inventing bakery fulfillment',()=>{
 const app=read('site/app.js'),auth=read('site/account.js'),checkout=read('site/checkout-form.js');
 assert.doesNotMatch(app,/A little note from our kitchen/);
 assert.doesNotMatch(app,/Good baking is worth looking forward to/);
 assert.doesNotMatch(app,/Some treats are ready when they/);
 assert.match(app,/class="footer-inner"/);
 assert.doesNotMatch(app,/Rooted in Faith\. Made with Love\. Shared with Joy\./);
 assert.match(app,/header-offerings/);
 assert.match(app,/body\.dataset\.page=routeName/);
 assert.match(app,/aria-label="Breadcrumb"/);
 assert.match(app,/setAttribute\('aria-current','page'\)/);
 assert.match(app,/Past Bakes Gallery/);
 assert.match(app,/Your Cart/);
 assert.match(app,/Contact Momma Bee/);
 assert.match(auth,/Bakery Account/);
 assert.match(auth,/login\.elements\.identifier\.value/);
 assert.match(checkout,/Full contact and address details are required/);
 assert.match(checkout,/Choose Your Pickup Day/);
 assert.doesNotMatch(app,/Missouri Prairie Roots|From Our Country Kitchen to Your Table/);
 assert.doesNotMatch(app,/From Nixa, with care|Something sweet for your table|<div class="country-welcome-band"/);
});

test('sitewide account menu is signed-in only with profile, settings and sign-out controls',()=>{
 assert.equal(accountNavigationMarkup(false),'<a href="#account" class="nav-account-signin">Sign In</a>');
 const menu=accountNavigationMarkup(true);
 assert.match(menu,/class="account-dropdown"/);
 assert.match(menu,/aria-haspopup="true"/);
 assert.match(menu,/aria-expanded="false"/);
 assert.match(menu,/aria-controls="account-dropdown-panel"/);
 assert.match(menu,/data-account-panel hidden/);
 assert.match(menu,/href="#account">Account Overview/);
 assert.match(menu,/href="#account\/profile">Profile/);
 assert.match(menu,/href="#account\/settings">Settings/);
 assert.match(menu,/data-nav-signout>Sign Out/);
 assert.ok(ACCOUNT_MENU_OPEN_MS>=100&&ACCOUNT_MENU_OPEN_MS<=250);
 assert.ok(ACCOUNT_MENU_CLOSE_MS>=250&&ACCOUNT_MENU_CLOSE_MS<=600);
 assert.ok(ACCOUNT_MENU_OPEN_MS<ACCOUNT_MENU_CLOSE_MS);
});
test('navbar sign-out works on every page, clears cached staff data, and uses established Supabase logout',()=>{
 const app=read('site/app.js');
 const api=read('site/api.js');
 const menu=read('site/account-navigation.js');
 assert.match(app,/accountNavigationMarkup\(Boolean\(currentUser\(\)\)\)/);
 assert.match(app,/bindAccountNavigation\(\{onSignOut:async\(\)=>/);
 assert.match(app,/await signOut\(\);/);
 assert.match(app,/verifiedBackOfficeRole=null;\s*all\.demoItems=\[\];\s*await load\(\)/);
 assert.match(api,/export async function signOut\(\)/);
 assert.match(api,/saveSession\(null\);/);
 assert.match(menu,/ACCOUNT_MENU_CLOSE_MS=350/);
 assert.match(menu,/clearTimeout\(openTimer\)/);
 assert.match(menu,/document\.addEventListener\('pointerdown',onDocPointer\)/);
 assert.match(menu,/event\.key==='Escape'/);
 assert.match(menu,/previousCleanup\?\.\(\)/);
 assert.match(menu,/signingOut=true/);
 assert.match(menu,/signOutButton\.disabled=true/);
});
test('dropdown links address real, accessible customer profile and settings sections',()=>{
 const app=read('site/app.js');
 const account=read('site/account.js');
 const css=read('site/country-home-v2.css');
 assert.match(app,/else if\(route==='account'\)await account\(pid\)/);
 assert.match(app,/id==='profile'\?'account-profile-section':'account-settings'/);
 assert.match(account,/id="account-profile-section"/);
 assert.match(account,/id="account-settings"/);
 assert.match(account,/id="edit-profile">Edit Profile/);
 assert.match(account,/Locked after registration/);
 assert.match(css,/#primary-navigation \.account-dropdown-trigger/);
 assert.match(css,/#primary-navigation \.account-dropdown-panel\[hidden\]/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/scroll-margin-top:/);
});

test('homepage QR PNG is a real downloadable first-party image, not a canvas conversion',()=>{
 const qrCode=read('site/qr-code.js');
 const markup=qrMarkup();
 assert.equal(QR_PNG_PATH,'/assets/MommaBeeFarmstandAndBakery-Homepage-QR.png');
 assert.match(markup,/href="\/assets\/MommaBeeFarmstandAndBakery-Homepage-QR\.png"/);
 assert.match(markup,/download="MommaBeeFarmstandAndBakery-Homepage-QR\.png"/);
 assert.match(markup,/data-qr-download="png"/);
 assert.match(qrCode,/button\[data-qr-download="svg"\]/);
 assert.match(qrCode,/a\[data-qr-download="png"\]/);
 assert.doesNotMatch(qrCode,/new Image\(|\.drawImage\(|\.toBlob\(|\.toDataURL\(/);
 assert.doesNotMatch(qrCode,/Download unavailable: '\+err\.message/);
 const filename='site'+QR_PNG_PATH;
 assert.ok(existsSync(path.join(root,filename)),filename+' must be committed');
 const data=readFileSync(path.join(root,filename));
 assert.ok(data.length>900);
 assert.deepEqual([...data.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 assert.equal(data.toString('ascii',12,16),'IHDR');
 assert.equal(data.readUInt32BE(16),900);
 assert.equal(data.readUInt32BE(20),900);
});

test('public storefront copy, metadata and background controls omit regional locality wording',()=>{
 const publicFiles=['site/index.html','site/background.js','site/background-admin.js','site/checkout-form.js'];
 assert.match(read('site/app.js'),/Located in Nixa, Missouri/);
 for(const file of publicFiles){
  const source=read(file);
  assert.doesNotMatch(source,/\\b(?:Nixa|Missouri)\\b/i,file+' includes unwanted location copy');
 }
 const settings=read('site/background-admin.js');
 assert.match(settings,/Restore Watercolor Chickens/);
 const metadata=read('site/index.html');
 assert.match(metadata,/MommaBee Bakery&Farmstand \| Baking, Gifts &amp; More/);
 assert.doesNotMatch(metadata,/Handmade in|homemade baking in/);
 const checkout=read('site/checkout-form.js');
 assert.match(checkout,/autocomplete="address-level1" placeholder="State" required/);
 assert.doesNotMatch(checkout,/autocomplete="address-level1" value="MO"/);
 const migration=read('supabase/migrations/20261026_remove_public_location_terms.sql');
 assert.match(migration,/COTTAGE-FOOD SALES ELIGIBILITY/);
 assert.match(migration,/food-sale and location restrictions/);
});

test('approved full business name is consistent on every customer-facing screen',()=>{
 const brand='MommaBee Bakery&Farmstand';
 const files=['site/app.js','site/index.html','site/account.js','site/admin.js',
   'site/qr-code.js','site/background-admin.js','site/photo-library.js',
   'site/message-center.js','functions/api/checkout.js'];
 for(const filename of files){
  const content=read(filename);
  assert.doesNotMatch(content,/Mommy Bee|Mamma Bee/i,filename+' contains an outdated brand spelling');
 }
 assert.match(read('site/app.js'),/MommaBee Bakery&Farmstand/);
 assert.match(read('site/index.html'),/MommaBee Bakery&Farmstand/);
 assert.match(read('site/qr-code.js'),/MommaBeeFarmstandAndBakery-Homepage-QR/);
 const png=readFileSync(path.join(root,'site/assets/MommaBeeFarmstandAndBakery-Homepage-QR.png'));
 assert.ok(png.length>900);
 assert.equal(png.toString('ascii',12,16),'IHDR');
 assert.ok(brand.length>12);
});

test('owner branding, originals and watercolor background are published without changing checkout',()=>{
 const app=read('site/app.js'),css=read('site/country-home-v2.css');
 const metadata=read('site/index.html'),bg=read('site/background.js');
 assert.match(app,/isShopAll\?'/);
 assert.match(app,/\/assets\/branding\/mommabee-shop-logo\.webp/);
 assert.match(app,/Located in Nixa, Missouri/);
 assert.match(app,/Decorated Cakes, Cake Pops, & Cookies/);
 assert.match(app,/Custom engraved cutting boards/);
 assert.match(app,/Natural homemade products/);
 assert.match(metadata,/MommaBee Bakery&Farmstand/);
 assert.match(metadata,/content="#C07C57"/);
 assert.match(css,/--mommabee-header:#C07C57/);
 assert.match(css,/--mommabee-footer:#948D87/);
 assert.match(css,/data-site-background="chickens"/);
 assert.match(bg,/value:'chickens'/);
 const migration=read('supabase/migrations/20261027_brand_chicken_background.sql');
 assert.match(migration,/background_style='chickens'/);
 for(const img of ['site/assets/branding/mommabee-shop-logo.webp','site/assets/branding/chicken-watercolor-background.webp']){
  const bytes=readFileSync(path.join(root,img));
  assert.ok(bytes.length>5000);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
});

test('admin category options use referenced row primary keys, never undefined foreign-key columns',()=>{
 const admin=read('site/admin.js');
 assert.equal(referenceKeyFor('categories'),'id');
 assert.equal(referenceKeyFor('subcategories'),'id');
 assert.equal(referenceKeyFor('products'),'id');
 assert.equal(referenceKeyFor('baking_days'),'date');
 assert.match(admin,/const rowKey=referenceKeyFor\(f\.table\)/);
 assert.match(admin,/const refValue=x\[rowKey\]/);
 assert.doesNotMatch(admin,/x\[f\.key\|\|'id'\]/);
 assert.match(admin,/String\(value\)===String\(refValue\)/);
 assert.match(admin,/\['categories','subcategories','catalog_varieties'\]\.includes\(f\.table\)/);
});

test('header offerings replace the previous pledge without duplicating footer catalog',()=>{
 const app=read('site/app.js');
 const css=read('site/country-home-v2.css');
 const admin=read('site/admin.js');
 const html=read('site/index.html');
 assert.match(app,/const HEADER_OFFERINGS='Decorated Cakes, Cake Pops, & Cookies/);
 assert.match(app,/Handmade crocheted&sewn items/);
 assert.match(app,/Natural homemade products - bug spray, sunscreen, lip balm, soaps & more/);
 assert.match(app,/class="header-offerings"/);
 assert.doesNotMatch(app,/class="footer-offerings"/);
 assert.doesNotMatch(app,/class="footer-pledge"/);
 assert.match(app,/Located in Nixa, Missouri/);
 assert.match(css,/\.header-offerings/);
 assert.match(admin,/field\('brand_subtitle','Header products & services line','textarea'\)/);
 assert.match(html,/MommaBee Bakery&Farmstand/);
 const migration=read('supabase/migrations/20261027_header_offerings_categories_v116.sql');
 for(const term of ["'Handmade'","'Signs/Decor'","'Seasonal'"]){
  assert.ok(migration.includes(term),term+' missing from catalog migration');
 }
 assert.match(migration,/on conflict \(slug\) do nothing/);
});

test('Admin v1.17: footer text removal, clear scheduling labels, full-width settings and safe empty references',()=>{
 const app=read('site/app.js'),admin=read('site/admin.js'),css=read('site/country-home-v2.css');
 assert.doesNotMatch(app,/Small-batch baking and sweet traditions, made with care/);
 assert.doesNotMatch(app,/Pickup and local delivery are offered on selected bakery dates/);
 assert.match(app,/Located in Nixa, Missouri/);
 assert.match(admin,/field\('cutoff_at','Order cutoff \(Central Time\)'/);
 assert.doesNotMatch(admin,/local browser time/);
 assert.match(admin,/function siteSettingsSummary\(/);
 assert.match(admin,/admin-settings-copy/);
 assert.match(admin,/admin-boolean-toggle/);
 assert.match(admin,/admin-reference-warning/);
 assert.match(admin,/No products have been created/);
 assert.match(admin,/f\.table==='baking_days'/);
 assert.match(admin,/\|\|f\.table==='baking_days'/);
 assert.match(admin,/No alerts have been recorded yet/);
 for(const cls of ['.admin-boolean-toggle','.admin-settings-copy','.admin-reference-warning','.admin-empty-state']){
  assert.ok(css.includes(cls),'Missing stylesheet selector '+cls);
 }
});

test('Admin scheduling uses Nixa Central Time, not the browser timezone or UTC wall clock',()=>{
 assert.equal(centralInputFromIso('2026-10-27T22:00:00.000Z'),'2026-10-27T17:00');
 assert.equal(isoFromCentralInput('2026-10-27T17:00'),'2026-10-27T22:00:00.000Z');
 assert.equal(isoFromCentralInput('2026-12-01T17:00'),'2026-12-01T23:00:00.000Z');
 assert.throws(()=>isoFromCentralInput('2026-03-08T02:30'),/does not exist/);
 assert.throws(()=>isoFromCentralInput('2026-11-01T01:30'),/occurs twice/);
});


test('Owner-approved MommaBee product taxonomy preserves existing families and restricts regulated natural offerings',()=>{
 const sql=read('supabase/migrations/20261027_owner_offerings_taxonomy_v118.sql');
 for(const slug of [
  "'cake-pops'","'candies'","'natural-homemade-products'",
  "'decorated-cakes'","'decorated-cookies'",
  "'crocheted-items'","'sewn-items'","'custom-engraved-cutting-boards'",
  "'bug-spray'","'sunscreen'","'lip-balm'","'soaps'"
 ]){
  assert.ok(sql.includes(slug),'Missing catalog slug '+slug);
 }
 assert.match(sql,/join public\.categories c on c\.slug=r\.category_slug/);
 assert.match(sql,/on conflict \(category_id,slug\) do nothing/);
 assert.match(sql,/on conflict \(slug\) do nothing/);
 assert.match(sql,/'Natural Homemade Products',[\s\S]*?130,false/);
 for(const restricted of ['Bug Spray','Sunscreen','Lip Balm','Soaps']){
  assert.match(sql,new RegExp("'"+restricted+"'[^\\n]*false"));
 }
 assert.doesNotMatch(sql,/insert into public\.products/i,'Catalog taxonomy must not create fictional sellable products');
});

test('catalog RLS hardening drops overly permissive active-account write policies',()=>{
 const sql=read('supabase/migrations/20261027_catalog_permission_hardening_v118.sql');
 for(const table of ['categories','subcategories','products']){
  assert.match(sql,new RegExp('drop policy if exists "active account only" on public\\.'+table+';'));
 }
 assert.doesNotMatch(sql,/drop policy.*staff manage/i);
 assert.doesNotMatch(sql,/drop policy.*public categories/i);
 assert.doesNotMatch(sql,/drop policy.*public products/i);
});

test('Owner requested footer links use exactly two rows and account tagline is absent',()=>{
 const app=read('site/app.js'),account=read('site/account.js'),css=read('site/country-home-v2.css');
 const nav=app.slice(app.indexOf('aria-label="Footer navigation"'),app.indexOf('class="footer-qr"'));
 assert.equal((nav.match(/class="footer-nav-row"/g)||[]).length,2);
 const rows=nav.split('class="footer-nav-row"').slice(1);
 assert.deepEqual([...rows[0].matchAll(/href="#([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(x=>[x[1],x[2]]),
  [['shop','Shop All'],['ready','Ready to Sell'],['preorder','Preorder']]);
 assert.deepEqual([...rows[1].matchAll(/href="#([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(x=>[x[1],x[2]]),
  [['gallery','Past Bakes'],['contact','Ask Momma Bee'],['faq','Questions & Policies']]);
 assert.match(css,/\.footer-nav-row>a:not\(:last-child\)::after/);
 assert.doesNotMatch(account,/A place for your bakery favorites/);
 assert.match(account,/My Bakery Account/);
});

test('Product type is derived from category and non-food products cannot be published',()=>{
 const sql=read('supabase/migrations/20261027_product_type_gates_v119.sql');
 const admin=read('site/admin.js');
 assert.deepEqual(PRODUCT_TYPES,['food','handmade','regulated']);
 for(const slug of ['cakes','cake-pops','candies','cookies','breads']){
  assert.equal(productTypeForCategory(slug),'food');
 }
 assert.equal(productTypeForCategory('handmade'),'handmade');
 assert.equal(productTypeForCategory('signs-decor'),'handmade');
 assert.equal(productTypeForCategory('natural-homemade-products'),'regulated');
 assert.equal(productTypeForCategory('seasonal'),null);
 assert.equal(productTypeForCategory('new-future-category'),'unclassified');
 assert.match(nonfoodHoldMessage('handmade'),/draft-only/);
 assert.match(nonfoodHoldMessage('regulated'),/compliance review/);
 assert.match(sql,/add column if not exists product_type text not null default 'food'/);
 assert.match(sql,/products_nonfood_unpublished_check/);
 assert.match(sql,/not published or product_type='food'/);
 assert.match(sql,/enforce_product_type_gate/);
 assert.match(sql,/category_slug='natural-homemade-products'/);
 assert.match(admin,/field\('product_type','Product type','select'/);
 assert.match(admin,/productTypeForCategory\(cat\?\.slug\)/);
 assert.match(admin,/publication\.disabled=!isFood/);
 assert.match(admin,/body\.published=false;body\.featured=false/);
 assert.match(admin,/if\(body\.published && !reviewed\)/);
 assert.match(admin,/body\.allergen_reviewed=reviewed/);
});

test('Non-food drafts can be classified under inactive subcategories without exposing them publicly',()=>{
 const sql=read('supabase/migrations/20261027_product_type_gates_v119.sql');
 assert.match(sql,/create or replace function private\.check_product_subcategory\(\)/);
 assert.match(sql,/s\.active or not new\.published/);
 assert.match(sql,/Published products require an active matching subcategory/);
});

test('managed carousel keeps the original hero, accepts owner slides and is accessible',()=>{
 const sql=read('supabase/migrations/20261027_home_carousel_admin_v120.sql');
 const app=read('site/app.js'),admin=read('site/admin.js'),styles=read('site/country-home-v2.css');
 const slides=[{id:'a',published:true,sort_order:20,eyebrow:'Test',title:'Original Bakery Creation',description:'Owner photo',image_url:'https://example.test/storage/v1/object/public/carousel-photos/test.jpg',image_alt:'Bakery creation',primary_label:'Shop now',primary_href:'#shop',secondary_label:'Ask us',secondary_href:'#contact'},
 {id:'b',published:false,sort_order:10,title:'Private draft',image_url:'https://example.test/image.jpg'}];
 assert.equal(eligibleHomeSlides(slides).length,1);
 const markup=homeCarouselMarkup([slides[0]],x=>String(x).replaceAll('&','&amp;'),x=>x);
 assert.match(markup,/aria-roledescription="carousel"/);
 assert.match(markup,/alt="Bakery creation"/);
 assert.match(markup,/href="#shop"/);
 assert.doesNotMatch(markup,/home-carousel-controls/);
 const second={...slides[0],id:'c',sort_order:30,title:'Other true photograph'};
 const two=homeCarouselMarkup([slides[0],second],x=>x,x=>x);
 assert.match(two,/Previous featured slide/);assert.match(two,/Next featured slide/);
 assert.match(two,/aria-pressed="true"/);
 assert.match(app,/eligibleHomeSlides\(all\.carouselSlides\)/);
 assert.match(app,/bindHomeCarousel\(settings\.home_carousel_interval_seconds\)/);
 assert.match(app,/stopHomeCarousel\(\)/);
 assert.match(admin,/home_carousel_slides:\{label:'Homepage Carousel'/);
 assert.match(admin,/upload\('carousel-photos'/);
 assert.match(admin,/data-slide-up/);assert.match(admin,/data-slide-down/);
 assert.match(admin,/data-slide-delete/);
 assert.match(sql,/create table if not exists public\.home_carousel_slides/);
 assert.match(sql,/public active homepage slides/);
 assert.match(sql,/owner and admin manage homepage slides/);
 assert.match(sql,/public\.site_settings s where s\.id=1/);
 assert.match(sql,/home_carousel_enabled=true/);
 assert.match(styles,/prefers-reduced-motion/);
});
test('Admin Center organizes all panels into navigable role-aware groups',()=>{
 const admin=read('site/admin.js'),css=read('site/country-home-v2.css');
 const owner=adminGroupsForRole('owner'),moderator=adminGroupsForRole('moderator');
 assert.deepEqual(owner,ADMIN_GROUPS);
 assert.ok(owner.length>=6);
 assert.ok(owner.some(([name,ids])=>name==='Website & Design'&&ids.includes('home_carousel_slides')));
 assert.deepEqual(moderator,[['Customer Moderation',['messages','reviews']]]);
 assert.deepEqual(adminGroupsForRole('customer'),[]);
 const moduleIds=owner.flatMap(([,ids])=>ids);
 assert.equal(moduleIds.length,new Set(moduleIds).size);
 assert.match(admin,/id="admin-menu-search"/);
 assert.match(admin,/id="admin-jump"/);
 assert.match(admin,/admin-nav-group/);
 assert.match(admin,/visibleGroups\.some/);
 assert.match(css,/admin-content-toolbar/);
});
test('carousel Admin navigation/editor CRUD use the actual canonical Supabase table',()=>{
 const admin=read('site/admin.js');
 const nav=read('site/admin-navigation.js');
 const app=read('site/app.js');
 const migration=read('supabase/migrations/20261027_home_carousel_admin_v120.sql');
 assert.doesNotMatch(admin,/\bcarousel_slides\b/,'Do not use nonexistent public.carousel_slides in Admin requests');
 assert.doesNotMatch(nav,/\bcarousel_slides\b/,'Admin route identifier must match canonical database table');
 assert.match(admin,/home_carousel_slides:\{label:'Homepage Carousel'/);
 assert.match(admin,/selected==='home_carousel_slides'\)return carouselPanel\(\)/);
 assert.match(admin,/if\(selected==='home_carousel_slides'&&!record\)/);
 assert.match(admin,/if\(selected==='home_carousel_slides'\)\{/);
 assert.match(admin,/await Promise\.all\(\[loadTable\('home_carousel_slides'\),loadTable\('site_settings'\)\]\)/);
 assert.match(admin,/await update\('home_carousel_slides',a\.id/);
 assert.match(admin,/await update\('home_carousel_slides',slide\.id/);
 assert.match(admin,/await remove\('home_carousel_slides',slide\.id\)/);
 assert.match(admin,/await add\(selected,body\)/,'New slide insertion must use the canonical selected panel');
 assert.match(admin,/await update\(selected,record\[key\],body,key\)/,'Existing slide editing must use the canonical selected panel');
 assert.match(nav,/\['home_carousel_slides','store_display','website_size','website_background','site_settings'\]/);
 assert.match(migration,/create table if not exists public\.home_carousel_slides/);
 assert.match(app,/\['home_carousel_slides',\{order:'sort_order\.asc'\}\]/);
});

test('carousel drafts remain private and Admin explains activation of slideshow',()=>{
 const admin=read('site/admin.js'),app=read('site/app.js');
 assert.match(admin,/Automatic rotation requires at least two currently visible published slides/);
 assert.match(admin,/Private preview — includes drafts/);
 assert.match(admin,/previewSlides=rows\.map\(x=>\(\{\.\.\.x,published:true\}\)\)/);
 assert.match(admin,/previewDetails\.open\)bindHomeCarousel\(interval\)/);
 assert.match(app,/eligibleHomeSlides\(all\.carouselSlides\)/);
});
test('all website forms mark mandatory fields with * Required',()=>{
 const admin=read('site/admin.js'),app=read('site/app.js'),account=read('site/account.js'),checkout=read('site/checkout-form.js'),css=read('site/country-home-v2.css');
 assert.ok(Object.keys(ADMIN_REQUIRED).length>14);
 assert.equal(adminFieldIsRequired('home_carousel_slides','title'),true);
 assert.equal(adminFieldIsRequired('home_carousel_slides','image_url'),true);
 assert.equal(adminFieldIsRequired('home_carousel_slides','description'),false);
 assert.equal(adminFieldIsRequired('products','price_cents'),true);
 assert.equal(adminFieldIsRequired('baking_days','cutoff_at'),true);
 assert.equal(adminFieldIsRequired('baking_days','notes'),false);
 assert.match(admin,/mandatory=adminFieldIsRequired\(selected,f\.key\)/);
 assert.match(admin,/data-required-label="true"/);
 assert.match(admin,/verified\.required=productPublication\?\.checked===true/);
 assert.match(app,/bindRequiredMarkers\(\)/);
 assert.doesNotMatch(account,/required\?' \*'/);
 assert.match(checkout,/email\.required=!text\|\|!payRadio\.checked/);
 assert.match(css,/\.required-indicator/);
 assert.equal(typeof syncRequiredMarkers,'function');
 assert.equal(typeof bindRequiredMarkers,'function');
});

test('carousel interval setting is bounded and passed from persisted site settings to public and Admin renderers',()=>{
 assert.equal(DEFAULT_CAROUSEL_INTERVAL_SECONDS,6.5);
 assert.equal(carouselIntervalMilliseconds(6.5),6500);
 assert.equal(carouselIntervalMilliseconds(3),3000);
 assert.equal(carouselIntervalMilliseconds(10),10000);
 assert.equal(carouselIntervalMilliseconds(60),60000);
 for(const invalid of [null,0,2,100,'banana',Infinity]){
  assert.equal(carouselIntervalMilliseconds(invalid),6500);
 }
 const slider=read('site/home-carousel.js'),app=read('site/app.js'),admin=read('site/admin.js');
 const sql=read('supabase/migrations/20261027_carousel_interval_v123.sql');
 assert.match(slider,/setInterval\(tick,carouselIntervalMilliseconds\(intervalSeconds\)\)/);
 assert.match(app,/bindHomeCarousel\(settings\.home_carousel_interval_seconds\)/);
 assert.match(admin,/id="carousel-interval-form"/);
 assert.match(admin,/id="carousel-interval-seconds"/);
 assert.match(admin,/home_carousel_interval_seconds:seconds/);
 assert.match(admin,/previewDetails\.open\)bindHomeCarousel\(interval\)/);
 assert.match(admin,/Rotation requires two published slides/);
 assert.match(sql,/home_carousel_interval_seconds numeric\(4,1\) not null default 6\.5/);
 assert.match(sql,/between 3 and 60/);
});

test('returning to home from Admin fetches current carousel and timing instead of a stale SPA snapshot',()=>{
 const app=read('site/app.js');
 assert.match(app,/if\(route==='home'\|\|!route\)\{/);
 assert.match(app,/list\('home_carousel_slides',\{order:'sort_order\.asc',limit:500\}\)/);
 assert.match(app,/list\('site_settings',\{limit:1\}\)/);
 assert.match(app,/all\.carouselSlides=freshSlides/);
 assert.match(app,/all\.settings=rows\[0\]\|\|\{\}/);
 assert.match(app,/bindHomeCarousel\(settings\.home_carousel_interval_seconds\)/);
});


test('homepage carousel keeps an equal slide size while changing slides on desktop and mobile',()=>{
 const css=read('site/country-home-v2.css');
 const markup=read('site/home-carousel.js');
 const section=css.slice(css.indexOf('/* MBB-UI-034 v1.24'));
 assert.ok(section.length>900,'Carousel sizing styles are present');
 assert.match(section,/\.home-carousel \.home-carousel-slides\s*\{\s*height:clamp\(440px,34vw,570px\)/);
 assert.match(section,/\.home-carousel \.home-carousel-slide\.hero\s*\{/);
 assert.match(section,/height:100%;\s*min-height:0;\s*max-height:100%;/);
 assert.match(section,/grid-template-rows:minmax\(0,1fr\)/);
 assert.match(section,/overflow-y:auto/);
 assert.match(section,/\.home-carousel \.home-carousel-slide \.hero-art img\s*\{/);
 assert.match(section,/object-fit:cover/);
 assert.match(section,/@media\(max-width:850px\)/);
 assert.match(section,/height:clamp\(600px,110vw,730px\)/);
 assert.match(section,/grid-template-rows:clamp\(210px,34vw,280px\) minmax\(0,1fr\)/);
 assert.match(section,/\.admin-slide-preview \.home-carousel \.home-carousel-slides/);
 assert.match(markup,/home-carousel-slide/);
 assert.match(markup,/slide\.hidden=i!==index/);
});

test('carousel size presets use one shared frame and whitelist Admin-controlled values',()=>{
 assert.deepEqual(CAROUSEL_SIZE_OPTIONS,['extra-small','small','medium','large']);
 assert.equal(normalizeCarouselSize(undefined),'medium');
 assert.equal(normalizeCarouselSize('huge'),'medium');
 assert.equal(normalizeCarouselSize('large'),'large');
 const slide={id:'original',published:true,image_url:'https://example.test/test.webp',title:'Bakery'};
 for(const size of CAROUSEL_SIZE_OPTIONS){
  const markup=homeCarouselMarkup([slide],x=>x,x=>x,size);
  assert.match(markup,new RegExp('home-carousel--'+size));
 }
 assert.match(homeCarouselMarkup([slide],x=>x,x=>x,'<style>'),/home-carousel--medium/);
 const app=read('site/app.js'),admin=read('site/admin.js'),css=read('site/country-home-v2.css');
 const sql=read('supabase/migrations/20261027_carousel_size_v125.sql');
 assert.match(app,/homeCarouselMarkup\(slides,e,photo,s\.home_carousel_size\)/);
 assert.match(admin,/homeCarouselMarkup\(previewSlides,e,x=>e\(x\),size\)/);
 assert.match(admin,/id="carousel-size-form"/);
 assert.match(admin,/id="carousel-size"/);
 assert.match(admin,/update\('site_settings',1,\{home_carousel_size:chosen\}\)/);
 assert.match(admin,/refreshSizePreview\(\)/);
 assert.match(css,/--carousel-height/);
 assert.match(css,/\.home-carousel--extra-small/);
 assert.match(css,/\.home-carousel--small/);
 assert.match(css,/\.home-carousel--medium/);
 assert.match(css,/\.home-carousel--large/);
 assert.match(css,/height:var\(--carousel-height\)/);
 assert.match(css,/grid-template-rows:var\(--carousel-photo-height\) minmax\(0,1fr\)/);
 assert.match(sql,/home_carousel_size text not null default 'medium'/);
 assert.match(sql,/check \(home_carousel_size in \('extra-small','small','medium','large'\)\)/);
});


test('responsive carousel size presets scale typography, margins, actions and mobile text',()=>{
 const css=read('site/country-home-v2.css');
 const segment=css.slice(css.indexOf('/* MBB-UI-036 v1.26'));
 assert.ok(segment.length>3000);
 for(const size of ['extra-small','small','medium','large']){
  assert.ok(segment.includes('.home-carousel--'+size+'{'));
 }
 for(const field of ['--carousel-headline-size','--carousel-body-size','--carousel-eyebrow-size','--carousel-copy-padding','--carousel-cta-font','--carousel-cta-height'])
  assert.ok(segment.includes(field),'Missing '+field);
 assert.ok(segment.includes('font-size:var(--carousel-headline-size)'));
 assert.ok(segment.includes('font-size:var(--carousel-body-size)'));
 assert.ok(segment.includes('padding:var(--carousel-copy-padding)'));
 assert.ok(segment.includes('scrollbar-gutter:auto'));
 assert.ok(segment.includes('overflow-y:auto'));
 assert.ok(segment.includes('@media(max-width:850px)'));
 assert.ok(segment.includes('@media(max-width:450px)'));
});

test('redundant text removed without losing customer-facing commerce and safety details',()=>{
 const app=read('site/app.js'),account=read('site/account.js'),checkout=read('site/checkout-form.js'),admin=read('site/admin.js');
 for(const phrase of ['Faith · Family · Homemade Goodness','Good baking is worth looking forward to','Share the shop at your next gathering','A Peek Into Our Kitchen']){
  assert.ok(!app.includes(phrase),'redundant copy should not remain: '+phrase);
 }
 assert.doesNotMatch(app,/class="bakery-home-note"/);
 for(const phrase of ['Past creations — not currently for sale','Product availability is verified before payment','Cottage-food eligibility and food safety','food_notice','Final availability and pricing','Questions & Bakery Policies']){
  assert.ok(app.includes(phrase),'critical storefront information missing: '+phrase);
 }
 assert.match(account,/Guest checkout is available/);
 assert.match(checkout,/Full contact and address details are required/);
 assert.match(checkout,/Pay at pickup does not charge a card now/);
 assert.match(admin,/A product cannot be published until ingredients and the allergen review are completed/);
 assert.match(admin,/No products have been created/);
});

test('sitewide size is independent from carousel and applied on every page',()=>{
 assert.deepEqual(WEBSITE_SIZE_OPTIONS,['extra-small','small','medium','large']);
 assert.equal(DEFAULT_WEBSITE_SIZE,'medium');
 for(const value of WEBSITE_SIZE_OPTIONS){
  assert.equal(normalizeWebsiteSize(value),value);
  const target={dataset:{}};
  assert.equal(applyWebsiteSize(value,target),value);
  assert.equal(target.dataset.websiteSize,value);
 }
 const target={dataset:{}};
 assert.equal(applyWebsiteSize('unsafe-value',target),'medium');
 const app=read('site/app.js'),admin=read('site/admin.js'),nav=read('site/admin-navigation.js');
 assert.match(app,/applyWebsiteSize\(settings\.website_size\)/);
 assert.match(admin,/selected==='website_size'\)return websiteSizePanel\(\)/);
 assert.match(nav,/\['home_carousel_slides','store_display','website_size','website_background','site_settings'\]/);
 assert.match(admin,/website_size:value/);
 assert.match(admin,/await ctx\.load\(\)/);
 assert.match(admin,/Preview: /);
 assert.match(admin,/id="website-size-reset"/);
 assert.match(admin,/Website size <span class="required-indicator"/);
 assert.match(app,/homeCarouselMarkup\(slides,e,photo,s\.home_carousel_size\)/);
});
test('whole-site sizing changes layouts and text while preserving accessible controls and carousel size',()=>{
 const css=read('site/country-home-v2.css');
 const size=css.slice(css.indexOf('/* MBB-UI-037 v1.27'));
 const sql=read('supabase/migrations/20261027_website_size_v127.sql');
 for(const value of ['extra-small','small','medium','large'])assert.ok(size.includes('body[data-website-size="'+value+'"]'));
 for(const val of ['--website-font-scale','--website-density','--website-image-scale','--website-main-max','--website-shell-max'])assert.ok(size.includes(val));
 for(const selector of ['#main.shell','.navlinks a','.brand','.section','.card-content','.grid','.shop-hero-image','.past-bakes-gallery','.footer','.admin-workspace'])assert.ok(size.includes(selector));
 assert.ok(size.includes('min-height:max(44px'));
 assert.ok(size.includes('.home-carousel .home-carousel-slide h1'));
 assert.ok(size.includes('font-size:var(--carousel-headline-size)'));
 assert.ok(size.includes('height:var(--carousel-height)'));
 assert.ok(size.includes('@media(max-width:760px)'));
 assert.match(sql,/website_size text not null default 'medium'/);
 assert.match(sql,/check \(website_size in \('extra-small','small','medium','large'\)\)/);
 assert.match(sql,/drop policy if exists "active account only" on public\.site_settings/);
 assert.doesNotMatch(sql,/drop policy.*staff manage site_settings/);
});


import {STORE_DEPARTMENTS,normalizeDepartment,departmentForCategory,departmentLabel,effectiveDepartment,filterStoreProducts,taxonomyPaths,searchTaxonomyPaths} from '../site/store-departments.js';
import {homepageStorefronts} from '../site/store-departments.js';

test('Bakery and Homestand storefront filtering respects the Owner toggle and category truth',()=>{
 assert.deepEqual(STORE_DEPARTMENTS,['bakery','homestand']);
 assert.equal(normalizeDepartment('bad'),'bakery');
 assert.equal(departmentLabel('homestand'),'Homestand');
 const cats=[{id:'pies',name:'Pies',department:'bakery'},{id:'fruits',name:'Fruits',department:'homestand'}];
 const goods=[{id:'pie1',category_id:'pies',department:'bakery'},{id:'fruit1',category_id:'fruits',department:'homestand'}];
 assert.equal(effectiveDepartment({split_store_enabled:false},'homestand',null),null);
 assert.equal(effectiveDepartment({split_store_enabled:true},'homestand',null),'homestand');
 assert.equal(effectiveDepartment({split_store_enabled:true},'bakery',cats[1]),'homestand');
 assert.equal(departmentForCategory(cats[1]),'homestand');
 assert.deepEqual(filterStoreProducts(goods,{split_store_enabled:true},'bakery',cats).map(x=>x.id),['pie1']);
 assert.deepEqual(filterStoreProducts(goods,{split_store_enabled:true},'homestand',cats).map(x=>x.id),['fruit1']);
 assert.deepEqual(filterStoreProducts(goods,{split_store_enabled:false},'homestand',cats).map(x=>x.id),['pie1','fruit1']);
});
test('searchable taxonomy paths support owner examples without generating products',()=>{
 const cats=[{id:'pies',department:'bakery',name:'Pies'},{id:'breads',department:'bakery',name:'Breads'},{id:'cookies',department:'bakery',name:'Cookies'},{id:'veg',department:'homestand',name:'Vegetables'},{id:'fruit',department:'homestand',name:'Fruits'}];
 const subs=[{id:'creme',category_id:'pies',name:'Creme'},{id:'butter',category_id:'cookies',name:'Butter Cookies'},{id:'holiday',category_id:'cookies',name:'Holiday'}];
 const choices=[
 {id:'banana',category_id:'pies',subcategory_id:'creme',name:'Banana',active:true},
 {id:'cinnamon',category_id:'breads',subcategory_id:null,name:'Cinnamon Swirl',active:true},
 {id:'dream',category_id:'cookies',subcategory_id:'butter',name:'Dream Cookie (drömmar)',active:true},
 {id:'ginger',category_id:'cookies',subcategory_id:'holiday',name:'Ginger Bread',active:true},
 {id:'green',category_id:'veg',subcategory_id:null,name:'Green Beans',active:true},
 {id:'berries',category_id:'fruit',subcategory_id:null,name:'Blackberries',active:true}
 ];
 const paths=taxonomyPaths(cats,subs,choices);
 assert.equal(paths.length,6);
 for(const value of ['Bakery → Pies → Creme → Banana','Bakery → Breads → Cinnamon Swirl','Bakery → Cookies → Butter Cookies → Dream Cookie (drömmar)','Bakery → Cookies → Holiday → Ginger Bread','Homestand → Vegetables → Green Beans','Homestand → Fruits → Blackberries'])
  assert.ok(paths.some(x=>x.path===value),value);
 assert.equal(searchTaxonomyPaths(paths,'drömmar').length,1);
 assert.equal(searchTaxonomyPaths(paths,'homestand').length,2);
 assert.equal(searchTaxonomyPaths(paths,'green').length,1);
});
test('store routes have department tabs only in split mode, and Admin holds catalog search',()=>{
 const site=read('site/app.js'),admin=read('site/admin.js'),nav=read('site/admin-navigation.js'),css=read('site/country-home-v2.css'),types=read('site/product-types.js');
 const sql=read('supabase/migrations/20261027_split_store_taxonomy_v128.sql');
 assert.match(site,/split_store_enabled===true/);
 assert.match(site,/filterStoreProducts\(sellable\(\),all\.settings,department,all\.categories\)/);
 assert.match(site,/#shop\/bakery/);
 assert.match(site,/#shop\/homestand/);
 assert.match(site,/#ready\$\{departmentSuffix\}/);
 assert.match(site,/categoryChoices=categories\(department\)/);
 assert.match(site,/split\?'':demoStorePreview/);
 assert.match(admin,/selected==='store_display'\)return storeDisplayPanel\(\)/);
 assert.match(admin,/update\('site_settings',1,next\)/);
 assert.match(admin,/id="product-taxonomy-search"/);
 assert.match(admin,/searchTaxonomyPaths\(paths,query,20\)/);
 assert.match(admin,/field\('variety_id','Variety'/);
 assert.match(admin,/body\.department!==departmentForCategory\(cat\)/);
 assert.match(nav,/catalog_varieties/);
 assert.match(nav,/store_display/);
 assert.match(types,/'fruits','vegetables'/);
 assert.match(sql,/create table if not exists public\.catalog_varieties/);
 assert.match(sql,/split_store_enabled boolean not null default false/);
 assert.match(sql,/create trigger validate_catalog_department/);
 assert.match(sql,/Product department must match category department/);
 assert.match(css,/\.shop-department-tabs/);
});


import {testStripeKeyAllowed,safeStripePicture,stripeFingerprint,testStripePriceLookup,MOMMABEES_STRIPE_TEST_ACCOUNT} from '../functions/_lib/product-stripe-test.js';
test('Stripe TEST integration is isolated to MommaBees sandbox and restricts key modes',()=>{
 assert.equal(MOMMABEES_STRIPE_TEST_ACCOUNT,'acct_1UUtoDJF02bajTTM');
 assert.equal(testStripeKeyAllowed('sk_test_example123'),true);
 assert.equal(testStripeKeyAllowed('rk_test_example123'),true);
 for(const key of ['sk_live_abc','rk_live_abc','','mytest','sk_test_'])assert.equal(testStripeKeyAllowed(key),false);
 const env={SUPABASE_URL:'https://ryqcfojzdncrshinlpue.supabase.co'};
 const allowed='https://ryqcfojzdncrshinlpue.supabase.co/storage/v1/object/public/product-photos/abc.webp';
 assert.equal(safeStripePicture(env,allowed),allowed);
 assert.equal(safeStripePicture(env,'https://untrusted.com/abc.webp'),null);
 assert.equal(safeStripePicture(env,'javascript:alert(1)'),null);
 const product={id:'b13aa82d-0000-4000-8000-01abcdef0000',name:'Real test name',price_cents:550,unit:'each',published:false};
 assert.match(testStripePriceLookup(product),/^mbee_b13aa82d00004000800001abcdef0000_550$/);
 assert.notEqual(stripeFingerprint(product),stripeFingerprint({...product,price_cents:600}));
 assert.notEqual(stripeFingerprint(product),stripeFingerprint({...product,published:true}));
});
test('saving product synchronizes Stripe TEST through authenticated Cloudflare API, with retry',()=>{
 const admin=read('site/admin.js'),source=read('functions/api/admin/product-sync.js');
 const migration=read('supabase/migrations/20261027_product_stripe_test_sync_v129.sql');
 const shared=read('functions/_lib/product-stripe-test.js');
 assert.match(admin,/productStripeRequest\('POST',saved\.id\)/);
 assert.match(admin,/productStripeRequest\('GET'\)/);
 assert.match(admin,/data-sync-product/);
 assert.match(admin,/Product saved in Supabase and available to Cloudflare/);
 assert.match(source,/requireBakeryManager\(env,request\)/);
 assert.match(source,/verifyMommaBeesTestAccount\(env\)/);
 assert.match(source,/stripeProduct=current\?\.stripe_product_id/);
 assert.match(source,/products\/search\?/);
 assert.match(source,/lookup_keys\[0\]/);
 assert.match(source,/price-create-/);
 assert.match(source,/synced_fingerprint/);
 assert.match(source,/status:'pending'/);
 assert.match(source,/status:'error'/);
 assert.match(shared,/MOMMABEES_STRIPE_TEST_ACCOUNT/);
 assert.match(shared,/sk_test_/);
 assert.match(shared,/rk_test_/);
 assert.match(migration,/create table if not exists public\.product_stripe_test_sync/);
 assert.match(migration,/enable row level security/);
 assert.match(migration,/revoke all on public\.product_stripe_test_sync from public,anon,authenticated/);
 assert.doesNotMatch(source,/LIVE_PAYMENT_ALLOWED\s*=\s*'yes'/);
});


test('Split Store homepage showcases respect independent visibility and available products',()=>{
 const categories=[{id:'cake',name:'Cakes',department:'bakery'},{id:'vegs',name:'Vegetables',department:'homestand'}];
 const products=[
  {id:'a',name:'A Cake',category_id:'cake',featured:false},
  {id:'b',name:'B Cake',category_id:'cake',featured:true},
  {id:'v',name:'Green Beans',category_id:'vegs',featured:true}
 ];
 assert.deepEqual(homepageStorefronts({split_store_enabled:false},products,categories),[]);
 const both=homepageStorefronts({split_store_enabled:true},products,categories);
 assert.deepEqual(both.map(x=>x.department),['bakery','homestand']);
 assert.deepEqual(both[0].products.map(x=>x.id),['b','a']);
 assert.deepEqual(both[1].products.map(x=>x.id),['v']);
 assert.equal(both[1].href,'#shop/homestand');
 assert.deepEqual(homepageStorefronts({split_store_enabled:true,home_bakery_visible:false},products,categories).map(x=>x.department),['homestand']);
 assert.deepEqual(homepageStorefronts({split_store_enabled:true,home_homestand_visible:false},products,categories).map(x=>x.department),['bakery']);
 assert.deepEqual(homepageStorefronts({split_store_enabled:true,home_homestand_visible:false,home_bakery_visible:false},products,categories),[]);
 assert.deepEqual(homepageStorefronts({split_store_enabled:true},[],categories).map(x=>x.products.length),[0,0]);
 assert.equal(homepageStorefronts({split_store_enabled:true},products,categories,1)[0].products.length,1);
});
test('homepage departments use real sellable cards, mobile stacking and staff-only visibility controls',()=>{
 const app=read('site/app.js'),admin=read('site/admin.js'),css=read('site/country-home-v2.css');
 const migration=read('supabase/migrations/20261027_home_department_visibility_v130.sql');
 assert.match(app,/homepageStorefronts\(s,currentProducts,all\.categories,4\)/);
 assert.match(app,/const currentProducts=sellable\(\)/);
 assert.match(app,/home-departments-grid/);
 assert.match(app,/home-department--/);
 assert.match(app,/view\.products\.map\(card\)/);
 assert.match(app,/split\?departmentPanels:combinedCategories/);
 assert.match(app,/split\?'':combinedFeatured/);
 assert.match(admin,/id="home-bakery-visible"/);
 assert.match(admin,/id="home-homestand-visible"/);
 assert.match(admin,/home_bakery_visible:\$\('#home-bakery-visible'\)\.checked/);
 assert.match(admin,/home_homestand_visible:\$\('#home-homestand-visible'\)\.checked/);
 assert.match(admin,/update\('site_settings',1,next\)/);
 assert.match(css,/\.home-departments-grid/);
 assert.match(css,/@media\(max-width:750px\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(migration,/home_bakery_visible boolean not null default true/);
 assert.match(migration,/home_homestand_visible boolean not null default true/);
});


import {showcaseItemsFor,showcaseIcon,SHOWCASE_ICONS} from '../site/store-showcase.js';
test('six specified showcase entries are grouped and ordered by department',()=>{
 const products=[
 {slug:'banana-creme-pie',name:'Banana Creme Pie',department:'bakery',active:true,sort_order:10},
 {slug:'cinnamon-swirl-bread',name:'Cinnamon Swirl Bread',department:'bakery',active:true,sort_order:20},
 {slug:'dream-cookie-drommar',name:'Dream Cookie (drömmar)',department:'bakery',active:true,sort_order:30},
 {slug:'ginger-bread',name:'Ginger Bread',department:'bakery',active:true,sort_order:40},
 {slug:'green-beans',name:'Green Beans',department:'homestand',active:true,sort_order:10},
 {slug:'blackberries',name:'Blackberries',department:'homestand',active:true,sort_order:20}
 ];
 assert.deepEqual(showcaseItemsFor(products,'bakery').map(x=>x.slug),['banana-creme-pie','cinnamon-swirl-bread','dream-cookie-drommar','ginger-bread']);
 assert.deepEqual(showcaseItemsFor(products,'homestand').map(x=>x.slug),['green-beans','blackberries']);
 assert.deepEqual(showcaseItemsFor(products,'bakery',null,null,2).map(x=>x.slug),['banana-creme-pie','cinnamon-swirl-bread']);
 assert.equal(showcaseIcon(products[4]),SHOWCASE_ICONS['green-beans']);
 assert.deepEqual(showcaseItemsFor(products,'invalid'),[]);
});
test('owner catalog showcases render in split home and department Shop All without checkout fields',()=>{
 const app=read('site/app.js'),admin=read('site/admin.js'),css=read('site/country-home-v2.css');
 const sql=read('supabase/migrations/20261027_store_showcase_items_v131.sql');
 assert.match(app,/\['store_showcase_items',\{order:'sort_order\.asc'\}\]/);
 assert.match(app,/t==='store_showcase_items'\?'showcaseItems'/);
 assert.match(app,/showcaseItemsFor\(all\.showcaseItems,view\.department/);
 assert.match(app,/showcaseItemsFor\(all\.showcaseItems,department\|\|'bakery'/);
 assert.match(app,/\.map\(showcaseCard\)/);
 const component=app.slice(app.indexOf('const showcaseCard=item=>'),app.indexOf('const categories='));
 assert.doesNotMatch(component,/price_cents|Add to Cart|not for sale|Not available/i);
 assert.match(admin,/store_showcase_items:\{label:'Store Showcase Items'/);
 assert.match(css,/\.showcase-illustration--homestand/);
 assert.match(sql,/create table if not exists public\.store_showcase_items/);
 assert.match(sql,/create policy "owner admin manage store showcase items"/);
 assert.match(sql,/references public\.catalog_varieties/);
 assert.doesNotMatch(sql,/insert into public\.products/);
});
