// Owner-only credential management. NO secret values are returned or logged.
// Identity is checked again on every write via a fresh password + Supabase CAPTCHA.
import {db,response} from '../../_lib/db.js';
import {requireBakeryManager,auditAccount} from '../../_lib/bakery-admin.js';
import {validCredentialSlot,RUNTIME_CREDENTIALS} from '../../_lib/runtime-credentials.js';
import {dependenciesFor,stageCredential,credentialHistory,verifyStripeKey,promoteWithReadback,rejectCredential,pendingCredential,automaticRotationSetting} from '../../_lib/credential-rotation.js';
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
  const history=await credentialHistory(env);
  const rotation=await automaticRotationSetting(env);
  return response({managed:metadata(env,rows),external:EXTERNAL,history,auto_rotation_enabled:rotation.enabled});
 }catch{ return response({error:'Credential inventory is unavailable'},503);}
}
export async function confirmOwnerPassword(env,user,password,captcha){
 if(typeof password!=='string'||password.length<8||password.length>256||typeof captcha!=='string'||captcha.length<20||captcha.length>2048)return false;
 const result=await fetch(env.SUPABASE_URL.replace(/\/$/,'')+'/auth/v1/token?grant_type=password',{
  method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},
  body:JSON.stringify({email:user.email,password,gotrue_meta_security:{captcha_token:captcha}})
 });
 if(!result.ok)return false;
 const signed=await result.json().catch(()=>({}));
 return signed.user?.id===user.id&&signed.user?.email?.toLowerCase()===user.email?.toLowerCase()&&Boolean(signed.access_token);
}
async function validateNewSecret(name,environment,value,env){
 if(name==='STRIPE_SECRET_KEY')return verifyStripeKey(value,environment,env.STRIPE_LIVE_ACCOUNT_ID||null);
 if(name==='STRIPE_WEBHOOK_SECRET'&&/^whsec_[A-Za-z0-9]+$/.test(value))
  return {ok:true,checks:[{name:'secret_format',state:'verified'}]};
 if(name==='TURNSTILE_SECRET_KEY'&&/^0x[A-Za-z0-9_-]{15,100}$/.test(value))
  return {ok:true,checks:[{name:'secret_format',state:'verified'}]};
 return {ok:false,checks:[{name:'secret_format',state:'failed'}]};
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
  const checked=await validateNewSecret(name,environment,value,env);
  if(!checked.ok)return response({ok:false,state:'failed',checks:checked.checks,
   error:'Replacement failed provider verification. The existing website credential is unchanged.'},422);
  const plan=dependenciesFor(name,environment).map(step=>{
   const done=checked.checks.find(x=>x.name===step.name);
   return done?{...step,state:done.state}:step;
  });
  const staged=await stageCredential(env,name,environment,value,a.user.id,plan);
  let state='pending',result={id:staged.id,state:'pending'},completed=plan;
  if(name==='STRIPE_SECRET_KEY'){
   const verified=plan.map(x=>x.name==='website_runtime'?{...x,state:'verified'}:x);
   result=await promoteWithReadback(env,staged.id,name,environment,value,verified);
   state=result.state;
   completed=state==='activated'?verified:verified.map(x=>x.name==='website_runtime'?{...x,state:'failed'}:x);
  }
  await auditAccount(env,a.user.id,null,'owner_credential_rotation',
   {credential_name:name,environment,rotation_id:staged.id,state}).catch(()=>{});
  return response({ok:state==='activated'||state==='pending',name,environment,id:staged.id,state,
   dependencies:completed,required_actions:completed.filter(x=>x.state==='provider_action'),
   message:state==='activated'
    ?'Replacement passed available checks and is active. Provider-side retirement and checkout validation may still be required.'
    :state==='pending'
    ?'Replacement staged securely; the existing key stays active pending verified provider delivery or challenge.'
    :'Post-activation check failed; the prior website credential was restored.'},state==='rolled_back'?409:200);
 }catch(error){
  // NO error.message from provider responses: may reflect token fragments.
  console.error('Owner credential request rejected');
  return response({error:'Credential update failed. Check the provider, environment and Owner verification.'},503);
 }
}

