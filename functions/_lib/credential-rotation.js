// Service-role-only credential rotation adapters. Sensitive values never leave this module's server context.
import {db} from './db.js';
export const dependenciesFor=(name,environment)=>{
 if(name==='STRIPE_SECRET_KEY')return [
  {name:'stripe_account',state:'pending',details:'Verify account ownership and environment without a charge'},
  {name:'stripe_products_api',state:'pending',details:'Verify product-catalog API read access'},
  {name:'website_runtime',state:'pending',details:'Read back active Vault credential after promotion'},
  {name:'checkout_session',state:'provider_action',details:'Separate authorized TEST checkout required; LIVE charges are not initiated automatically'},
  {name:'provider_key_retirement',state:'provider_action',details:'Expire old key only after integrations are confirmed'}
 ];
 if(name==='STRIPE_WEBHOOK_SECRET')return [
  {name:'stripe_signed_delivery',state:'pending',details:'Await a genuine Stripe-signed event using the replacement signing secret'},
  {name:'website_webhook',state:'pending',details:'Promote only after a valid signed event for '+environment},
  {name:'stripe_dashboard',state:'provider_action',details:'Issue/rotate the secret in the MommaBeesBakery Stripe webhook endpoint'}
 ];
 return [
  {name:'turnstile_challenge',state:'pending',details:'Await a real successful human challenge using the replacement server secret'},
  {name:'site_key_and_auth',state:'provider_action',details:'Synchronize Turnstile site key and Supabase Auth CAPTCHA configuration when rotating both keys'}
 ];
};
const call=(env,path,body)=>db(env,'/rest/v1/rpc/mommabees_credential_'+path,{method:'POST',body});
export async function stageCredential(env,name,environment,secret,actor,dependencies){
 return call(env,'stage',{p_name:name,p_environment:environment,p_secret:secret,p_actor:actor,p_dependencies:dependencies||dependenciesFor(name,environment)});
}
export async function pendingCredential(env,name,environment){
 const result=await call(env,'pending',{p_name:name,p_environment:environment});
 return result&&typeof result.secret==='string'?result:null;
}
export async function credentialHistory(env){const res=await call(env,'history',{});return Array.isArray(res)?res:[];}
export async function promoteCredential(env,id,dependencies){
 return call(env,'promote',{p_rotation:id,p_dependencies:dependencies||[]});
}
export async function revertCredential(env,id,reason){
 return call(env,'revert',{p_rotation:id,p_reason:reason||'Post-activation check failed'});
}
export async function rejectCredential(env,id,state='rejected'){
 return call(env,'reject',{p_rotation:id,p_state:state});
}
export async function checkActiveCredential(env,name,environment,secret){
 const actual=await call(env,'read',{p_name:name,p_environment:environment});
 return actual===secret;
}
export async function promoteWithReadback(env,id,name,environment,secret,dependencies){
 await promoteCredential(env,id,dependencies);
 try{
  if(!await checkActiveCredential(env,name,environment,secret))throw Error('Active key readback mismatch');
 }catch{
  await revertCredential(env,id,'Active Vault readback or dependency verification failed');
  return {id,state:'rolled_back',reason:'Active credential verification failed; prior website key restored'};
 }
 return {id,state:'activated'};
}
// This check does not perform a payment, issue a webhook, or revoke a provider key.
export async function verifyStripeKey(value,environment){
 const prefix=environment==='test'?'sk_test_':'sk_live_';
 if(!value.startsWith(prefix)||value.length<24)return {ok:false,checks:[{name:'stripe_key_format',state:'failed'}]};
 const checks=[];
 for(const [name,path] of [['stripe_account','/v1/account'],['stripe_products_api','/v1/products?limit=1']]){
  let response;
  try{response=await fetch('https://api.stripe.com'+path,{method:'GET',headers:{Authorization:'Bearer '+value}});}
  catch{return {ok:false,checks:[...checks,{name,state:'failed'}]};}
  if(!response.ok)return {ok:false,checks:[...checks,{name,state:'failed',status:response.status}]};
  if(name==='stripe_account'){
   const data=await response.json().catch(()=>({}));
   if(data.id!=='acct_1UUtoDJF02bajTTM')return {ok:false,checks:[...checks,{name,state:'failed',reason:'wrong Stripe account'}]};
  }
  checks.push({name,state:'verified'});
 }
 return {ok:true,checks};
}
