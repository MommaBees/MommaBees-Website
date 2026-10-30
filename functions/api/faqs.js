import {db,response} from '../_lib/db.js';
import {requireBakeryManager,asUuid,auditAccount} from '../_lib/bakery-admin.js';
const collection='/rest/v1/faq_entries';
const fields='id,source_index,question,answer,sort_order,published';
const text=(s,max)=>typeof s==='string'?s.trim().slice(0,max):'';
async function manager(env,request){
 const auth=await requireBakeryManager(env,request);
 return auth.error?{error:auth.error}:{auth};
}
const originOk=(env,request)=>{
 try{return request.headers.get('Origin')===new URL(env.SITE_URL).origin;}catch{return false;}
};
const readBody=async request=>{
 const raw=await request.text();
 if(raw.length>6000)throw Error('FAQ request is too large');
 return JSON.parse(raw);
};
const clean=body=>{
 const q=text(body?.question,220),a=text(body?.answer,4000),order=Number(body?.sort_order);
 if(q.length<5||a.length<1||!Number.isSafeInteger(order)||order<0||order>100000)
  throw Error('Enter a question (5–220 characters), answer (1–4,000 characters), and valid display order');
 if(typeof body?.published!=='boolean')throw Error('Published must be true or false');
 return {question:q,answer:a,sort_order:order,published:body.published,updated_at:new Date().toISOString()};
};
export async function onRequestGet({request,env}){
 try{
  const admin=new URL(request.url).searchParams.get('admin')==='1';
  if(admin){const a=await manager(env,request);if(a.error)return a.error;}
  const rows=await db(env,collection+'?select='+fields+(admin?'':'&published=eq.true')+'&order=sort_order.asc,created_at.asc&limit=250');
  return response({items:rows});
 }catch{return response({error:'FAQ list unavailable'},503);}
}
export async function onRequestPost({request,env}){
 try{
  const a=await manager(env,request);if(a.error)return a.error;
  if(!originOk(env,request))return response({error:'Invalid request origin'},403);
  const body=await readBody(request);
  if(body?.action==='reorder'){
   if(!Array.isArray(body.ids)||body.ids.length<1||body.ids.length>250||body.ids.some(x=>!asUuid(x)))
    return response({error:'Invalid FAQ ordering list'},400);
   const count=await db(env,'/rest/v1/rpc/mommabees_reorder_faqs',{method:'POST',body:{p_ids:body.ids}});
   await auditAccount(env,a.auth.user.id,null,'faqs_reordered',{count}).catch(()=>{});
   return response({reordered:count});
  }
  const obj=clean(body);
  const rows=await db(env,collection,{method:'POST',body:obj,prefer:'return=representation'});
  if(!Array.isArray(rows)||rows.length!==1)return response({error:'FAQ creation could not be verified'},503);
  await auditAccount(env,a.auth.user.id,null,'faq_created',{faq_id:rows[0].id}).catch(()=>{});
  return response({item:rows[0]},201);
 }catch(error){return response({error:String(error.message||'FAQ could not be created')},400);}
}
export async function onRequestPatch({request,env}){
 try{
  const a=await manager(env,request);if(a.error)return a.error;
  if(!originOk(env,request))return response({error:'Invalid request origin'},403);
  const body=await readBody(request),id=asUuid(body?.id);
  if(!id)return response({error:'Invalid FAQ identifier'},400);
  const obj=clean(body);
  const rows=await db(env,collection+'?id=eq.'+id,{method:'PATCH',body:obj,prefer:'return=representation'});
  if(!Array.isArray(rows)||rows.length!==1)return response({error:'FAQ not found or edit not saved'},409);
  await auditAccount(env,a.auth.user.id,null,'faq_updated',{faq_id:id}).catch(()=>{});
  return response({item:rows[0]});
 }catch(error){return response({error:String(error.message||'FAQ could not be updated')},400);}
}
export async function onRequestDelete({request,env}){
 try{
  const a=await manager(env,request);if(a.error)return a.error;
  if(!originOk(env,request))return response({error:'Invalid request origin'},403);
  const body=await readBody(request),id=asUuid(body?.id);
  if(!id||body?.confirm!=='DELETE FAQ')return response({error:'Deletion requires an exact FAQ and confirmation'},400);
  const existing=await db(env,collection+'?select=id&id=eq.'+id);
  if(existing.length!==1)return response({error:'FAQ not found'},404);
  await db(env,collection+'?id=eq.'+id,{method:'DELETE'});
  const remains=await db(env,collection+'?select=id&id=eq.'+id);
  if(remains.length)return response({error:'FAQ deletion could not be confirmed'},503);
  await auditAccount(env,a.auth.user.id,null,'faq_deleted',{faq_id:id}).catch(()=>{});
  return response({deleted:true});
 }catch(error){return response({error:String(error.message||'FAQ could not be deleted')},400);}
}
