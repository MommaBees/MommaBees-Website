import {response,db,limited} from '../_lib/db.js';
export async function onRequestPost({request,env}){
 try{
  if(!env.TURNSTILE_SECRET_KEY)return response({error:'Guest message verification is not configured. Please create an account to send your request.'},503);
  const payload=await request.json();if(JSON.stringify(payload).length>6000)return response({error:'Message too long'},400);
  const token=payload.turnstile_token;
  if(!token)return response({error:'Complete human verification'},403);
  const f=new FormData();f.set('secret',env.TURNSTILE_SECRET_KEY);f.set('response',token);
  const verification=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:f}).then(r=>r.json());
  if(!verification.success)return response({error:'Human verification failed'},403);
  const email=limited(payload.email,254),body=limited(payload.body,3000),subject=limited(payload.subject,160),kind=payload.kind;
  if(!/^[^ @]+@[^ @]+\.[^ @]+$/.test(email)||body.length<10||!subject||!['question','custom_order','message'].includes(kind))return response({error:'Complete all message fields'},400);
  await db(env,'/rest/v1/messages',{method:'POST',body:{customer_email:email,customer_id:null,kind,subject,body},prefer:'return=minimal'});
  return response({submitted:true});
 }catch(err){console.error('Contact error',err.message);return response({error:'Request could not be delivered'},500);}
}
