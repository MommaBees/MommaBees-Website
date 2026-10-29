// Protected privileged promotion delivery. Direct browser access to SQL RPC is revoked.
import {response,rpc} from '../../_lib/db.js';
import {requireBakeryManager,auditAccount,asUuid} from '../../_lib/bakery-admin.js';
export async function onRequestPost({request,env}){
 try{
  if(new URL(request.url).origin!==new URL(env.SITE_URL).origin ||
    request.headers.get('Origin')!==new URL(env.SITE_URL).origin)
   return response({error:'Invalid request origin'},403);
  if(Number(request.headers.get('content-length')||0)>4000)return response({error:'Request too large'},413);
  const auth=await requireBakeryManager(env,request);
  if(auth.error)return auth.error;
  const data=await request.json();
  const id=asUuid(data?.promotion_id);
  if(!id)return response({error:'Invalid promotion ID'},400);
  const count=await rpc(env,'mommabees_deliver_promotion_admin',{
   p_promo_id:id,p_actor_id:auth.user.id
  });
  await auditAccount(env,auth.user.id,null,'promotional_notifications_dispatched',
   {promotion_id:id,notification_count:count}).catch(()=>{});
  return response({delivered:Math.max(0,Number(count)||0)});
 }catch{
  return response({error:'Promotion could not be delivered'},503);
 }
}
