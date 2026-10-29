import {db,response,origin} from '../../_lib/db.js';
import {requireBakeryManager,asUuid} from '../../_lib/bakery-admin.js';
import {createStripeSession} from '../../_lib/stripe.js';
import {runtimeCredential} from '../../_lib/runtime-credentials.js';
import {TEST_PRICES} from '../../_lib/demo-prices.js';
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
  const key=await runtimeCredential(env,'STRIPE_SECRET_KEY','test');
  if(!/^sk_test_/.test(key||''))return denied();
  const settings=await db(env,'/rest/v1/site_settings?select=demo_store_enabled&id=eq.1');
  if(settings[0]?.demo_store_enabled!==true)return response({error:'Enable the Owner/Admin Demo Store in Website Settings first'},409);
  const input=await request.json();
  // Legacy single-item tests remain supported; the sandbox cart supplies item_id + quantity lines.
  const requested=Array.isArray(input?.items)?input.items:[{item_id:input?.item_id,quantity:1}];
  if(!requested.length||requested.length>10)return response({error:'Choose between 1 and 10 sandbox product lines'},400);
  const ids=new Set(),validated=[];
  for(const line of requested){
   const id=asUuid(line?.item_id),quantity=Number(line?.quantity);
   if(!id||!Number.isInteger(quantity)||quantity<1||quantity>30||ids.has(id))
    return response({error:'Invalid sandbox item, duplicate item or quantity'},400);
   ids.add(id);
   const items=await db(env,'/rest/v1/demo_catalog_items?select=id,name,price_cents,enabled&id=eq.'+id);
   const item=items[0];
   if(!item||item.enabled!==true)return response({error:'Demo item is unavailable'},404);
   const catalog=TEST_PRICES[item.name];
   if(!catalog||catalog.amount!==item.price_cents)
    return response({error:'Demo price differs from the configured Stripe sandbox price. Contact Owner to synchronize the test catalog.'},409);
   validated.push({item,catalog,quantity});
  }
  const amount=validated.reduce((total,line)=>total+line.item.price_cents*line.quantity,0);
  if(!Number.isSafeInteger(amount)||amount<50||amount>10000000)
   return response({error:'Sandbox cart amount is invalid'},400);
  const testId=crypto.randomUUID();
  const itemName=validated.map(line=>line.item.name+' x'+line.quantity).join(', ').slice(0,230);
  await db(env,'/rest/v1/demo_checkout_tests',{method:'POST',
   body:{id:testId,actor_id:auth.user.id,item_id:validated.length===1?validated[0].item.id:null,
    item_name:itemName,amount_cents:amount,status:'created'}});
  const site=origin(env);
  try{
   const checkoutFields={
    mode:'payment',
    'allowed_payment_method_types[0]':'card',
    'metadata[demo_checkout_test_id]':testId,
    'metadata[environment]':'MommaBeesBakery-sandbox',
    'success_url':site+'/#sandbox-success',
    'cancel_url':site+'/#shop',
    'customer_email':auth.user.email,
   };
   for(let index=0;index<validated.length;index++){
    const line=validated[index];
    checkoutFields['line_items['+index+'][price]']=line.catalog.stripePrice;
    checkoutFields['line_items['+index+'][quantity]']=String(line.quantity);
   }
   const checkout=await createStripeSession(env,checkoutFields,{environment:'test'});
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
