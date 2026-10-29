import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {onRequestPost as checkout} from '../functions/api/checkout.js';
import {onRequestPost as webhook} from '../functions/api/stripe-webhook.js';
import {onRequestPost as cancelPickup} from '../functions/api/admin/cancel-pickup.js';
import {onRequestPost as collectPickup} from '../functions/api/admin/collect-pickup.js';
import {onRequestPost as track} from '../functions/api/order-status.js';
import {onRequestPost as recover} from '../functions/api/auth/recover.js';
const base='https://mommabees-website.pages.dev';
const orderId='44444444-4444-4444-8444-444444444444';
const userId='55555555-5555-4555-8555-555555555555';
const syntheticStripeKey=['sk','test','fixture_DO_NOT_USE_abc'].join('_');
const syntheticWebhookSecret=['whsec','fixture_DO_NOT_USE_abc'].join('_');
const env={SITE_URL:base,SUPABASE_URL:'https://fixture.invalid.supabase.co',
 SUPABASE_SECRET_KEY:'sb_secret_notreal_fixture',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_notreal_fixture',
 STRIPE_SECRET_KEY:syntheticStripeKey,STRIPE_WEBHOOK_SECRET:syntheticWebhookSecret,
 STRIPE_AUTOMATIC_TAX_ENABLED:'yes',STRIPE_PAYMENT_MODE:'test',TURNSTILE_SECRET_KEY:'0xFIXTURE_NOT_REAL'};
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const req=(path,body,headers={})=>new Request(base+path,{method:'POST',headers:{'content-type':'application/json',
 'CF-Connecting-IP':'198.51.100.41',...headers},body:JSON.stringify(body)});
const cart={items:[{product_id:'66666666-6666-4666-8666-666666666666',mode:'preorder',batch_id:null,quantity:2}],
 date:'2026-11-02',window:'13:00-14:00',method:'pickup',
 name:'Fixture Customer',first_name:'Fixture',last_name:'Customer',
 email:'fixture@example.test',phone:'5550100000',contact_channel:'email',
 captcha_token:'fixture-challenge-requires-provider-verification',
 guest_address:{street:'Test street',city:'Nixa',state:'MO',zip:'65714'},
 policy_acceptance:{accepted:true,version:'2026-10-29-v3',method:'pickup'}};
