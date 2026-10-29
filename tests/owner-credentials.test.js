import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequestGet,onRequestPost} from '../functions/api/admin/credentials.js';
import {validCredentialSlot} from '../functions/_lib/runtime-credentials.js';
import {adminGroupsForRole} from '../site/admin-navigation.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const env={SITE_URL:'https://mommabees-website.pages.dev',SUPABASE_URL:'https://momma-test.supabase.co',
 SUPABASE_SECRET_KEY:'sb_secret_dummy_service',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_dummy',STRIPE_SECRET_KEY:'sk_test_legacy'};
const url='https://mommabees-website.pages.dev/api/admin/credentials';
const make=(body,headers={})=>new Request(url,{method:'POST',
 headers:{Origin:'https://mommabees-website.pages.dev',Authorization:'Bearer owner-session',
  'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
const fakeFetch=(role='owner',passwordOK=true)=>{
 const seen=[],user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const fn=async(requestUrl,options={})=>{
  const target=String(requestUrl);seen.push({url:target,options});
  let body,code=200;
  if(target.endsWith('/auth/v1/user'))body={id:user,email:'owner@example.com'};
  else if(target.includes('/rest/v1/staff_roles?'))body=[{role}];
  else if(target.includes('/rest/v1/customer_profiles?'))body=[{banned_at:null}];
  else if(target.includes('/rpc/mommabees_credential_status'))body=[];
  else if(target.includes('/auth/v1/token?grant_type=password')){
   if(passwordOK)body={user:{id:user,email:'owner@example.com'},access_token:'reauth'};
   else{body={error:'invalid'};code=400;}
  }else if(target==='https://api.stripe.com/v1/account')body={id:'acct_1UUtoDJF02bajTTM'};
  else if(target.includes('/rpc/mommabees_credential_save'))body={stored:true,name:'STRIPE_SECRET_KEY',environment:'test',changed_at:'2026-10-29T18:00:00Z'};
  else if(target.includes('/rest/v1/account_admin_audit'))body=[];
  else throw Error('Unexpected network request '+target);
  return new Response(JSON.stringify(body),{status:code,headers:{'content-type':'application/json'}});
 };
 return {seen,fn};
};
test('Owner-only navigation adds credential screen without exposing it to Admin or moderator',()=>{
 assert.deepEqual(adminGroupsForRole('owner').at(-1),['Security & Credentials',['owner_credentials']]);
 assert.equal(adminGroupsForRole('admin').some(([n])=>n==='Security & Credentials'),false);
 assert.equal(adminGroupsForRole('moderator').some(([,x])=>x.includes('owner_credentials')),false);
 assert.match(read('site/admin.js'),/ctx.role!=='owner'/);
 assert.match(read('site/credential-management.js'),/Confirm with your Owner account password/);
 assert.match(read('site/credential-management.js'),/Verify I’m Human/);
});
test('Server never returns secrets, allows supported slots only and refuses anonymous requests',async()=>{
 for(const [name,mode] of [['STRIPE_SECRET_KEY','test'],['STRIPE_SECRET_KEY','live'],['STRIPE_WEBHOOK_SECRET','test'],
 ['STRIPE_WEBHOOK_SECRET','live'],['TURNSTILE_SECRET_KEY','shared']])assert.equal(validCredentialSlot(name,mode),true);
 assert.equal(validCredentialSlot('SUPABASE_SECRET_KEY','live'),false);
 assert.equal(validCredentialSlot('GITHUB_TOKEN','live'),false);
 const unauth=await onRequestGet({request:new Request(url),env});
 assert.equal(unauth.status,401);
 const unauthWrite=await onRequestPost({request:make({name:'STRIPE_SECRET_KEY',environment:'test',value:'sk_test_notreal'} ,{Authorization:''}),env});
 assert.equal(unauthWrite.status,401);
 const sql=read('supabase/migrations/20261029_owner_credential_vault_v150.sql');
 assert.match(sql,/revoke all on function public\.mommabees_credential_read/);
 assert.match(sql,/grant execute on function public\.mommabees_credential_save.*to service_role/);
});
test('Admin user cannot read or write credentials regardless of matching password',async()=>{
 const original=globalThis.fetch,{fn,seen}=fakeFetch('admin');
 globalThis.fetch=fn;
 try{
  const request=new Request(url,{headers:{Authorization:'Bearer admin-session'}});
  assert.equal((await onRequestGet({request,env})).status,403);
  assert.equal((await onRequestPost({request:make({name:'STRIPE_SECRET_KEY',environment:'test',value:'sk_test_fake',owner_password:'pass-ok',captcha_token:'a'.repeat(80)}),env})).status,403);
  assert.equal(seen.some(x=>x.url.includes('/rpc/mommabees_credential_save')),false);
 }finally{globalThis.fetch=original;}
});
test('Owner password failure cannot write a Vault secret, and LIVE requires explicit confirmation',async()=>{
 const original=globalThis.fetch,{fn,seen}=fakeFetch('owner',false);
 globalThis.fetch=fn;
 try{
  const payload={name:'STRIPE_WEBHOOK_SECRET',environment:'test',value:'whsec_12345678901234567890',
   owner_password:'invalid-password',captcha_token:'c'.repeat(80)};
  assert.equal((await onRequestPost({request:make(payload),env})).status,403);
  assert.equal(seen.some(x=>x.url.includes('/rpc/mommabees_credential_save')),false);
  assert.equal((await onRequestPost({request:make({...payload,environment:'live'}),env})).status,400);
 }finally{globalThis.fetch=original;}
});
test('Owner valid password and CAPTCHA may rotate a TEST key, never getting key back in response',async()=>{
 const original=globalThis.fetch,{fn,seen}=fakeFetch('owner',true);
 globalThis.fetch=fn;
 const secret='sk_test_example_replacement_dummy_token';
 try{
  const r=await onRequestPost({request:make({name:'STRIPE_SECRET_KEY',environment:'test',value:secret,
   owner_password:'owner-secret-confirmation',captcha_token:'a'.repeat(80)}),env});
  assert.equal(r.status,200);
  const text=await r.text();
  assert.doesNotMatch(text,/sk_test_example|owner-secret-confirmation|captcha/);
  const save=seen.find(x=>x.url.includes('/rpc/mommabees_credential_save'));
  assert.ok(save);
  assert.equal(JSON.parse(save.options.body).p_secret,secret);
  assert.equal(seen.some(x=>x.url==='https://api.stripe.com/v1/account'),true);
  const logged=seen.find(x=>x.url.includes('account_admin_audit'));
  assert.equal(JSON.stringify(logged.options.body).includes(secret),false);
 }finally{globalThis.fetch=original;}
});
test('Runtime Stripe and Turnstile calls consult Vault; no public browser secret exposure',()=>{
 const stripe=read('functions/_lib/stripe.js'),testStripe=read('functions/_lib/product-stripe-test.js');
 const webhook=read('functions/api/stripe-webhook.js'),turnstile=read('functions/_lib/turnstile.js');
 const ui=read('site/credential-management.js');
 assert.match(stripe,/runtimeCredential\(env,'STRIPE_SECRET_KEY',environment\)/);
 assert.match(testStripe,/runtimeCredential\(env,'STRIPE_SECRET_KEY','test'\)/);
 assert.match(webhook,/runtimeCredential\(env,'STRIPE_WEBHOOK_SECRET',mode\)/);
 assert.match(turnstile,/runtimeCredential\(env,'TURNSTILE_SECRET_KEY','shared'\)/);
 assert.match(ui,/autocomplete="new-password"/);
 assert.match(ui,/form\.elements\.value\.value=''/);
 assert.doesNotMatch(ui,/localStorage|sessionStorage/);
});
