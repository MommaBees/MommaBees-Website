import {response,rpc,db} from '../_lib/db.js';
import {verifyStripeSignature} from '../_lib/stripe.js';
import {runtimeCredential} from '../_lib/runtime-credentials.js';
import {pendingCredential,promoteWithReadback,dependenciesFor} from '../_lib/credential-rotation.js';
export async function onRequestPost({request,env}){
 try{
  const raw=await request.text();if(raw.length>100000)return response({error:'Payload too large'},413);
  // Verify with the signing secret for the event's TEST/LIVE environment.
  // The event body is untrusted until verification; never act on it before this check.
  const claimed=JSON.parse(raw);
  const mode=claimed.livemode===true?'live':'test';
  // Validate genuine provider delivery before changing any active signing secret.
  // Old signed events continue working while a replacement is awaiting verification.
  const pending=await pendingCredential(env,'STRIPE_WEBHOOK_SECRET',mode);
  let accepted=false;
  if(pending&&await verifyStripeSignature(request,pending.secret,raw)){
   const plan=dependenciesFor('STRIPE_WEBHOOK_SECRET',mode).map(x=>
    x.name==='stripe_signed_delivery'||x.name==='website_webhook'?{...x,state:'verified'}:x);
   const result=await promoteWithReadback(env,pending.id,'STRIPE_WEBHOOK_SECRET',mode,pending.secret,plan);
   if(result.state!=='activated')return response({error:'Webhook key verification could not be committed; retry'},500);
   accepted=true;
  }
  if(!accepted){
   const secret=await runtimeCredential(env,'STRIPE_WEBHOOK_SECRET',mode);
   accepted=await verifyStripeSignature(request,secret,raw);
  }
  if(!accepted)return response({error:'Invalid Stripe signature'},400);
  const event=claimed;const session=event.data?.object||{};
  // Sandbox-only demonstrations never create or update real customer orders.
  if(session.metadata?.demo_checkout_test_id){
   if(event.livemode!==false||session.livemode!==false)return response({error:'Demo payments must never be live'},400);
   const id=session.metadata.demo_checkout_test_id;
   if(!/^[0-9a-f-]{36}$/i.test(id))return response({error:'Invalid demo test identifier'},400);
   const rows=await db(env,'/rest/v1/demo_checkout_tests?select=id,stripe_session_id,amount_cents,status&id=eq.'+id);
   const record=rows[0];
   if(!record||record.stripe_session_id!==session.id||session.currency!=='usd'||
      (session.amount_total!=null&&session.amount_total!==record.amount_cents))
     return response({error:'Sandbox test session reconciliation mismatch'},409);
   let next=null;
   if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)&&session.payment_status==='paid')next='paid';
   if(event.type==='checkout.session.expired')next='expired';
   if(event.type==='checkout.session.async_payment_failed')next='failed';
   if(next && record.status!=='paid')await db(env,'/rest/v1/demo_checkout_tests?id=eq.'+id,{method:'PATCH',
     body:{status:next,updated_at:new Date().toISOString()}});
   return response({received:true,sandbox_demo:true});
  }

  if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
    if(session.payment_status==='paid'&&session.currency==='usd'&&session.metadata?.order_id){
      await rpc(env,'complete_checkout',{p_order_id:session.metadata.order_id,p_session_id:session.id,
        p_paid_total:session.amount_total,p_tax:session.total_details?.amount_tax||0});
    }
  }
  if(event.type==='checkout.session.expired'||event.type==='checkout.session.async_payment_failed'){
    if(session.metadata?.order_id)await rpc(env,'release_checkout',{p_order_id:session.metadata.order_id,p_reason:'failed'});
  }
  return response({received:true});
 }catch(err){console.error('Webhook processing failed:',err.message);return response({error:'Webhook processing failed; Stripe should retry'},500);}
}
