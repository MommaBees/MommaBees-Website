import {response} from '../../_lib/db.js';
import {publicAuth} from '../../_lib/turnstile.js';
const clean=(s,max)=>String(s||'').trim().slice(0,max);
export async function onRequestPost({request,env}){
 try{
  if(Number(request.headers.get('content-length')||0)>12000)return response({error:'Invalid registration request'},413);
  const input=await request.json();
  const email=clean(input.email,254).toLowerCase(),password=String(input.password||'');
  const data={first_name:clean(input.first_name,70),last_name:clean(input.last_name,70),username:clean(input.username,30),
   address_line1:clean(input.address_line1,160),address_line2:clean(input.address_line2,160),
   city:clean(input.city,100),state:clean(input.state,80),country:clean(input.country,2).toUpperCase(),
   postal_code:clean(input.postal_code,15),billing_same:input.billing_same===true,
   billing_line1:clean(input.billing_line1,160),billing_line2:clean(input.billing_line2,160),
   billing_city:clean(input.billing_city,100),billing_state:clean(input.billing_state,80),
   billing_country:clean(input.billing_country,2).toUpperCase(),billing_postal_code:clean(input.billing_postal_code,15),
   phone:clean(input.phone,35)};
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||password.length<8||password.length>128||
    !data.first_name||!data.last_name||!/^[A-Za-z0-9_]{3,30}$/.test(data.username)||
    !data.address_line1||!data.city||!data.state||!data.country||!data.postal_code||
    (!data.billing_same&&(!data.billing_line1||!data.billing_city||!data.billing_state||!data.billing_country||!data.billing_postal_code)))
    return response({error:'Complete all required account and address fields'},400);
  // Supabase Auth verifies the Turnstile token once (direct Auth requests are protected too).
  if(typeof input.captcha_token!=='string' || !input.captcha_token || input.captcha_token.length>2048)
    return response({error:'Human verification is required; complete the CAPTCHA and try again'},400);
  return publicAuth(env,'/auth/v1/signup',{
    email,password,data,gotrue_meta_security:{captcha_token:input.captcha_token}
  });
 }catch(e){console.error('Registration rejected',e.message);return response({error:'Registration temporarily unavailable'},503);}
}
