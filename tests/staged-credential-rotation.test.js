import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dependenciesFor,verifyStripeKey,promoteWithReadback} from '../functions/_lib/credential-rotation.js';
import {onRequestPost as webhook} from '../functions/api/stripe-webhook.js';
const env={SUPABASE_URL:'https://placeholder.supabase.co',SUPABASE_SECRET_KEY:'placeholder_service_key',
 SUPABASE_PUBLISHABLE_KEY:'placeholder_publishable',SITE_URL:'https://mommabees-website.pages.dev'};
const testKey=['sk','test','syntheticplaceholder123456789'].join('_');
const secret=['whsec','syntheticwebhook123456789'].join('_');
const id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const reply=x=>new Response(JSON.stringify(x),{headers:{'content-type':'application/json'}});
test('dependency manifest distinguishes provider actions and required real deliveries',()=>{
 assert.ok(dependenciesFor('STRIPE_SECRET_KEY','live').some(x=>x.name==='checkout_session'&&x.state==='provider_action'));
 assert.ok(dependenciesFor('STRIPE_WEBHOOK_SECRET','test').some(x=>x.name==='stripe_signed_delivery'&&x.state==='pending'));
 assert.ok(dependenciesFor('TURNSTILE_SECRET_KEY','shared').some(x=>x.name==='site_key_and_auth'&&x.state==='provider_action'));
});
test('Stripe preflight validates ownership and product API with no charges',async()=>{
 const previous=globalThis.fetch,requests=[];
 globalThis.fetch=async(url,options={})=>{
  requests.push({url:String(url),method:options.method});
  if(String(url).endsWith('/v1/account'))return reply({id:'acct_1UWAEICv9zp633CV'});
  if(String(url).endsWith('/v1/products?limit=1'))return reply({data:[]});
  throw Error('Unexpected fetch');
 };
 try{
  const verified=await verifyStripeKey(testKey,'test');
  assert.equal(verified.ok,true);
  assert.equal(requests.length,2);
  assert.ok(requests.every(x=>x.method==='GET'));
 }finally{globalThis.fetch=previous;}
});
test('Active readback failure restores prior Vault value; never reports success',async()=>{
 const prev=globalThis.fetch,calls=[];
 globalThis.fetch=async(url)=>{
  calls.push(String(url));
  if(String(url).includes('credential_promote'))return reply({state:'activated'});
  if(String(url).includes('credential_read'))return reply('not-a-match');
  if(String(url).includes('credential_revert'))return reply({state:'rolled_back'});
  throw Error('Unexpected fetch');
 };
 try{
  const value=await promoteWithReadback(env,id,'STRIPE_SECRET_KEY','test',testKey,[]);
  assert.equal(value.state,'rolled_back');
  assert.ok(calls.some(x=>x.includes('credential_revert')));
 }finally{globalThis.fetch=prev;}
});
test('Automatic rotation OFF by default: signed webhook proves candidate but awaits manual activation',async()=>{
 const previous=globalThis.fetch,calls=[],ts=Math.floor(Date.now()/1000);
 const raw=JSON.stringify({id:'evt_rot_proof',livemode:false,type:'rotation.unhandled',data:{object:{}}});
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ts+'.'+raw)));
 const hex=[...digest].map(n=>n.toString(16).padStart(2,'0')).join('');
 globalThis.fetch=async(url)=>{
  calls.push(String(url));
  if(String(url).includes('credential_pending'))return reply({id,secret});
  if(String(url).includes('mommabees_rotation_control'))return reply({enabled:false});
  if(String(url).includes('credential_mark_proven'))return reply({state:'pending',proof_verified:true});
  if(String(url).includes('credential_promote'))return reply({state:'activated'});
  if(String(url).includes('credential_read'))return reply(secret);
  throw Error('Unexpected network access');
 };
 try{
  const req=new Request('https://mommabees-website.pages.dev/api/stripe-webhook',{method:'POST',headers:{'Stripe-Signature':'t='+ts+',v1='+hex},body:raw});
  const result=await webhook({request:req,env});
  assert.equal(result.status,503);
  assert.ok(calls.some(x=>x.includes('credential_mark_proven')));
  assert.equal(calls.some(x=>x.includes('credential_promote')),false);
 }finally{globalThis.fetch=previous;}
});
test('No user role can call Vault rotation functions; Owner UI shows pending dependencies',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261029_staged_credential_rotation_v151.sql',import.meta.url),'utf8');
 for(const name of ['stage','pending','promote','revert','reject','history']){
  assert.ok(sql.includes('revoke all on function public.mommabees_credential_'+name));
  assert.ok(sql.includes('grant execute on function public.mommabees_credential_'+name));
 }
 const ui=readFileSync(new URL('../site/credential-management.js',import.meta.url),'utf8');
 assert.match(ui,/credential-rotation-history/);
 assert.match(ui,/owner-turnstile-proof/);
 assert.match(ui,/proof_token/);
});

test('Owner rotation setting defaults OFF and manual key update remains available',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261029_owner_rotation_switch_v152.sql',import.meta.url),'utf8');
 assert.match(sql,/automatic_activation_enabled boolean not null default false/);
 assert.match(sql,/values\(true,false\) on conflict/);
 assert.match(sql,/revoke all on function public\.mommabees_rotation_control/);
 const api=readFileSync(new URL('../functions/api/admin/rotation-settings.js',import.meta.url),'utf8');
 assert.match(api,/confirmOwnerPassword/);
 assert.match(api,/typeof data\.enabled!=='boolean'/);
 const editor=readFileSync(new URL('../site/credential-management.js',import.meta.url),'utf8');
 assert.match(editor,/id="owner-auto-rotation"/);
 assert.match(editor,/id="owner-save-rotation"/);
 assert.match(editor,/manual(?:ly)? replace/);
});
