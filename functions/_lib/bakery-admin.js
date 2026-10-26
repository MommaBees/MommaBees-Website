import {db,getVerifiedUser,response} from './db.js';

export async function requireBakeryManager(env,request,{moderator=false}={}){
 const user=await getVerifiedUser(env,request);
 if(!user?.id)return {error:response({error:'Sign in required'},401)};
 const id=user.id;
 const [roles,profiles]=await Promise.all([
  db(env,'/rest/v1/staff_roles?select=role&user_id=eq.'+encodeURIComponent(id)),
  db(env,'/rest/v1/customer_profiles?select=banned_at&id=eq.'+encodeURIComponent(id))
 ]);
 if(profiles.length!==1||profiles[0].banned_at)return {error:response({error:'Account is suspended or unavailable'},403)};
 const role=roles[0]?.role;
 if(!['owner','admin',...(moderator?['moderator']:[])].includes(role))
  return {error:response({error:'This action requires a bakery management role'},403)};
 return {user,role};
}
export async function authAdmin(env,path,{method='GET',body}={}){
 if(!env.SUPABASE_SECRET_KEY||!env.SUPABASE_URL)throw Error('Server authentication key unavailable');
 const key=env.SUPABASE_SECRET_KEY;
 const headers={apikey:key};
 if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
 if(body!==undefined)headers['Content-Type']='application/json';
 const r=await fetch(env.SUPABASE_URL.replace(/\/$/,'')+'/auth/v1'+path,
   {method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 const payload=await r.json().catch(()=>({}));
 if(!r.ok){
  const error=new Error(payload.msg||payload.error_description||payload.message||payload.error||'Supabase Auth declined the change');
  error.status=r.status;throw error;
 }
 return payload;
}
export async function auditAccount(env,actor,target,operation,details={}){
 return db(env,'/rest/v1/account_admin_audit',{method:'POST',
  body:{actor_id:actor,target_user_id:target||null,operation,details}});
}
export function asUuid(input){
 const value=String(input||'');
 return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)?value:null;
}
