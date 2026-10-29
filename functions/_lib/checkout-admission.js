// Server-side abuse defense: bounded, atomic admission before inventory reservation.
// Hash the Cloudflare-supplied source IP with an existing server-only secret. Do not
// log, store or disclose plaintext addresses or credential material.
import {rpc,sha256,response} from './db.js';
export async function checkoutAdmission(env,request,{guest=false}={}){
 const ip=request.headers.get('CF-Connecting-IP')||'missing-cloudflare-ip';
 if(!env.SUPABASE_SECRET_KEY)throw Error('Checkout protection is unavailable');
 const key=await sha256('mommabees-checkout-v1|'+env.SUPABASE_SECRET_KEY+'|'+ip);
 const max=guest?6:12;
 const admission=await rpc(env,'mommabees_checkout_admit',{
  p_key_hash:key,p_limit:max,p_window_seconds:900
 });
 if(admission?.allowed!==true){
  const delay=Math.max(1,Math.min(900,Number(admission?.retry_after)||900));
  return new Response(JSON.stringify({error:'Too many checkout attempts. Please try again later.'}),{
   status:429,headers:{'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store','retry-after':String(delay),'x-content-type-options':'nosniff'}
  });
 }
 return null;
}
