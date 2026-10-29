// Owner-only automatic credential activation switch.
// Default disabled, manual password-confirmed replacements remain available.
import {response} from '../../_lib/db.js';
import {requireBakeryManager,auditAccount} from '../../_lib/bakery-admin.js';
import {confirmOwnerPassword} from './credentials.js';
import {automaticRotationSetting} from '../../_lib/credential-rotation.js';
export async function onRequestPost({request,env}){
 try{
  const expected=new URL(env.SITE_URL).origin;
  if(new URL(request.url).origin!==expected||request.headers.get('Origin')!==expected)
   return response({error:'Invalid request origin'},403);
  if(Number(request.headers.get('content-length')||0)>4096)return response({error:'Invalid request size'},413);
  const a=await requireBakeryManager(env,request);
  if(a.error)return a.error;
  if(a.role!=='owner')return response({error:'Owner-only setting'},403);
  const data=await request.json();
  if(typeof data.enabled!=='boolean')return response({error:'Select Enabled or Disabled'},400);
  if(!await confirmOwnerPassword(env,a.user,data.owner_password,data.captcha_token))
   return response({error:'Owner password or human verification was unsuccessful'},403);
  const saved=await automaticRotationSetting(env,data.enabled,a.user.id);
  await auditAccount(env,a.user.id,null,'owner_auto_rotation_setting_changed',
   {enabled:saved.enabled,changed_at:saved.updated_at}).catch(()=>{});
  return response({ok:true,enabled:saved.enabled,updated_at:saved.updated_at,
   message:saved.enabled?'Automatic activation enabled for verified staged webhook keys.':
   'Automatic activation disabled. You can still manually update credentials.'});
 }catch{
  return response({error:'Unable to update automatic rotation setting'},503);
 }
}
