import {response,rpc,db} from '../_lib/db.js';
import {verifyStripeSignature} from '../_lib/stripe.js';
export async function onRequestPost({request,env}){
 try{
  const raw=await request.text();if(raw.length>100000)return response({error:'Payload too large'},413);
  if(!await verifyStripeSignature(request,env.STRIPE_WEBHOOK_SECRET,raw))return response({error:'Invalid Stripe signature'},400);
  const event=JSON.parse(raw);const session=event.data?.object||{};
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
