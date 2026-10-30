import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet as liveGet,onRequestPost as livePost} from '../functions/api/admin/live-selling.js';
import {onRequestPost as mediaDelete} from '../functions/api/admin/media-cleanup.js';
import {onRequestGet as publicPhotos} from '../functions/api/review-photos.js';

const env={
 SUPABASE_URL:'https://mommabees-test.supabase.co',
 SUPABASE_SECRET_KEY:'sb_secret_mock',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 SITE_URL:'https://mommabees-website.pages.dev',
 STRIPE_SECRET_KEY:'sk_test_mock',
 LIVE_PAYMENT_ALLOWED:'no',
 STRIPE_AUTOMATIC_TAX_ENABLED:'no'
};
const uuid='00000000-0000-4000-8000-000000000001';
const uploadName='11111111-1111-4111-8111-111111111111.jpg';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const bearer={Authorization:'Bearer bakery-test-access-token',Origin:'https://mommabees-website.pages.dev','Content-Type':'application/json'};

test('LIVE control refuses anonymous access',async()=>{
 const res=await liveGet({request:new Request(env.SITE_URL+'/api/admin/live-selling'),env});
 assert.equal(res.status,401);
});

test('LIVE activation is rejected when the real payment gates, products and calendar are not ready',async()=>{
 const saved=globalThis.fetch;
 let sawMutation=false;
 globalThis.fetch=async(input,init={})=>{
  const u=new URL(input.toString());
  if(u.pathname==='/auth/v1/user')return json({id:uuid,email:'owner@example.test'});
  if(u.pathname==='/rest/v1/staff_roles')return json([{role:'owner'}]);
  if(u.pathname==='/rest/v1/customer_profiles')return json([{banned_at:null}]);
  if(u.pathname==='/rest/v1/site_settings'){
   if(init.method==='PATCH'){sawMutation=true;return json([{checkout_enabled:true}]);}
   return json([{id:1,stripe_payment_mode:'test',checkout_enabled:false,pickup_enabled:true,delivery_enabled:true}]);
  }
  if(u.pathname.startsWith('/rest/v1/rpc/mommabees_credential_read'))return json(null);
  if(u.pathname.startsWith('/rest/v1/'))return json([]);
  throw Error('Unexpected test network request '+u.pathname);
 };
 try{
  const req=new Request(env.SITE_URL+'/api/admin/live-selling',{method:'POST',headers:bearer,body:JSON.stringify({enabled:true,confirm:'ENABLE LIVE SALES'})});
  const response=await livePost({request:req,env});
  assert.equal(response.status,409);
  const payload=await response.json();
  assert.match(payload.error,/cannot be enabled/);
  assert.equal(sawMutation,false);
 }finally{globalThis.fetch=saved;}
});

test('Unused-media removal rejects anonymous callers before any storage access',async()=>{
 const req=new Request(env.SITE_URL+'/api/admin/media-cleanup',{method:'POST',headers:{Origin:env.SITE_URL},body:JSON.stringify({bucket:'product-photos',name:uploadName,confirm:'DELETE UNUSED PHOTO'})});
 const res=await mediaDelete({request:req,env});
 assert.equal(res.status,401);
});

test('Referenced upload cannot be deleted even when the actor is management',async()=>{
 const saved=globalThis.fetch;
 let attemptedStorageDelete=false;
 globalThis.fetch=async(input,init={})=>{
  const u=new URL(input.toString());
  if(u.pathname==='/auth/v1/user')return json({id:uuid,email:'admin@example.test'});
  if(u.pathname==='/rest/v1/staff_roles')return json([{role:'admin'}]);
  if(u.pathname==='/rest/v1/customer_profiles')return json([{banned_at:null}]);
  if(u.pathname==='/rest/v1/products')return json([{photo_url:env.SUPABASE_URL+'/storage/v1/object/public/product-photos/'+uploadName}]);
  if(u.pathname.startsWith('/rest/v1/'))return json([]);
  if(u.pathname.startsWith('/storage/')&&init.method==='DELETE')attemptedStorageDelete=true;
  throw Error('Unexpected test network request '+u.pathname);
 };
 try{
  const req=new Request(env.SITE_URL+'/api/admin/media-cleanup',{method:'POST',headers:bearer,body:JSON.stringify({bucket:'product-photos',name:uploadName,confirm:'DELETE UNUSED PHOTO'})});
  const response=await mediaDelete({request:req,env});
  assert.equal(response.status,409);
  assert.equal(attemptedStorageDelete,false);
 }finally{globalThis.fetch=saved;}
});

test('Unapproved parent review never exposes signed customer photographs',async()=>{
 const saved=globalThis.fetch;
 let signedRequested=false;
 globalThis.fetch=async(input,init={})=>{
  const u=new URL(input.toString());
  if(u.pathname.startsWith('/rest/v1/reviews'))return json([{id:uuid,approved:false}]);
  if(u.pathname.includes('/storage/'))signedRequested=true;
  throw Error('Unexpected test network request '+u.pathname);
 };
 try{
  const response=await publicPhotos({request:new Request(env.SITE_URL+'/api/review-photos?review_id='+uuid),env});
  assert.equal(response.status,200);
  assert.deepEqual((await response.json()).photos,[]);
  assert.equal(signedRequested,false);
 }finally{globalThis.fetch=saved;}
});
