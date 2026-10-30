// Owner/Admin-only exact lookup; never allow client access to auth.users or a raw UUID requirement.
import {response,rpc} from '../../_lib/db.js';
import {requireBakeryManager} from '../../_lib/bakery-admin.js';

export async function onRequestPost({request,env}){
 try{
  const authorized=await requireBakeryManager(env,request);
  if(authorized.error)return authorized.error;
  const siteOrigin=new URL(env.SITE_URL).origin;
  if(request.headers.get('Origin')!==siteOrigin)return response({error:'Invalid request origin'},403);
  const input=await request.text();
  if(input.length>1024)return response({error:'Request is too large'},413);
  const body=JSON.parse(input);
  const lookup=String(body?.lookup||'').trim();
  if(lookup.length<3||lookup.length>254)return response({error:'Enter a valid username or email address'},400);
  const user=await rpc(env,'mommabees_resolve_admin_recipient',{p_lookup:lookup});
  if(!user?.id)return response({error:'No registered customer matches that username or email'},404);
  if(user.banned)return response({error:'This customer account is suspended'},409);
  return response({id:user.id,username:user.username||'',email:user.email||'',email_verified:user.email_verified===true,marketing_opt_in:user.marketing_opt_in===true});
 }catch(error){
  return response({error:error?.message==='Unexpected end of JSON input'?'Invalid lookup request':'Recipient lookup failed'},400);
 }
}