export async function onRequestDelete({request,env}){
 try{
  if(new URL(request.url).origin!==new URL(env.SITE_URL).origin||
   request.headers.get('Origin')!==new URL(env.SITE_URL).origin)
   return response({error:'Credential update origin mismatch'},403);
  const a=await owner(env,request);if(a.error)return a.error;
  const input=await request.json();
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(input.rotation_id||'')))
   return response({error:'Invalid rotation identifier'},400);
  if(!await confirmOwnerPassword(env,a.user,input.owner_password,input.captcha_token))
   return response({error:'Owner confirmation failed'},403);
  const result=await rejectCredential(env,input.rotation_id);
  await auditAccount(env,a.user.id,null,'owner_credential_rotation_cancelled',
   {rotation_id:input.rotation_id,state:result.state}).catch(()=>{});
  return response({ok:true,id:input.rotation_id,state:result.state});
 }catch{
  return response({error:'Unable to cancel pending rotation'},409);
 }
}

export async function onRequestPatch({request,env}){
 try{
  if(new URL(request.url).origin!==new URL(env.SITE_URL).origin||
   request.headers.get('Origin')!==new URL(env.SITE_URL).origin)
   return response({error:'Credential update origin mismatch'},403);
  const a=await owner(env,request);if(a.error)return a.error;
  const input=await request.json();
  if(typeof input.rotation_id!=='string'||!/^[-a-f0-9]{36}$/i.test(input.rotation_id))
   return response({error:'Invalid pending rotation'},400);
  if(!await confirmOwnerPassword(env,a.user,input.owner_password,input.captcha_token))
   return response({error:'Owner reauthentication failed'},403);
  if(input.action==='activate_webhook'){
   const environment=String(input.environment||'');
   if(!['test','live'].includes(environment))return response({error:'Invalid Stripe webhook environment'},400);
   if(environment==='live'&&input.confirm_live!=='LIVE')return response({error:'Type LIVE to confirm production activation'},400);
   const pendingWebhook=await pendingCredential(env,'STRIPE_WEBHOOK_SECRET',environment);
   if(!pendingWebhook||pendingWebhook.id!==input.rotation_id)
    return response({error:'No matching pending webhook replacement'},409);
   if(pendingWebhook.proof_verified!==true)
    return response({error:'Awaiting a valid Stripe-signed webhook event; existing key remains active'},409);
   const plan=dependenciesFor('STRIPE_WEBHOOK_SECRET',environment).map(d=>
    ['stripe_signed_delivery','website_webhook'].includes(d.name)?{...d,state:'verified'}:d);
   const result=await promoteWithReadback(env,pendingWebhook.id,'STRIPE_WEBHOOK_SECRET',environment,pendingWebhook.secret,plan);
   await auditAccount(env,a.user.id,null,'owner_manual_webhook_rotation_activated',
    {rotation_id:pendingWebhook.id,environment,state:result.state}).catch(()=>{});
   return response({ok:result.state==='activated',id:pendingWebhook.id,state:result.state,dependencies:plan,
    message:result.state==='activated'?'Signed webhook key verified and manually activated.':'Verification failed; old website key restored.'},
    result.state==='activated'?200:409);
  }
  const pending=await pendingCredential(env,'TURNSTILE_SECRET_KEY','shared');
  if(!pending||pending.id!==input.rotation_id)
   return response({error:'No matching pending Turnstile secret'},409);
  if(typeof input.proof_token!=='string'||input.proof_token.length<20||input.proof_token.length>2048)
   return response({error:'Complete a second fresh verification challenge'},400);
  const body=new FormData();
  body.set('secret',pending.secret);body.set('response',input.proof_token);
  const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body});
  if(!r.ok)return response({error:'Turnstile provider verification unavailable; previous key unchanged'},503);
  const proof=await r.json().catch(()=>({}));
  if(proof.success!==true||proof.hostname!==new URL(env.SITE_URL).hostname)
   return response({error:'New Turnstile key was not verified; previous key unchanged'},409);
  const plan=dependenciesFor('TURNSTILE_SECRET_KEY','shared').map(d=>
   d.name==='turnstile_challenge'?{...d,state:'verified'}:d);
  const result=await promoteWithReadback(env,pending.id,'TURNSTILE_SECRET_KEY','shared',pending.secret,plan);
  await auditAccount(env,a.user.id,null,'owner_credential_rotation_verified',
   {rotation_id:pending.id,state:result.state,credential_name:'TURNSTILE_SECRET_KEY'}).catch(()=>{});
  return response({ok:result.state==='activated',id:pending.id,state:result.state,dependencies:plan,
   message:result.state==='activated'?
    'Turnstile replacement passed a real challenge and is active. Recheck Supabase Auth CAPTCHA and public site key dependencies.':
    'Verification failed after promotion. Previous key restored.'},result.state==='activated'?200:409);
 }catch{return response({error:'Credential verification failed; existing active key retained'},503);}
}
