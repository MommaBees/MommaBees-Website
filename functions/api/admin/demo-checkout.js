import {db,response,origin} from '../../_lib/db.js';
import {requireBakeryManager,asUuid} from '../../_lib/bakery-admin.js';
import {createStripeSession} from '../../_lib/stripe.js';
const denied=()=>response({error:'Sandbox-only checkout is unavailable until a Stripe TEST secret key is installed. Live payments remain disabled.'},503);
export async function onRequestGet({request,env}){
 try{
  const auth=await requireBakeryManager(env,request);if(auth.error)return auth.error;
  const rows=await db(env,'/rest/v1/demo_checkout_tests?select=id,item_name,amount_cents,status,stripe_session_id,created_at&order=created_at.desc&limit=25');
  return response({tests:rows});
 }catch(err){console.error('Sandbox test log error',err.message);return response({error:'Unable to retrieve sandbox tests'},503);}
}
export async function onRequestPost({request,env}){
 try{
  const auth=await requireBakeryManager(env,request);if(auth.error)return auth.error;
  // Never pass a live key to Stripe, even when the site checkout switches on.
  if(!/^sk_test_/.test(env.STRIPE_SECRET_KEY||''))return denied();
  const settings=await db(env,'/rest/v1/site_settings?select=demo_store_enabled&id=eq.1');
  if(settings[0]?.demo_store_enabled!==true)return response({error:'Enable the Owner/Admin Demo Store in Website Settings first'},409);
  const input=await request.json();
  const id=asUuid(input?.item_id);if(!id)return response({error:'Choose a valid demo item'},400);
  const items=await db(env,'/rest/v1/demo_catalog_items?select=id,name,price_cents,enabled&id=eq.'+id);
  const item=items[0];
  if(!item||item.enabled!==true)return response({error:'Demo item is unavailable'},404);
  const testId=crypto.randomUUID(), amount=item.price_cents;
  await db(env,'/rest/v1/demo_checkout_tests',{method:'POST',
   body:{id:testId,actor_id:auth.user.id,item_id:item.id,item_name:item.name,amount_cents:amount,status:'created'}});
  const site=origin(env);
  try{
   const checkout=await createStripeSession(env,{
    mode:'payment',
    'payment_method_types[0]':'card',
    'line_items[0][price_data][currency]':'usd',
    'line_items[0][price_data][unit_amount]':String(amount),
    'line_items[0][price_data][product_data][name]':'TEST ONLY — '+item.name,
    'line_items[0][quantity]':'1',
    'metadata[demo_checkout_test_id]':testId,
    'metadata[environment]':'MommaBeesBakery-sandbox',
    'success_url':site+'/#sandbox-success',
    'cancel_url':site+'/#shop',
    'customer_email':auth.user.email,
   });
   if(!checkout?.id||!checkout?.url||checkout.livemode!==false)throw Error('Stripe did not return a verified sandbox Checkout session');
   await db(env,'/rest/v1/demo_checkout_tests?id=eq.'+testId,{method:'PATCH',
    body:{stripe_session_id:checkout.id,updated_at:new Date().toISOString()}});
   return response({checkout_url:checkout.url,demo_test_id:testId});
  }catch(err){
   await db(env,'/rest/v1/demo_checkout_tests?id=eq.'+testId,{method:'PATCH',
    body:{status:'failed',updated_at:new Date().toISOString()}}).catch(()=>{});
   throw err;
  }
 }catch(err){console.error('Sandbox checkout unavailable',err.message);
  return response({error:'Could not start Stripe sandbox checkout. Verify the bakery Stripe TEST secret and webhook.'},503);}
}
