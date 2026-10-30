import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet,onRequestPost} from '../functions/api/admin/live-selling.js';
import {storefrontStripeMode} from '../functions/_lib/stripe.js';
import {readFileSync} from 'node:fs';

const base='https://mommabees-website.pages.dev';
const ownerId='99999999-9999-4999-8999-999999999999';
const env={
 SITE_URL:base,SUPABASE_URL:'https://fixture.invalid.supabase.co',
 SUPABASE_SECRET_KEY:'sb_secret_FAKE_NOT_REAL',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_FAKE',
 LIVE_PAYMENT_ALLOWED:'no',STRIPE_AUTOMATIC_TAX_ENABLED:'no'
};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const request=(method='GET',body=null,headers={})=>new Request(base+'/api/admin/live-selling',{
 method,headers:{Authorization:'Bearer fake_owner_session',...(method==='POST'?{'Content-Type':'application/json',Origin:base}:{}),...headers},
 ...(method==='POST'?{body:JSON.stringify(body)}:{})
});
function mock({liveReady=false,role='owner',missingSettings=false}={}){
 const prior=globalThis.fetch,calls=[];
 const state={stripe_payment_mode:'test',checkout_enabled:false,pickup_enabled:true,delivery_enabled:true,id:1};
 const fakeEnv={...env,...(liveReady?{
  LIVE_PAYMENT_ALLOWED:'yes',STRIPE_AUTOMATIC_TAX_ENABLED:'yes',STRIPE_LIVE_ACCOUNT_ID:'acct_1MOMMABEELIVE'
 }:{})};
 globalThis.fetch=async(input,options={})=>{
  const url=new URL(String(input));calls.push({path:url.pathname+url.search,method:options.method||'GET',body:options.body});
  if(url.pathname==='/auth/v1/user')return json({id:ownerId,email:'owner@example.test'});
  if(url.pathname==='/rest/v1/staff_roles')return json([{role}]);
  if(url.pathname==='/rest/v1/customer_profiles')return json([{banned_at:null}]);
  if(url.pathname==='/rest/v1/site_settings'){
   if(options.method==='PATCH'){
    Object.assign(state,JSON.parse(options.body));return json([{...state}]);
   }
   return json(missingSettings?[]:[{...state}]);
  }
  if(url.pathname==='/rest/v1/products')return json(liveReady?[{id:'one'}]:[]);
  if(url.pathname==='/rest/v1/baking_days')return json(liveReady?[{date:'2026-11-01'}]:[]);
  if(url.pathname==='/rest/v1/stock_batches')return json(liveReady?[{id:'one'}]:[]);
  if(url.pathname==='/rest/v1/rpc/mommabees_credential_read'){
   const {p_name,p_environment}=JSON.parse(options.body);
   if(liveReady&&p_environment==='live'&&p_name==='STRIPE_SECRET_KEY')return json('sk_live_SYNTHETIC_DO_NOT_USE');
   if(liveReady&&p_environment==='live'&&p_name==='STRIPE_WEBHOOK_SECRET')return json('whsec_SYNTHETIC_DO_NOT_USE');
   return json(null);
  }
  if(url.href==='https://api.stripe.com/v1/account')return json({id:'acct_1MOMMABEELIVE'});
  if(url.pathname==='/rest/v1/account_admin_audit')return json([]);
  throw Error('Unmocked network '+url);
 };
 return {env:fakeEnv,state,calls,restore:()=>{globalThis.fetch=prior;}};
}

test('Stripe LIVE switch rejects anonymous access',async()=>{
 const out=await onRequestGet({env,request:new Request(base+'/api/admin/live-selling')});
 assert.equal(out.status,401);
});

test('non-Owner cannot access or change Stripe LIVE switch',async()=>{
 const x=mock({role:'admin'});
 try{
  assert.equal((await onRequestGet({env:x.env,request:request()})).status,403);
  assert.equal((await onRequestPost({env:x.env,request:request('POST',{enabled:true,confirm:'ENABLE LIVE SALES'})})).status,403);
  assert.equal(x.calls.filter(y=>y.method==='PATCH').length,0);
 }finally{x.restore();}
});

test('Owner dashboard reports persisted TEST mode, Cloudflare OFF and unmet release prerequisites',async()=>{
 const x=mock();
 try{
  const r=await onRequestGet({env:x.env,request:request()});
  assert.equal(r.status,200);
  const d=await r.json();
  assert.equal(d.mode,'test');
  assert.equal(d.enabled,false);
  assert.equal(d.emergencyGate,false);
  assert.equal(d.automaticTaxGate,false);
  assert.equal(d.ready,false);
  assert.ok(d.requirements.find(v=>v.id==='live_account_identity'&&!v.ok));
 }finally{x.restore();}
});

test('enabling LIVE is denied while Cloudflare kill/tax gates are OFF, without updating checkout',async()=>{
 const x=mock();
 try{
  const r=await onRequestPost({env:x.env,request:request('POST',{enabled:true,confirm:'ENABLE LIVE SALES'})});
  assert.equal(r.status,409);
  assert.equal(x.state.stripe_payment_mode,'test');
  assert.equal(x.state.checkout_enabled,false);
  assert.equal(x.calls.filter(y=>y.method==='PATCH').length,0);
 }finally{x.restore();}
});

test('Owner disabling LIVE always resets mode to TEST and disables checkout atomically',async()=>{
 const x=mock();
 x.state.stripe_payment_mode='live';
 x.state.checkout_enabled=true;
 try{
  const r=await onRequestPost({env:x.env,request:request('POST',{enabled:false})});
  assert.equal(r.status,200);
  const d=await r.json();
  assert.equal(d.mode,'test');
  assert.equal(d.checkoutEnabled,false);
  const patch=x.calls.filter(y=>y.method==='PATCH');
  assert.equal(patch.length,1);
  assert.deepEqual(JSON.parse(patch[0].body),{stripe_payment_mode:'test',checkout_enabled:false});
 }finally{x.restore();}
});

test('Owner may enable LIVE only when all synthetic prerequisites pass and typed confirmation supplied',async()=>{
 const x=mock({liveReady:true});
 try{
  const denied=await onRequestPost({env:x.env,request:request('POST',{enabled:true,confirm:'not confirmed'})});
  assert.equal(denied.status,400);
  assert.equal(x.state.stripe_payment_mode,'test');
  const accepted=await onRequestPost({env:x.env,request:request('POST',{enabled:true,confirm:'ENABLE LIVE SALES'})});
  assert.equal(accepted.status,200);
  assert.equal(x.state.stripe_payment_mode,'live');
  assert.equal(x.state.checkout_enabled,true);
  assert.equal((await accepted.json()).enabled,true);
  assert.equal(x.calls.filter(y=>y.method==='PATCH').length,1);
  assert.ok(x.calls.some(y=>y.path==='/v1/account'));
 }finally{x.restore();}
});

test('storefront mode read fails closed when no valid settings row exists',async()=>{
 const x=mock({missingSettings:true});
 try{await assert.rejects(()=>storefrontStripeMode(x.env),/not configured/);}
 finally{x.restore();}
});

test('Owner Stripe payment switch UI is present and describes independent Cloudflare gates',()=>{
 const ui=readFileSync(new URL('../site/live-selling-admin.js',import.meta.url),'utf8');
 assert.match(ui,/role="switch"/);
 assert.match(ui,/owner-live-toggle/);
 assert.match(ui,/Cloudflare LIVE_PAYMENT_ALLOWED/);
 assert.match(ui,/Enable LIVE Payments/);
});
