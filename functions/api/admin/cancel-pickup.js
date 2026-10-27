import {response,rpc} from '../../_lib/db.js';
import {requireBakeryManager,asUuid} from '../../_lib/bakery-admin.js';
export async function onRequestPost({request,env}){
 try{
  const auth=await requireBakeryManager(env,request);if(auth.error)return auth.error;
  const data=await request.json();
  const id=asUuid(data?.order_id),reason=String(data?.reason||'').trim();
  if(!id||reason.length<6||reason.length>500||data.confirm_cancel!==true)
   return response({error:'An order, reason and explicit cancellation confirmation are required'},400);
  const done=await rpc(env,'cancel_pickup_order',{
    p_order_id:id,p_actor_id:auth.user.id,p_reason:reason
  });
  return response({ok:done.cancelled===true,message:'Unpaid pickup order cancelled; available stock returned'});
 }catch(err){console.error('Cancel pickup failed:',err.message);
  return response({error:err.message||'Pickup cancellation unavailable'},400);}
}
