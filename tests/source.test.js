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
 const request=new Request('https://mommabees-website.pages.dev/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'example@example.test',password:'NotARealPassword123',first_name:'Test',last_name:'User',username:'tester123',address_line1:'address',city:'Nixa',state:'MO',country:'US',postal_code:'65714',billing_same:true,captcha_token:''})});
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
    city:'Nixa',state:'MO',country:'US',postal_code:'65714',billing_same:true,
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
 assert.match(site,/demoStorePreview\(\)/);
 assert.match(site,/TEST ONLY/);
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
 assert.match(sql,/r\.payment_status/);
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
