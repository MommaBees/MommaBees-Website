import {response} from '../../_lib/db.js';
import {publicAuth} from '../../_lib/turnstile.js';
export async function onRequestPost({request,env}){
 try{
  if(Number(request.headers.get('content-length')||0)>7000)return response({error:'Invalid request'},413);
  const input=await request.json();
  const email=String(input.email||'').trim().toLowerCase();
  const password=String(input.password||'');
  if(email.length>254||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||!password)return response({error:'Enter your email and password'},400);
  // Supabase Auth performs the *single* Turnstile verification. Never redeem the token here.
  if(typeof input.captcha_token!=='string' || !input.captcha_token || input.captcha_token.length>2048)
    return response({error:'Human verification is required; complete the CAPTCHA and try again'},400);
  return publicAuth(env,'/auth/v1/token?grant_type=password',{
    email,password,gotrue_meta_security:{captcha_token:input.captcha_token}
  });
 }catch(e){console.error('Login request rejected',e.message);return response({error:'Sign-in temporarily unavailable'},503);}
}
