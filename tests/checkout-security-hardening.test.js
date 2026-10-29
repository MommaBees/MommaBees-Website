import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkoutAdmission} from '../functions/_lib/checkout-admission.js';
import {onRequestPost as checkout} from '../functions/api/checkout.js';
import {onRequestPost as payAtPickup} from '../functions/api/pay-at-pickup.js';
import {onRequestPost as contact} from '../functions/api/contact.js';
import {onRequestPost as deliverPromotion} from '../functions/api/admin/deliver-promotion.js';
const domain='https://mommabees-website.pages.dev';
const env={SITE_URL:domain,SUPABASE_URL:'https://dummy.supabase.co',SUPABASE_SECRET_KEY:'server-only-dummy',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',STRIPE_SECRET_KEY:['sk','test','synthetic'].join('_'),
 STRIPE_AUTOMATIC_TAX_ENABLED:'yes'};
const json=x=>new Response(JSON.stringify(x),{status:200,headers:{'content-type':'application/json'}});
const payload=(path,data,headers={})=>new Request(domain+path,{method:'POST',headers:{
 'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.8',...headers},body:JSON.stringify(data)});
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Checkout admission hashes source IP and denies the 7th guest attempt',async()=>{
 const previous=globalThis.fetch,calls=[],status={n:0};
 globalThis.fetch=async(url,options={})=>{
  assert.ok(String(url).includes('/rpc/mommabees_checkout_admit'));
  const body=JSON.parse(options.body);calls.push(body);
  status.n++;
  return json({allowed:status.n<=6,attempts:status.n,retry_after:333});
 };
 try{
  for(let n=0;n<7;n++){
   const blocked=await checkoutAdmission(env,payload('/api/checkout',{}),{guest:true});
   if(n<6)assert.equal(blocked,null);
   else{assert.equal(blocked.status,429);assert.equal(blocked.headers.get('retry-after'),'333');}
  }
  assert.equal(new Set(calls.map(x=>x.p_key_hash)).size,1);
  assert.match(calls[0].p_key_hash,/^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(calls).includes('192.0.2.8'));
  assert.ok(calls.every(x=>x.p_limit===6&&x.p_window_seconds===900));
 }finally{globalThis.fetch=previous;}
});
test('Guest online checkout requires human verification before inventory reservation',async()=>{
 const original=globalThis.fetch,urls=[];
 globalThis.fetch=async(url)=>{
  urls.push(String(url));
  if(String(url).includes('/rpc/mommabees_checkout_admit'))return json({allowed:true});
  throw Error('Should not reserve or call Stripe before CAPTCHA');
 };
 try{
  const response=await checkout({request:payload('/api/checkout',{items:[],captcha_token:''}),env});
  assert.equal(response.status,403);
  assert.equal(urls.filter(x=>x.includes('reserve_checkout')).length,0);
  assert.equal(urls.filter(x=>x.includes('api.stripe.com')).length,0);
 }finally{globalThis.fetch=original;}
});
test('Rate limit blocks pickup reservations without redeeming a CAPTCHA',async()=>{
 const previous=globalThis.fetch,calls=[];
 globalThis.fetch=async(url)=>{
  calls.push(String(url));
  if(String(url).includes('/rpc/mommabees_checkout_admit'))return json({allowed:false,retry_after:120});
  throw Error('Pickup should fail early');
 };
 try{
  const result=await payAtPickup({request:payload('/api/pay-at-pickup',{items:[],captcha_token:''}),env});
  assert.equal(result.status,429);
  assert.equal(calls.length,1);
 }finally{globalThis.fetch=previous;}
});
test('Guest contact uses active Vault Turnstile secret and rejects wrong hostname',async()=>{
 const original=globalThis.fetch,urls=[],secret='0xSYNTHETICNOTREAL';
 globalThis.fetch=async(url,options={})=>{
  const target=String(url);urls.push(target);
  if(target.includes('/rpc/mommabees_credential_read'))return json(secret);
  if(target.includes('/siteverify')){
   assert.ok(options.body.get('secret')===secret);
   return json({success:true,hostname:'attacker.example'});
  }
  throw Error('Unexpected request to '+target);
 };
 try{
  const result=await contact({request:payload('/api/contact',{turnstile_token:'synthetic',
   email:'buyer@example.test',kind:'question',subject:'Question',body:'How can I order?' }),env});
  assert.equal(result.status,403);
  assert.ok(urls.some(x=>x.includes('credential_read')));
  assert.equal(urls.some(x=>x.includes('/rest/v1/messages')),false);
 }finally{globalThis.fetch=original;}
});
test('Promotion dispatch cannot be invoked without a current staff session',async()=>{
 const r=await deliverPromotion({request:payload('/api/admin/deliver-promotion',{promotion_id:'11111111-1111-4111-8111-111111111111'},
  {Origin:domain}),env});
 assert.equal(r.status,401);
 const source=read('site/admin.js');
 assert.match(source,/\/api\/admin\/deliver-promotion/);
 assert.doesNotMatch(source,/rpc\('deliver_promotion'/);
 const sql=read('supabase/migrations/20261029_promotion_privilege_hardening_v154.sql');
 assert.match(sql,/revoke all on function public\.deliver_promotion\(uuid\) from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.mommabees_deliver_promotion_admin/);
});
test('Database admission and performance migrations are reversible by design and do not expose source IPs',()=>{
 const gate=read('supabase/migrations/20261029_checkout_admission_security_v153.sql');
 assert.match(gate,/on conflict\(key_hash\) do update/);
 assert.match(gate,/grant execute on function public\.mommabees_checkout_admit/);
 assert.match(gate,/to service_role/);
 assert.doesNotMatch(gate,/inet\b|remote_addr\b/i);
 const idx=read('supabase/migrations/20261029_fk_performance_indexes_v155.sql');
 assert.equal((idx.match(/create index if not exists/g)||[]).length,36);
 const client=read('site/checkout-form.js');
 assert.match(client,/captcha_token:payload\.captcha_token/);
});
