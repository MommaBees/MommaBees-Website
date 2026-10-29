// Owner-only credential management. NO secret values are returned or logged.
// Identity is checked again on every write via a fresh password + Supabase CAPTCHA.
import {db,response} from '../../_lib/db.js';
import {requireBakeryManager,auditAccount} from '../../_lib/bakery-admin.js';
import {validCredentialSlot,RUNTIME_CREDENTIALS} from '../../_lib/runtime-credentials.js';
const EXTERNAL=Object.freeze([
 {provider:'Cloudflare',label:'Cloudflare Pages/API tokens, Workers secrets, Turnstile site key',mode:'provider',details:'Rotate tokens in the MommaBees Cloudflare account. Pages bindings and Turnstile site-key rotation require corresponding provider changes.'},
 {provider:'GitHub',label:'GitHub access tokens, Actions secrets, Deploy keys, webhooks',mode:'provider',details:'Rotate in the MommaBees GitHub repository or organization. Reauthorize the Cloudflare GitHub connection there.'},
 {provider:'Supabase',label:'Supabase secret/service-role, publishable/anon, Auth signing and database credentials',mode:'bootstrap',details:'Rotate in the MommaBees Supabase project and redeploy corresponding Cloudflare Pages bindings; rotating the bootstrap key from inside the site would lock out the site.'},
 {provider:'Stripe',label:'Stripe publishable keys, provider webhook endpoints and signing secret issuance',mode:'provider',details:'Create/roll Stripe keys and webhook signing secrets in MommaBeesBakery Stripe. Paste new website-consumed secret values into the runtime slots only after issuing them.'},
 {provider:'Other',label:'Mail/SMTP, provider OAuth, analytics tokens and future integrations',mode:'provider',details:'External-provider credentials remain in their own secure provider settings until a runtime adapter is explicitly supported.'}
]);
const ORIGINS=new Set(['test','live','shared']);
async function owner(env,request){
 const auth=await requireBakeryManager(env,request);
 if(auth.error)return auth;
 if(auth.role!=='owner')return {error:response({error:'Only the bakery Owner can manage credentials'},403)};
 return auth;
}
function metadata(env,rows){
 return Object.entries(RUNTIME_CREDENTIALS).flatMap(([name,modes])=>modes.map(environment=>{
  const item=(Array.isArray(rows)?rows:[]).find(x=>x.name===name&&x.environment===environment);
  const currentMode=env.STRIPE_PAYMENT_MODE==='live'||(!env.STRIPE_PAYMENT_MODE&&/^sk_live_/.test(env.STRIPE_SECRET_KEY||''))?'live':'test';
  const legacy=name==='STRIPE_SECRET_KEY'?(environment==='test'?env.STRIPE_TEST_SECRET_KEY:env.STRIPE_LIVE_SECRET_KEY)||
   (currentMode===environment?env.STRIPE_SECRET_KEY:null):
   name==='STRIPE_WEBHOOK_SECRET'?(environment==='test'?env.STRIPE_TEST_WEBHOOK_SECRET:env.STRIPE_LIVE_WEBHOOK_SECRET)||
   (currentMode===environment?env.STRIPE_WEBHOOK_SECRET:null):env.TURNSTILE_SECRET_KEY;
  return {name,environment,status:item?.configured?'vault-managed':legacy?'environment-binding':'not-configured',changed_at:item?.changed_at||null};
 }));
}
export async function onRequestGet({request,env}){
 try{
  const a=await owner(env,request);if(a.error)return a.error;
  const rows=await db(env,'/rest/v1/rpc/mommabees_credential_status',{method:'POST',body:{}});
  return response({managed:metadata(env,rows),external:EXTERNAL});
 }catch{ return response({error:'Credential inventory is unavailable'},503);}
}
async function confirmOwnerPassword(env,user,password,captcha){
 if(typeof password!=='string'||password.length<8||password.length>256||typeof captcha!=='string'||captcha.length<20||captcha.length>2048)return false;
 const result=await fetch(env.SUPABASE_URL.replace(/\/$/,'')+'/auth/v1/token?grant_type=password',{
  method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},
  body:JSON.stringify({email:user.email,password,gotrue_meta_security:{captcha_token:captcha}})
 });
 if(!result.ok)return false;
 const signed=await result.json().catch(()=>({}));
 return signed.user?.id===user.id&&signed.user?.email?.toLowerCase()===user.email?.toLowerCase()&&Boolean(signed.access_token);
}
async function validateNewSecret(name,environment,value){
 if(name==='STRIPE_SECRET_KEY'){
  const prefix=environment==='test'?'sk_test_':'sk_live_';
  if(!value.startsWith(prefix))throw Error('Stripe key does not match the selected TEST/LIVE environment.');
  const verified=await fetch('https://api.stripe.com/v1/account',{method:'GET',headers:{Authorization:'Bearer '+value}});
  if(!verified.ok)throw Error('Stripe declined this key.');
  const account=await verified.json().catch(()=>({}));
  if(account.id!=='acct_1UUtoDJF02bajTTM')throw Error('Stripe account mismatch: this must be the MommaBeesBakery account.');
 }else if(name==='STRIPE_WEBHOOK_SECRET'){
  if(!/^whsec_[A-Za-z0-9]+$/.test(value))throw Error('Enter the matching Stripe webhook signing secret.');
 }else if(name==='TURNSTILE_SECRET_KEY'){
  if(!/^0x[A-Za-z0-9_-]{15,100}$/.test(value))throw Error('Invalid Cloudflare Turnstile secret-key format.');
 }
}
export async function onRequestPost({request,env}){
 try{
  if(!/^https:\/\//.test(request.url)||new URL(request.url).origin!==new URL(env.SITE_URL).origin)
   return response({error:'Credential updates require the production website'},403);
  if(request.headers.get('Origin')!==new URL(env.SITE_URL).origin)
   return response({error:'Credential update origin mismatch'},403);
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))
   return response({error:'JSON content required'},415);
  if(Number(request.headers.get('Content-Length')||0)>12000)return response({error:'Request too large'},413);
  const a=await owner(env,request);if(a.error)return a.error;
  const input=await request.json(),name=String(input.name||''),environment=String(input.environment||'');
  if(!ORIGINS.has(environment)||!validCredentialSlot(name,environment))
   return response({error:'This key must be rotated in the appropriate provider control panel'},400);
  const value=input.value;
  if(typeof value!=='string'||value.length<8||value.length>8192)return response({error:'Invalid credential value'},400);
  if(environment==='live'&&input.confirm_live!=='LIVE')
   return response({error:'Type LIVE to confirm a production credential update'},400);
  // Password + a NEW one-time human verification token must be supplied for every write.
  const confirmed=await confirmOwnerPassword(env,a.user,input.owner_password,input.captcha_token);
  if(!confirmed)return response({error:'Owner password or human verification was not accepted'},403);
  await validateNewSecret(name,environment,value);
  const result=await db(env,'/rest/v1/rpc/mommabees_credential_save',{method:'POST',
   body:{p_name:name,p_environment:environment,p_secret:value,p_actor:a.user.id}});
  await auditAccount(env,a.user.id,null,'owner_credential_updated',
   {credential_name:name,environment,changed_at:result?.changed_at||null}).catch(()=>{});
  return response({ok:true,name,environment,changed_at:result?.changed_at||null,
   message:'The website runtime credential was updated. Rotate or verify the matching credential at its provider before ending the change window.'});
 }catch(error){
  // NO error.message from provider responses: may reflect token fragments.
  console.error('Owner credential request rejected');
  return response({error:'Credential update failed. Check the provider, environment and Owner verification.'},503);
 }
}
