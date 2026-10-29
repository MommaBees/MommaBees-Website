// Request secure Supabase password recovery. Do not reveal whether an email has an account.
import {response} from '../../_lib/db.js';
import {publicAuth} from '../../_lib/turnstile.js';
const EMAIL=/^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const GENERIC='If an account uses this email address, password reset instructions will be sent to it.';
export async function onRequestPost({request,env}){
 try{
  if(Number(request.headers.get('content-length')||0)>4096)return response({error:'Invalid request'},413);
  const input=await request.json();
  const email=String(input.email||'').trim().toLowerCase();
  const token=input.captcha_token;
  if(email.length>254||!EMAIL.test(email))return response({error:'Enter a valid email address.'},400);
  if(typeof token!=='string'||!token||token.length>2048)
   return response({error:'Complete human verification before requesting a reset.'},400);
  const origin=new URL(env.SITE_URL||'');
  if(origin.protocol!=='https:')throw Error('Secure account recovery URL is not configured');
  // The approved base site URL is used; no attacker-controlled redirect_to parameter.
  const path='/auth/v1/recover?redirect_to='+encodeURIComponent(origin.origin+'/');
  // Supabase Auth consumes the Turnstile token exactly once.
  const result=await publicAuth(env,path,{email,gotrue_meta_security:{captcha_token:token}});
  if(!result.ok){
   const payload=await result.clone().json().catch(()=>({}));
   const error=String(payload.error||'');
   if(/captcha|verification|security check/i.test(error))
    return response({error:'Human verification was unsuccessful. Verify again and retry.'},400);
   if(result.status>=500)return response({error:'Password recovery temporarily unavailable.'},503);
  }
  return response({message:GENERIC});
 }catch(error){
  console.error('Bakery password recovery unavailable',error.message);
  return response({error:'Password recovery temporarily unavailable.'},503);
 }
}
