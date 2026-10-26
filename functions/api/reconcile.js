import {response,db,rpc,getVerifiedUser} from '../_lib/db.js';
export async function onRequestPost({request,env}){
 try{
  const user=await getVerifiedUser(env,request);if(!user)return response({error:'Sign in required'},401);
  const roles=await db(env,'/rest/v1/staff_roles?user_id=eq.'+encodeURIComponent(user.id)+'&select=role&limit=1');
  if(!roles.length||!['owner','admin'].includes(roles[0].role))return response({error:'Admin access required'},403);
  const released=await rpc(env,'expire_stale_checkouts',{});
  return response({released});
 }catch(err){console.error('Reconciliation unavailable',err.message);return response({error:'Reconciliation failed'},500);}
}