const fixtureFetch=({failStripe=false,invalidProof=false}={})=>{
 const calls=[];
 const fetch=async(url,options={})=>{
  const target=String(url);calls.push({url:target,method:options.method||'GET',body:options.body});
  if(target.includes('/rest/v1/rpc/mommabees_checkout_admit'))return response({allowed:true});
  if(target.includes('/rest/v1/rpc/mommabees_credential_read'))return response(null);
  if(target.includes('/turnstile/v0/siteverify'))return response({success:!invalidProof,hostname:'mommabees-website.pages.dev'});
  if(target.includes('/rest/v1/rpc/reserve_checkout'))return response({order_id:orderId,amount_cents:1750});
  if(target.includes('/rest/v1/orders?id=eq.'))return response([]);
  if(target.includes('/rest/v1/rpc/release_checkout'))return response({released:true});
  if(target==='https://api.stripe.com/v1/checkout/sessions')return failStripe?response({error:{message:'Fixture failure'}},400):
   response({id:'cs_test_fixture',url:'https://checkout.stripe.com/test-fixture-link'});
  throw Error('Unexpected fixture network request '+target);
 };
 return {calls,fetch};
};
test('End-to-end mocked guest checkout validates CAPTCHA, reserves server price, and creates TEST Stripe session only',async()=>{
 const old=globalThis.fetch,fixture=fixtureFetch();globalThis.fetch=fixture.fetch;
 try{
  const out=await checkout({request:req('/api/checkout',cart),env});
  assert.equal(out.status,200);
  const body=await out.json();
  assert.equal(body.checkout_url,'https://checkout.stripe.com/test-fixture-link');
  assert.equal(body.order_id,orderId);
  assert.match(body.guest_token,/^[a-f0-9]{64}$/);
  const paths=fixture.calls.map(x=>x.url);
  assert.ok(paths.some(x=>x.includes('/turnstile/v0/siteverify')));
  assert.ok(paths.some(x=>x.includes('mommabees_checkout_admit')));
  assert.ok(paths.some(x=>x.includes('/rpc/reserve_checkout')));
  const stripe=fixture.calls.find(x=>x.url==='https://api.stripe.com/v1/checkout/sessions');
  assert.ok(stripe);
  assert.equal(stripe.method,'POST');
  const params=new URLSearchParams(stripe.body);
  assert.equal(params.get('line_items[0][price_data][unit_amount]'),'1750');
  assert.equal(params.get('automatic_tax[enabled]'),'true');
  assert.equal(params.get('metadata[terms_version]'),'2026-10-29-v3');
  assert.equal(stripe.body.includes('sk_live'),false);
  assert.equal(paths.some(x=>x.includes('/refunds')),false);
 }finally{globalThis.fetch=old;}
});
test('Stripe session creation failure releases reserved inventory, does not record payment',async()=>{
 const old=globalThis.fetch,fixture=fixtureFetch({failStripe:true});globalThis.fetch=fixture.fetch;
 try{
  const out=await checkout({request:req('/api/checkout',cart),env});
  assert.notEqual(out.status,200);
  assert.ok(fixture.calls.some(x=>x.url.includes('/rpc/release_checkout')));
  assert.equal(fixture.calls.some(x=>x.url.includes('/rpc/complete_checkout')),false);
 }finally{globalThis.fetch=old;}
});
test('Invalid human challenge cannot reserve inventory',async()=>{
 const old=globalThis.fetch,fixture=fixtureFetch({invalidProof:true});globalThis.fetch=fixture.fetch;
 try{
  const out=await checkout({request:req('/api/checkout',cart),env});
  assert.equal(out.status,403);
  assert.equal(fixture.calls.some(x=>x.url.includes('/rpc/reserve_checkout')),false);
 }finally{globalThis.fetch=old;}
});
test('Signed TEST webhook confirms only the matching reserved order, without invoking a real provider',async()=>{
 const raw=JSON.stringify({id:'evt_test_fixture',livemode:false,type:'checkout.session.completed',
  data:{object:{id:'cs_test_fixture',livemode:false,payment_status:'paid',currency:'usd',
   amount_total:1750,total_details:{amount_tax:0},metadata:{order_id:orderId}}}});
 const ts=Math.floor(Date.now()/1000);
 const sig=createHmac('sha256',syntheticWebhookSecret).update(ts+'.'+raw).digest('hex');
 const previous=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options={})=>{
  const target=String(url);calls.push({target,body:options.body});
  if(target.includes('/rpc/mommabees_credential_pending'))return response(null);
  if(target.includes('/rpc/mommabees_credential_read'))return response(null);
  if(target.includes('/rpc/complete_checkout'))return response({completed:true});
  throw Error('Unexpected '+target);
 };
 try{
  const request=new Request(base+'/api/stripe-webhook',{method:'POST',headers:{'stripe-signature':'t='+ts+',v1='+sig},body:raw});
  const result=await webhook({request,env});
  assert.equal(result.status,200);
  assert.equal((await result.json()).received,true);
  const complete=calls.find(x=>x.target.includes('/rpc/complete_checkout'));
  assert.ok(complete);
  const data=JSON.parse(complete.body);
  assert.equal(data.p_order_id,orderId);
  assert.equal(data.p_paid_total,1750);
  assert.equal(data.p_session_id,'cs_test_fixture');
 }finally{globalThis.fetch=previous;}
});
test('Webhook rejects forged signatures without touching order payments',async()=>{
 const previous=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options={})=>{
  const u=String(url);calls.push(u);
  if(u.includes('credential_pending')||u.includes('credential_read'))return response(null);
  throw Error('Invalid call '+u);
 };
 try{
  const event={livemode:false,type:'checkout.session.completed',data:{object:{metadata:{order_id:orderId}}}};
  const result=await webhook({request:new Request(base+'/api/stripe-webhook',{
   method:'POST',headers:{'stripe-signature':'t='+Math.floor(Date.now()/1000)+',v1='+('0'.repeat(64))},
   body:JSON.stringify(event)}),env});
  assert.equal(result.status,400);
  assert.equal(calls.some(x=>x.includes('complete_checkout')),false);
 }finally{globalThis.fetch=previous;}
});
test('Pickup cancellation and cash collection require authorized manager sessions and explicit confirmation',async()=>{
 assert.equal((await cancelPickup({request:req('/api/admin/cancel-pickup',{order_id:orderId,reason:'Fixture reversal',confirm_cancel:true}),env})).status,401);
 assert.equal((await collectPickup({request:req('/api/admin/collect-pickup',{order_id:orderId,collected_via:'cash',confirm_collected:true}),env})).status,401);
 const previous=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options={})=>{
  const target=String(url);calls.push(target);
  if(target.includes('/auth/v1/user'))return response({id:userId,email:'owner@example.test'});
  if(target.includes('/rest/v1/staff_roles?'))return response([{role:'owner'}]);
  if(target.includes('/rest/v1/customer_profiles?'))return response([{banned_at:null}]);
  if(target.includes('/rpc/cancel_pickup_order'))return response({cancelled:true});
  if(target.includes('/rpc/confirm_pickup_payment'))return response({order_id:orderId,amount_paid_cents:1750});
  throw Error('Unexpected auth fixture '+target);
 };
 try{
  const head={Authorization:'Bearer valid-test-session'};
  const cancelled=await cancelPickup({request:req('/api/admin/cancel-pickup',{order_id:orderId,reason:'Fixture reversal',confirm_cancel:true},head),env});
  assert.equal(cancelled.status,200);
  const paid=await collectPickup({request:req('/api/admin/collect-pickup',{order_id:orderId,collected_via:'cash',confirm_collected:true},head),env});
  assert.equal(paid.status,200);
  assert.equal((await paid.json()).amount_paid_cents,1750);
  assert.ok(calls.some(u=>u.includes('cancel_pickup_order')));
  assert.ok(calls.some(u=>u.includes('confirm_pickup_payment')));
 }finally{globalThis.fetch=previous;}
});
test('Account recovery returns generic response, and tracking rejects invalid tokens without disclosure',async()=>{
 const invalid=await track({request:req('/api/order-status',{token:'short'}),env});
 assert.equal(invalid.status,400);
 const old=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options={})=>{calls.push({url:String(url),data:JSON.parse(options.body)});return response({});};
 try{
  const out=await recover({request:req('/api/auth/recover',{email:'nonexistent@example.test',captcha_token:'fixture-only-challenge'}),env});
  assert.equal(out.status,200);
  const body=await out.json();
  assert.match(body.message,/If an account uses this email address/);
  assert.equal(calls.length,1);
  assert.equal(calls[0].url.includes('/auth/v1/recover'),true);
  assert.equal(calls[0].data.gotrue_meta_security.captcha_token,'fixture-only-challenge');
 }finally{globalThis.fetch=old;}
});
