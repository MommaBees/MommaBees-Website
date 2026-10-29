// Cloudflare Pages Functions: validate the one-time Turnstile token before Auth.
import { response } from './db.js';
import {runtimeCredential} from './runtime-credentials.js';
export async function verifyTurnstile(env,token,request){
 const secret=await runtimeCredential(env,'TURNSTILE_SECRET_KEY','shared');
 if(!secret || !env.SITE_URL) throw Error('CAPTCHA server settings are missing');
 if(typeof token!=='string' || !token || token.length>2048) return false;
 const body=new FormData();
 body.set('secret',secret);
 body.set('response',token);
 if(request.headers.get('CF-Connecting-IP')) body.set('remoteip',request.headers.get('CF-Connecting-IP'));
 const resp=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body});
 if(!resp.ok) return false;
 const outcome=await resp.json().catch(()=>({}));
 return outcome.success===true && outcome.hostname===new URL(env.SITE_URL).hostname;
}
export async function publicAuth(env,path,payload){
 if(!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) throw Error('Authentication service is not configured');
 const r=await fetch(env.SUPABASE_URL+path,{method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const json=await r.json().catch(()=>({}));
 if(!r.ok) return response({error:json.msg||json.error_description||json.message||'Authentication failed'},r.status>=500?503:400);
 return response(json);
}
