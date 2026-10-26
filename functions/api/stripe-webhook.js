import {response,rpc} from '../_lib/db.js';
import {verifyStripeSignature} from '../_lib/stripe.js';
export async function onRequestPost({request,env}){
 try{
  const raw=await request.text();if(raw.length>100000)return response({error:'Payload too large'},413);
  if(!await verifyStripeSignature(request,env.STRIPE_WEBHOOK_SECRET,raw))return response({error:'Invalid Stripe signature'},400);
  const event=JSON.parse(raw);const session=event.data?.object||{};
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
