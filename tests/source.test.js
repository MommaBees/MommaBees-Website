import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHmac} from 'node:crypto';
import {verifyStripeSignature} from '../functions/_lib/stripe.js';
import {onRequestPost as checkout} from '../functions/api/checkout.js';
import {onRequestPost as contact} from '../functions/api/contact.js';
import {onRequestPost as orderStatus} from '../functions/api/order-status.js';
import {onRequestPost as protectedLogin} from '../functions/api/auth/login.js';
import {onRequestPost as protectedRegistration} from '../functions/api/auth/register.js';
import {onRequestGet as listUsers,onRequestPost as manageUser} from '../functions/api/admin/users.js';
import {onRequestPost as moderateRequest} from '../functions/api/admin/moderate.js';
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
