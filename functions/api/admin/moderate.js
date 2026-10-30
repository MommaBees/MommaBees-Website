import {db,response} from '../../_lib/db.js';
import {requireBakeryManager,asUuid} from '../../_lib/bakery-admin.js';

export async function onRequestPost({request,env}){
 try{
  const auth=await requireBakeryManager(env,request,{moderator:true});
  if(auth.error)return auth.error;
  const raw=await request.text();
  if(raw.length>4000)return response({error:'Request is too long'},413);
  const input=JSON.parse(raw),action=String(input.action||''),id=asUuid(input.id);
  if(!id)return response({error:'Select a valid message or review'},400);
  if(action==='review'){
   if(typeof input.approved!=='boolean')return response({error:'Choose approval or rejection'},400);
   const rows=await db(env,'/rest/v1/reviews?select=id&id=eq.'+id);
   if(!rows.length)return response({error:'Review not found'},404);
   await db(env,'/rest/v1/reviews?id=eq.'+id,{method:'PATCH',body:{approved:input.approved}});
   return response({ok:true,message:input.approved?'Review approved':'Review unpublished'});
  }
  if(action==='review_photo'){
   if(typeof input.approved!=='boolean')return response({error:'Choose approval or withdrawal'},400);
   const photos=await db(env,'/rest/v1/review_photos?select=id,review_id&id=eq.'+id);
   if(photos.length!==1)return response({error:'Review photo not found'},404);
   const reviews=await db(env,'/rest/v1/reviews?select=id&id=eq.'+photos[0].review_id);
   if(reviews.length!==1)return response({error:'Parent review not found'},404);
   const rows=await db(env,'/rest/v1/review_photos?id=eq.'+id,{method:'PATCH',prefer:'return=representation',
    body:{approved:input.approved,reviewed_by:auth.user.id,reviewed_at:new Date().toISOString()}});
   if(!Array.isArray(rows)||rows.length!==1||rows[0].approved!==input.approved)
    return response({error:'Photo moderation outcome was not verified'},503);
   return response({ok:true,message:input.approved?'Photograph approved for publication with the review':'Photograph withdrawn from public display'});
  }
  if(action==='reply'){
   const body=String(input.body||'').trim();
   if(body.length<2||body.length>3000)return response({error:'Enter a reply of 2–3000 characters'},400);
   const roots=await db(env,'/rest/v1/messages?select=id,parent_id,customer_id,customer_email,order_id,subject&id=eq.'+id);
   const parent=roots[0];
   if(!parent||parent.parent_id||!parent.customer_id)return response({error:'Valid customer conversation not found'},404);
   await db(env,'/rest/v1/messages',{method:'POST',body:{
    customer_id:parent.customer_id,customer_email:parent.customer_email,order_id:parent.order_id,
    kind:'reply',subject:'Re: '+String(parent.subject||'Customer message').slice(0,140),
    parent_id:parent.id,body,is_staff_reply:true,status:'replied'
   }});
   await db(env,'/rest/v1/messages?id=eq.'+id,{method:'PATCH',body:{status:'replied'}});
   return response({ok:true,message:'Reply delivered to the customer account inbox'});
  }
  if(action==='message_status'){
   if(!['new','in_progress','replied','closed'].includes(input.status))
    return response({error:'Unsupported message status'},400);
   const rows=await db(env,'/rest/v1/messages?select=id,parent_id&id=eq.'+id);
   if(!rows.length||rows[0].parent_id)return response({error:'Conversation not found'},404);
   await db(env,'/rest/v1/messages?id=eq.'+id,{method:'PATCH',body:{status:input.status}});
   return response({ok:true,message:'Conversation status updated'});
  }
  return response({error:'Unsupported moderation action'},400);
 }catch(error){
  console.error('Moderation request failed',error.message);
  return response({error:'Unable to complete moderation request'},503);
 }
}
