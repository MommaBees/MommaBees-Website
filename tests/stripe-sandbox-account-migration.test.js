import test from 'node:test';
import assert from 'node:assert/strict';
import {createStripeSession} from '../functions/_lib/stripe.js';
import {MOMMABEES_STRIPE_TEST_ACCOUNT} from '../functions/_lib/product-stripe-test.js';
import {TEST_PRICES} from '../functions/_lib/demo-prices.js';

const NEW_ACCOUNT='acct_1UWAEICv9zp633CV';
const LEGACY_ACCOUNT='acct_1UUtoDJF02bajTTM';
const env={
 SITE_URL:'https://mommabees-website.pages.dev',
 SUPABASE_URL:'https://fixture.invalid.supabase.co',
 SUPABASE_SECRET_KEY:'fixture_secret_not_real',
 SUPABASE_PUBLISHABLE_KEY:'fixture_publishable_not_real',
 STRIPE_PAYMENT_MODE:'test',
 STRIPE_SECRET_KEY:'sk_test_fixture_only_NOT_A_REAL_CREDENTIAL',
};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});

test('new sandbox catalog contains exactly six strictly TEST-bound fixed prices',()=>{
 assert.equal(MOMMABEES_STRIPE_TEST_ACCOUNT,NEW_ACCOUNT);
 const expected={
  'Chocolate Chip Cookies':2400,
  'Cinnamon Rolls':400,
  'Apple Pie':2400,
  'Carrot Cake':3500,
  'Classic Cheesecake':3800,
  'Brownie Box':1800,
 };
 assert.deepEqual(Object.fromEntries(Object.entries(TEST_PRICES).map(([n,p])=>[n,p.amount])),expected);
 for(const p of Object.values(TEST_PRICES)){
  assert.match(p.stripeProduct,/^prod_[A-Za-z0-9]+$/);
  assert.match(p.stripePrice,/^price_[A-Za-z0-9]+$/);
 }
});

test('wrong-account TEST key cannot create a Checkout Session',async()=>{
 const previous=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options={})=>{
  const target=String(url);calls.push({target,method:options.method||'GET'});
  if(target.includes('mommabees_credential_read'))return json(null);
  if(target==='https://api.stripe.com/v1/account')return json({id:LEGACY_ACCOUNT});
  throw Error('Unexpected request: '+target);
 };
 try{
  await assert.rejects(()=>createStripeSession(env,{mode:'payment'}),/account mismatch/i);
  assert.ok(calls.some(x=>x.target.endsWith('/v1/account')));
  assert.equal(calls.some(x=>x.target.endsWith('/v1/checkout/sessions')),false);
 }finally{globalThis.fetch=previous;}
});

test('correct-account synthetic TEST Checkout can reach session creation',async()=>{
 const previous=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options={})=>{
  const target=String(url);calls.push({target,method:options.method||'GET'});
  if(target.includes('mommabees_credential_read'))return json(null);
  if(target==='https://api.stripe.com/v1/account')return json({id:NEW_ACCOUNT});
  if(target==='https://api.stripe.com/v1/checkout/sessions')return json({id:'cs_test_synthetic',url:'https://example.invalid/test-checkout',livemode:false});
  throw Error('Unexpected request: '+target);
 };
 try{
  const result=await createStripeSession(env,{mode:'payment'});
  assert.equal(result.livemode,false);
  assert.ok(calls.some(x=>x.target.endsWith('/v1/account')));
  assert.ok(calls.some(x=>x.target.endsWith('/v1/checkout/sessions')&&x.method==='POST'));
 }finally{globalThis.fetch=previous;}
});

test('LIVE Checkout fails closed before Stripe API calls if the verified MommaBee LIVE account ID is absent',async()=>{
 const previous=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options={})=>{
  const target=String(url);calls.push(target);
  if(target.includes('mommabees_credential_read'))return json(null);
  throw Error('Unexpected network request '+target);
 };
 try{
  await assert.rejects(()=>createStripeSession({...env,STRIPE_SECRET_KEY:'sk_live_fixture_only_NOT_A_REAL_CREDENTIAL'},{mode:'payment'},{environment:'live'}),/LIVE account identity is not configured/);
  assert.equal(calls.some(x=>x.includes('api.stripe.com')),false);
 }finally{globalThis.fetch=previous;}
});
