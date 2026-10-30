// Owner-only LIVE checkout state and prerequisite validation.
// Database switch is subordinate to Cloudflare payment emergency kill switch.
import {db,response} from '../../_lib/db.js';
import {requireBakeryManager,auditAccount} from '../../_lib/bakery-admin.js';
import {stripePaymentMode} from '../../_lib/stripe.js';
import {runtimeCredential} from '../../_lib/runtime-credentials.js';

async function readiness(env){
 const [settings,products,days,batches,preorders]=await Promise.all([
  db(env,'/rest/v1/site_settings?select=id,checkout_enabled,pickup_enabled,delivery_enabled&id=eq.1'),
  db(env,'/rest/v1/products?select=id&published=eq.true&product_type=eq.food&limit=1'),
  db(env,'/rest/v1/baking_days?select=date,cutoff_at&enabled=eq.true&cutoff_at=gt.'+encodeURIComponent(new Date().toISOString())+'&limit=1'),
  db(env,'/rest/v1/stock_batches?select=id&disabled=eq.false&quantity_available=gt.0&best_before=gte.'+new Date().toISOString().slice(0,10)+'&limit=1'),
  db(env,'/rest/v1/products?select=id&published=eq.true&mode=in.(preorder,both)&limit=1')
 ]);
 const row=settings[0]||{};
 const mode=stripePaymentMode(env);
 const requirements=[
  ['checkout_mode',mode==='live','Configure LIVE Stripe payment mode at the provider/Cloudflare first; TEST credentials cannot collect real payments.'],
  ['payment_kill_switch',env.LIVE_PAYMENT_ALLOWED==='yes','Cloudflare LIVE_PAYMENT_ALLOWED emergency gate must be explicitly authorized.'],
  ['tax_calculation',env.STRIPE_AUTOMATIC_TAX_ENABLED==='yes','Stripe automatic tax must be configured and validated before live checkout.'],
  ['catalog',products.length>0,'Publish an eligible real food product with reviewed ingredients and allergens.'],
  ['fulfillment',days.length>0,'Set an upcoming enabled baking/fulfillment date before opening checkout.'],
  ['inventory',batches.length>0||preorders.length>0,'Add ready-to-sell stock or a published preorder product.'],
  ['delivery_method',row.pickup_enabled===true||row.delivery_enabled===true,'Enable pickup or eligible local delivery.']
 ];
 let liveKey=false,webhookKey=false;
 try{liveKey=/^sk_live_/.test(await runtimeCredential(env,'STRIPE_SECRET_KEY','live')||'');}catch{}
 try{webhookKey=/^whsec_/.test(await runtimeCredential(env,'STRIPE_WEBHOOK_SECRET','live')||'');}catch{}
 requirements.push(['live_secret',liveKey,'Install and verify the MommaBeesBakery LIVE Stripe secret in Owner credentials.']);
 requirements.push(['live_webhook',webhookKey,'Install and verify the LIVE Stripe webhook signing secret and deliveries.']);
 return {enabled:row.checkout_enabled===true,mode,requirements:requirements.map(([id,ok,message])=>({id,ok,message})),ready:requirements.every(x=>x[1])};
}
async function authorize(env,request){
 const auth=await requireBakeryManager(env,request);
 if(auth.error)return {error:auth.error};
 if(auth.role!=='owner')return {error:response({error:'Only the Owner can change live selling status'},403)};
 return {auth};
}
export async function onRequestGet({request,env}){
 try{
  const result=await authorize(env,request);if(result.error)return result.error;
  return response(await readiness(env));
 }catch{return response({error:'Unable to verify live-selling readiness'},503);}
}
export async function onRequestPost({request,env}){
 try{
  const result=await authorize(env,request);if(result.error)return result.error;
  if(request.headers.get('Origin')!==new URL(env.SITE_URL).origin)return response({error:'Invalid request origin'},403);
  if(Number(request.headers.get('content-length')||0)>1024)return response({error:'Invalid request length'},413);
  const body=await request.json();
  if(typeof body?.enabled!=='boolean')return response({error:'A true or false selling state is required'},400);
  const before=await readiness(env);
  if(body.enabled){
   if(body.confirm!=='ENABLE LIVE SALES')return response({error:'Type ENABLE LIVE SALES to authorize activation'},400);
   if(!before.ready)return response({error:'LIVE checkout cannot be enabled while prerequisites are incomplete',requirements:before.requirements},409);
  }
  const updated=await db(env,'/rest/v1/site_settings?id=eq.1',{method:'PATCH',body:{checkout_enabled:body.enabled},prefer:'return=representation'});
  if(!Array.isArray(updated)||updated.length!==1||updated[0].checkout_enabled!==body.enabled)
   return response({error:'Checkout status was not verified after saving'},503);
  let auditRecorded=true;
  try{await auditAccount(env,result.auth.user.id,null,body.enabled?'live_checkout_enabled':'live_checkout_disabled',{source:'owner_control_center'});}catch{auditRecorded=false;}
  return response({...await readiness(env),auditRecorded});
 }catch{return response({error:'LIVE selling setting could not be updated'},503);}
}
