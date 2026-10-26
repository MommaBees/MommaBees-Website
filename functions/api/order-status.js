import {response,db,sha256} from '../_lib/db.js';
export async function onRequestPost({request,env}){
 try{
  const data=await request.json();const token=String(data.token||'');if(!/^[a-f0-9]{64}$/.test(token))return response({error:'Invalid tracking token'},400);
  const hash=await sha256(token);
  const rows=await db(env,'/rest/v1/orders?guest_token_hash=eq.'+encodeURIComponent(hash)+'&select=id,status,payment_status,fulfillment_date,fulfillment_window,total_cents&limit=1');
  if(!rows.length)return response({error:'Order not found'},404);const o=rows[0];
  return response({order_id:o.id,status:o.status,payment_status:o.payment_status,fulfillment_date:o.fulfillment_date,fulfillment_window:o.fulfillment_window,total_cents:o.total_cents});
 }catch{return response({error:'Order tracking unavailable'},400);}
}
