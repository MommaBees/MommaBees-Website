// Owner-only storefront Stripe TEST/LIVE mode and LIVE selling state.
// Runtime mode is persisted in site_settings, not in a browser cookie.
// Cloudflare LIVE_PAYMENT_ALLOWED and STRIPE_AUTOMATIC_TAX_ENABLED remain independent fail-closed gates.
import {db,response} from '../../_lib/db.js';
import {requireBakeryManager,auditAccount} from '../../_lib/bakery-admin.js';
import {runtimeCredential} from '../../_lib/runtime-credentials.js';

const MODES=new Set(['test','live']);
const stateQuery='/rest/v1/site_settings?select=id,stripe_payment_mode,checkout_enabled,pickup_enabled,delivery_enabled&id=eq.1';

async function readiness(env){
 const [settings,products,days,batches,preorders]=await Promise.all([
  db(env,stateQuery),
  db(env,'/rest/v1/products?select=id&published=eq.true&product_type=eq.food&limit=1'),
  db(env,'/rest/v1/baking_days?select=date,cutoff_at&enabled=eq.true&cutoff_at=gt.'+encodeURIComponent(new Date().toISOString())+'&limit=1'),
  db(env,'/rest/v1/stock_batches?select=id&disabled=eq.false&quantity_available=gt.0&best_before=gte.'+new Date().toISOString().slice(0,10)+'&limit=1'),
  db(env,'/rest/v1/products?select=id&published=eq.true&mode=in.(preorder,both)&limit=1')
 ]);
 const row=settings[0];
 if(settings.length!==1||!MODES.has(row?.stripe_payment_mode))throw Error('Storefront Stripe payment mode is not configured');
 const mode=row.stripe_payment_mode;
 const requirements=[
  ['payment_kill_switch',env.LIVE_PAYMENT_ALLOWED==='yes','Cloudflare LIVE_PAYMENT_ALLOWED must be yes before accepting real payments.'],
  ['tax_calculation',env.STRIPE_AUTOMATIC_TAX_ENABLED==='yes','Review tax obligations, configure Stripe Tax and enable its Cloudflare release gate.'],
  ['live_account_identity',/^acct_[A-Za-z0-9]+$/.test(env.STRIPE_LIVE_ACCOUNT_ID||''),'Configure the correct MommaBee STRIPE_LIVE_ACCOUNT_ID before LIVE activation.'],
  ['catalog',products.length>0,'Publish an eligible real food product with reviewed ingredients and allergens.'],
  ['fulfillment',days.length>0,'Set an upcoming enabled baking/fulfillment date.'],
  ['inventory',batches.length>0||preorders.length>0,'Add available stock or an eligible published preorder.'],
  ['delivery_method',row.pickup_enabled===true||row.delivery_enabled===true,'Enable pickup or eligible local delivery.']
 ];
 let liveKey=null,webhookKey=null,accountVerified=false;
 try{liveKey=await runtimeCredential(env,'STRIPE_SECRET_KEY','live');}catch{}
 try{webhookKey=await runtimeCredential(env,'STRIPE_WEBHOOK_SECRET','live');}catch{}
 if(/^sk_live_/.test(liveKey||'')&&/^acct_[A-Za-z0-9]+$/.test(env.STRIPE_LIVE_ACCOUNT_ID||'')){
  try{
   const found=await fetch('https://api.stripe.com/v1/account',{headers:{Authorization:'Bearer '+liveKey}});
   if(found.ok){const account=await found.json();accountVerified=account.id===env.STRIPE_LIVE_ACCOUNT_ID;}
  }catch{}
 }
 requirements.push(['live_secret',/^sk_live_/.test(liveKey||''),'Install a verified MommaBee LIVE Stripe secret key in the Owner credential console.']);
 requirements.push(['live_account_verified',accountVerified,'The LIVE Stripe API key must authenticate to the configured MommaBee LIVE account.']);
 requirements.push(['live_webhook',/^whsec_/.test(webhookKey||''),'Install the MommaBee LIVE webhook signing secret; independently test actual signed delivery before launch.']);
 return {
  enabled:row.checkout_enabled===true&&mode==='live',
  checkoutEnabled:row.checkout_enabled===true,
  mode,
  cloudflareMode:env.STRIPE_PAYMENT_MODE==='live'?'live':env.STRIPE_PAYMENT_MODE==='test'?'test':'unset',
  emergencyGate:env.LIVE_PAYMENT_ALLOWED==='yes',
  automaticTaxGate:env.STRIPE_AUTOMATIC_TAX_ENABLED==='yes',
  requirements:requirements.map(([id,ok,message])=>({id,ok,message})),
  ready:requirements.every(x=>x[1])
 };
}
async function authorize(env,request){
 const auth=await requireBakeryManager(env,request);
 if(auth.error)return {error:auth.error};
 if(auth.role!=='owner')return {error:response({error:'Only the Owner can change Stripe payment mode'},403)};
 return {auth};
}
export async function onRequestGet({request,env}){
 try{
  const result=await authorize(env,request);if(result.error)return result.error;
  return response(await readiness(env));
 }catch{return response({error:'Unable to verify Stripe payment readiness'},503);}
}
export async function onRequestPost({request,env}){
 try{
  const result=await authorize(env,request);if(result.error)return result.error;
  if(request.headers.get('Origin')!==new URL(env.SITE_URL).origin)return response({error:'Invalid request origin'},403);
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return response({error:'JSON required'},415);
  if(Number(request.headers.get('content-length')||0)>1024)return response({error:'Invalid request length'},413);
  const body=await request.json();
  if(typeof body?.enabled!=='boolean')return response({error:'A true or false payment state is required'},400);
  const before=await readiness(env);
  if(body.enabled){
   if(body.confirm!=='ENABLE LIVE SALES')return response({error:'Type ENABLE LIVE SALES to authorize real payment processing'},400);
   if(!before.ready)return response({error:'LIVE checkout cannot be enabled while prerequisites are incomplete',requirements:before.requirements},409);
  }
  // One atomic database update prevents mixed LIVE mode / disabled-checkout state from being reported as success.
  const expectedMode=body.enabled?'live':'test';
  const updated=await db(env,'/rest/v1/site_settings?id=eq.1',{
   method:'PATCH',
   body:{stripe_payment_mode:expectedMode,checkout_enabled:body.enabled},
   prefer:'return=representation'
  });
  if(!Array.isArray(updated)||updated.length!==1||
    updated[0].stripe_payment_mode!==expectedMode||updated[0].checkout_enabled!==body.enabled)
   return response({error:'Payment mode and checkout status were not verified after saving'},503);
  let auditRecorded=true;
  try{
   await auditAccount(env,result.auth.user.id,null,body.enabled?'live_checkout_enabled':'live_checkout_disabled',{
    source:'owner_control_center',from_mode:before.mode,to_mode:expectedMode,
    cloudflare_emergency_gate:env.LIVE_PAYMENT_ALLOWED==='yes'
   });
  }catch{auditRecorded=false;}
  return response({...await readiness(env),auditRecorded});
 }catch{return response({error:'Stripe payment mode could not be updated'},503);}
}
