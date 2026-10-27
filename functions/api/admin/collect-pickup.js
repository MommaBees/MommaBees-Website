import {response,rpc} from '../../_lib/db.js';
import {requireBakeryManager,asUuid} from '../../_lib/bakery-admin.js';
export async function onRequestPost({request,env}){
 try{
  const auth=await requireBakeryManager(env,request);
  if(auth.error)return auth.error;
  const data=await request.json();
  const id=asUuid(data?.order_id),method=String(data?.collected_via||'');
  if(!id||!['cash','external_card'].includes(method)||data.confirm_collected!==true)
   return response({error:'Select an order, payment method, and confirm money was actually received'},400);
  const paid=await rpc(env,'confirm_pickup_payment',{
   p_order_id:id,p_actor_id:auth.user.id,p_method:method
  });
  return response({ok:true,order_id:paid.order_id,amount_paid_cents:paid.amount_paid_cents,
   message:'Payment recorded. This is an administrative record, not a Stripe charge.'});
 }catch(error){console.error('Pickup payment collection rejected:',error.message);
  return response({error:error.message||'Unable to record pickup payment'},400);}
}
