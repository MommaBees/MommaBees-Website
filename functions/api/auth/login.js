import {response} from '../../_lib/db.js';
import {publicAuth} from '../../_lib/turnstile.js';
import {emailForUsername} from '../../_lib/username-auth.js';

const GENERIC_ERROR='Invalid email/username or password';
const EMAIL=/^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const USERNAME=/^[A-Za-z0-9_]{3,30}$/;
const DUMMY_EMAIL='unregistered-bakery-username@invalid.invalid';

export async function onRequestPost({request,env}){
 try{
  if(Number(request.headers.get('content-length')||0)>7000)
   return response({error:'Invalid sign-in request'},413);
  const input=await request.json();
  // Keep email as an accepted field for older browser clients and tests.
  const identifier=String(input.identifier??input.email??'').trim();
  const password=String(input.password||'');
  const isEmail=identifier.includes('@');
  if(identifier.length>254||!password||
    !(isEmail?EMAIL.test(identifier):USERNAME.test(identifier)))
    return response({error:'Enter a valid email address or username and password'},400);
  // Supabase Auth performs the one-and-only Turnstile verification.
  // Never separately redeem this one-time token in Cloudflare.
  if(typeof input.captcha_token!=='string'||!input.captcha_token||input.captcha_token.length>2048)
    return response({error:'Human verification is required; complete the CAPTCHA and try again'},400);
  let email;
  if(isEmail){
    email=identifier.toLowerCase();
  }else{
    // The privileged look-up is on the server; no email resolver is exposed to browsers.
    email=await emailForUsername(env,identifier);
  }
  const result=await publicAuth(env,'/auth/v1/token?grant_type=password',{
    email:email||DUMMY_EMAIL,password,
    gotrue_meta_security:{captcha_token:input.captcha_token}
  });
  // Do not reveal which usernames exist or whether their email was verified.
  if(!isEmail){
    if(!email||!result.ok){
      const authError=await result.clone().json().catch(()=>({}));
      if(/captcha|verification/i.test(String(authError.error||'')))
        return response({error:'Human verification failed. Complete the CAPTCHA and try again.'},400);
      return response({error:GENERIC_ERROR},400);
    }
  }
  return result;
 }catch(error){
  console.error('Sign-in backend unavailable',error.message);
  return response({error:'Sign-in temporarily unavailable'},503);
 }
}
