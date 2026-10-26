import {db,response} from '../../_lib/db.js';
import {requireBakeryManager,authAdmin,auditAccount,asUuid} from '../../_lib/bakery-admin.js';

const failed=error=>response({error:error.message||'Unable to complete account action'},error.status===429?429:400);
async function userAndRole(env,id){
 const [raw,staff,profiles]=await Promise.all([
  authAdmin(env,'/admin/users/'+encodeURIComponent(id)),
  db(env,'/rest/v1/staff_roles?select=role&user_id=eq.'+id),
  db(env,'/rest/v1/customer_profiles?select=id,account_code,username,first_name,last_name,banned_at,ban_reason&id=eq.'+id)
 ]);
 return {user:raw.user||raw,role:staff[0]?.role||'customer',profile:profiles[0]||null};
}
const pageIndex=v=>Math.max(1,Math.min(10000,parseInt(String(v||'1'),10)||1));
export async function onRequestGet({request,env}){
 try{
  const auth=await requireBakeryManager(env,request);if(auth.error)return auth.error;
  const page=pageIndex(new URL(request.url).searchParams.get('page'));
  const users=await authAdmin(env,'/admin/users?page='+page+'&per_page=50');
  const records=users.users||[];
  const ids=records.map(u=>u.id).filter(asUuid);
  const filter=ids.length?'&id=in.('+ids.join(',')+')':'&id=eq.00000000-0000-0000-0000-000000000000';
  const [profiles,roles]=await Promise.all([
   db(env,'/rest/v1/customer_profiles?select=id,account_code,first_name,last_name,username,banned_at,ban_reason'+filter),
   db(env,'/rest/v1/staff_roles?select=user_id,role&user_id=in.('+ (ids.length?ids.join(','):'00000000-0000-0000-0000-000000000000') +')')
  ]);
  const byProfile=new Map(profiles.map(p=>[p.id,p])),byRole=new Map(roles.map(r=>[r.user_id,r.role]));
  return response({actorRole:auth.role,page,perPage:50,users:records.map(u=>{
   const p=byProfile.get(u.id)||{},role=byRole.get(u.id)||'customer';
   return {id:u.id,email:u.email,created_at:u.created_at,last_sign_in_at:u.last_sign_in_at,
    email_confirmed:!!u.email_confirmed_at,account_code:p.account_code||null,username:p.username||null,
    full_name:[p.first_name,p.last_name].filter(Boolean).join(' '),
    role,banned:!!(p.banned_at||u.banned_until&&Date.parse(u.banned_until)>Date.now()),
    ban_reason:p.ban_reason||null};
  }),hasMore:records.length===50});
 }catch(error){console.error('Account directory unavailable',error.status||'',error.message);return response({error:'Could not load the account directory'},503);}
}
export async function onRequestPost({request,env}){
 let auth;
 try{
  auth=await requireBakeryManager(env,request);if(auth.error)return auth.error;
  const text=await request.text();
  if(text.length>5000)return response({error:'Request too large'},413);
  const body=JSON.parse(text),action=String(body.action||''),role=auth.role,actor=auth.user.id;
  if(action==='invite'){
   const email=String(body.email||'').trim().toLowerCase();
   if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||email.length>254)return response({error:'Enter a valid email address'},400);
   // Invite users to choose their own password; never invent or email a password.
   const invited=await authAdmin(env,'/invite?redirect_to='+encodeURIComponent(env.SITE_URL+'/#account'),
    {method:'POST',body:{email}});
   const target=invited.user||invited;
   await auditAccount(env,actor,asUuid(target.id),'invite',{email});
   return response({ok:true,message:'Invitation requested. Email delivery depends on the configured Supabase email provider.'});
  }
  const target=asUuid(body.user_id);
  if(!target)return response({error:'Select a valid registered account'},400);
  if(action==='username'){
   const next=String(body.username||'').trim();
   if(!/^[A-Za-z0-9_]{3,30}$/.test(next))
    return response({error:'Username must be 3–30 letters, numbers or underscores'},400);
   const account=await userAndRole(env,target);
   if(!account.user?.id||!account.profile)return response({error:'Customer profile not found'},404);
   if(account.profile.banned_at)return response({error:'Restore this account before changing its username'},409);
   if(account.role==='owner'&&role!=='owner')
    return response({error:'Only the Owner can edit the Owner username'},403);
   if(account.role==='admin'&&role!=='owner'&&actor!==target)
    return response({error:'Only the Owner can edit another Admin username'},403);
   if(account.profile.username===next)return response({ok:true,message:'Username is already set to that value'});
   // PostgreSQL's case-insensitive unique index resolves concurrent changes safely.
   try{
    const rows=await db(env,'/rest/v1/customer_profiles?id=eq.'+target,{
      method:'PATCH',prefer:'return=representation',body:{username:next}
    });
    if(!Array.isArray(rows)||rows.length!==1)return response({error:'Username update could not be verified'},409);
   }catch(error){
    if(/duplicate key|customer_profiles_username_ci_unique/i.test(error.message))
      return response({error:'That username is already taken'},409);
    throw error;
   }
   await auditAccount(env,actor,target,'change_username',{previous:account.profile.username||null,username:next});
   return response({ok:true,message:'Username changed to '+next});
  }
  if(actor===target)return response({error:'You cannot change your own role or account status'},403);
  const targetInfo=await userAndRole(env,target);
  if(!targetInfo.user?.id)return response({error:'Customer account not found'},404);
  if(targetInfo.role==='owner')return response({error:'The bakery Owner account is protected'},403);
  if(role!=='owner' && targetInfo.role==='admin')return response({error:'Only the Owner can manage an Admin account'},403);
  if(action==='role'){
   const next=String(body.role||'');
   if(!['customer','moderator','admin'].includes(next))return response({error:'Invalid role'},400);
   if(next==='admin' && role!=='owner')return response({error:'Only the Owner can grant Admin access'},403);
   if(targetInfo.profile?.banned_at && next!=='customer')return response({error:'Restore this account before granting a role'},409);
   if(next==='customer'){
    await db(env,'/rest/v1/staff_roles?user_id=eq.'+target,{method:'DELETE'});
    await auditAccount(env,actor,target,'remove_role',{previous:targetInfo.role});
   }else{
    await db(env,'/rest/v1/staff_roles',{method:'POST',prefer:'resolution=merge-duplicates,return=representation',
      body:{user_id:target,role:next}});
    await auditAccount(env,actor,target,'grant_role',{previous:targetInfo.role,role:next});
   }
   return response({ok:true,message:'Account role updated'});
  }
  if(action==='ban'){
   const reason=String(body.reason||'').trim().slice(0,300);
   if(reason.length<5)return response({error:'Enter a reason for suspension (at least five characters)'},400);
   if(targetInfo.profile?.banned_at)return response({ok:true,message:'Account is already suspended'});
   await db(env,'/rest/v1/customer_profiles?id=eq.'+target,{method:'PATCH',
    body:{banned_at:new Date().toISOString(),ban_reason:reason}});
   try{
    await authAdmin(env,'/admin/users/'+target,{method:'PUT',body:{ban_duration:'876000h'}});
   }catch(error){
    await db(env,'/rest/v1/customer_profiles?id=eq.'+target,{method:'PATCH',
      body:{banned_at:null,ban_reason:null}});
    throw error;
   }
   await auditAccount(env,actor,target,'ban',{reason});
   return response({ok:true,message:'Account suspended. Existing data is preserved.'});
  }
  if(action==='unban'){
   await authAdmin(env,'/admin/users/'+target,{method:'PUT',body:{ban_duration:'none'}});
   await db(env,'/rest/v1/customer_profiles?id=eq.'+target,
     {method:'PATCH',body:{banned_at:null,ban_reason:null}});
   await auditAccount(env,actor,target,'unban',{});
   return response({ok:true,message:'Account suspension lifted'});
  }
  if(action==='delete'){
   if(role!=='owner')return response({error:'Only the Owner can permanently remove accounts'},403);
   if(body.confirm!=='DELETE' || String(body.confirm_email||'').toLowerCase()!==String(targetInfo.user.email||'').toLowerCase())
    return response({error:'Deletion requires the word DELETE and the exact account email'},400);
   const [orders,messages,reviews]=await Promise.all([
    db(env,'/rest/v1/orders?select=id&customer_id=eq.'+target+'&limit=1'),
    db(env,'/rest/v1/messages?select=id&customer_id=eq.'+target+'&limit=1'),
    db(env,'/rest/v1/reviews?select=id&customer_id=eq.'+target+'&limit=1')]);
   if(orders.length||messages.length||reviews.length)
    return response({error:'This account has order or communication records. Suspend it instead; deletion requires a retention and refund review.'},409);
   await authAdmin(env,'/admin/users/'+target,{method:'DELETE'});
   await auditAccount(env,actor,target,'delete',{email:targetInfo.user.email});
   return response({ok:true,message:'Account deleted from Supabase Auth. Confirm data retention requirements before any further purge.'});
  }
  return response({error:'Unsupported account action'},400);
 }catch(error){console.error('Bakery account action rejected',error.status||'',error.message);
  return failed(error);}
}
