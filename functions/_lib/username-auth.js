// Server-only lookup. No email address is disclosed to the caller unless
// password authentication succeeds. The RPC is grant-restricted to service_role.
import {db} from './db.js';

export async function emailForUsername(env,username){
 if(!/^[A-Za-z0-9_]{3,30}$/.test(username))return null;
 const email=await db(env,'/rest/v1/rpc/bakery_login_email',{
  method:'POST',body:{p_username:username.toLowerCase()}
 });
 if(email===null)return null;
 if(typeof email!=='string'||email.length>254||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
  throw Error('Secure username lookup returned an invalid result');
 return email.trim().toLowerCase();
}
