import {response,rpc,sha256,randomToken,getVerifiedUser} from '../_lib/db.js';
import {verifyTurnstile} from '../_lib/turnstile.js';
import {acceptedOrderNote} from '../_lib/order-legal.js';
const clean=(value,length=200)=>String(value||'').trim().slice(0,length);
export async function onRequestPost({request,env}){
 try{
  const text=await request.text();
  if(text.length>15000)return response({error:'Request too large'},413);
  const data=JSON.parse(text);
  if(!data || !Array.isArray(data.items))return response({error:'Choose the products to order'},400);
  const user=await getVerifiedUser(env,request);
  if(!user){
   if(!await verifyTurnstile(env,data.captcha_token,request))
    return response({error:'Complete human verification to reserve a guest pickup'},400);
  }
  const first=clean(data.first_name,60),last=clean(data.last_name,60);
  const email=clean(data.email,254),phone=clean(data.phone,24);
  const channel=clean(data.contact_channel,15);
  const address={
   street:clean(data.address?.street,160),
   city:clean(data.address?.city,80),
   state:clean(data.address?.state,30),
   zip:clean(data.address?.zip,10)
  };
  if(!first||!last||!address.street||!address.city||!address.state||
     !/^\d{5}(?:-\d{4})?$/.test(address.zip))
   return response({error:'Enter first name, last name, street address, city, state and ZIP'},400);
  if(channel==='text' && data.address?.text_contact_consent!==true)
   return response({error:'Consent to order-related text messages is required'},400);
  if(channel==='text'&&!/^\+?[0-9() .-]{10,22}$/.test(phone))
   return response({error:'Enter a text-capable contact phone'},400);
  if(channel==='email'&&!/^[^ @]+@[^ @]+\.[^ @]+$/.test(email))
   return response({error:'Enter a valid contact email address'},400);
  if(!['text','email'].includes(channel))return response({error:'Choose email or text contact'},400);
  const guestToken=randomToken();
  const items=data.items.map(i=>({product_id:String(i.product_id||''),
    mode:String(i.mode||''),batch_id:i.batch_id||null,quantity:Number(i.quantity)}));
  if(items.some(i=>!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>30))
   return response({error:'Invalid order quantity'},400);
  const result=await rpc(env,'reserve_pickup_order',{
   p_items:items,p_date:clean(data.date,10),p_window:clean(data.window,80),
   p_first_name:first,p_last_name:last,p_email:email||null,p_phone:phone||null,
   p_address:address,p_contact_channel:channel,p_user_id:user?.id||null,
   p_note:acceptedOrderNote(data,'pickup'),p_guest_hash:await sha256(guestToken)
  });
  return response({order_id:result.order_id,guest_token:guestToken,
   amount_due_cents:result.amount_due_cents,payment_status:result.payment_status,
   message:'Pickup request recorded. Payment is due at pickup. No online charge was made.'});
 }catch(err){console.error('Pay-at-pickup reservation failed',err.message);
  return response({error:err?.message||'Unable to reserve pickup at this time'},400);}
}
