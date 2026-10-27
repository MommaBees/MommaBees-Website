// Server-only username lookup. The client never sees an email address until *its own*
// password login succeeds. No public username-to-email resolver is exposed.
import {db} from './db.js';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function emailForUsername(env,username){
 if(!/^[A-Za-z0-9_]{3,30}$/.test(username))return null;
 if(!env.SUPABASE_SECRET_KEY||!env.SUPABASE_URL)throw Error('Secure username lookup unavailable');
 const id=await db(env,'/rest/v1/rpc/bakery_login_user_id',{
   method:'POST',body:{p_username:username.toLowerCase()}
 });
 if(typeof id!=='string'||!UUID.test(id))return null;
 const headers={apikey:env.SUPABASE_SECRET_KEY};
 // New sb_secret_ keys are API keys, not JWTs. Only legacy keys are bearer tokens.
 if(!env.SUPABASE_SECRET_KEY.startsWith('sb_secret_'))headers.Authorization='Bearer '+env.SUPABASE_SECRET_KEY;
 const response=await fetch(env.SUPABASE_URL.replace(/\/$/,'')+'/auth/v1/admin/users/'+encodeURIComponent(id),
   {headers,redirect:'error'});
 if(!response.ok){
   // Do not report whether a username exists or any returned email address.
   throw Error('Secure account lookup unavailable');
 }
 const result=await response.json().catch(()=>null);
 const user=result?.user||result;
 if(user?.id!==id || typeof user?.email!=='string' || user.email.length>254)
   throw Error('Secure account lookup returned an invalid user');
 return user.email.trim().toLowerCase();
}
