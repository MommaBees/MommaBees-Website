// Password reset tokens are ephemeral in memory, never copied to the member's saved session.
import {config,isConfigured} from './api.js';
let recoveryAccessToken=null;
let recoveryError='';
export function capturePasswordRecoveryRedirect(browser=window){
 const fragment=String(browser.location.hash||'').replace(/^#/,'');
 if(!/(^|&)type=recovery(&|$)/.test(fragment)&&!/(^|&)error_code=/.test(fragment))return false;
 const values=new URLSearchParams(fragment);
 if(values.get('type')==='recovery'&&values.get('access_token')){
  recoveryAccessToken=values.get('access_token');recoveryError='';
  // Sanitizing before rendering avoids embedding credentials in navigation or links.
  browser.history.replaceState(null,'',browser.location.pathname+'#account/reset-password');
  return true;
 }
 recoveryAccessToken=null;
 recoveryError='This recovery link is invalid or has expired. Request a new password reset email.';
 browser.history.replaceState(null,'',browser.location.pathname+'#account/forgot-password');
 return true;
}
export function pendingRecovery(){return Boolean(recoveryAccessToken);}
export function recoveryLinkError(){const result=recoveryError;recoveryError='';return result;}
export function clearRecovery(){recoveryAccessToken=null;recoveryError='';}
export async function requestRecoveryEmail(email,captchaToken){
 const result=await fetch('/api/auth/recover',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email:String(email||'').trim(),captcha_token:captchaToken})});
 const data=await result.json().catch(()=>({}));
 if(!result.ok)throw Error(data.error||'Unable to request a password reset right now.');
 return data.message||'If your email has an account, reset instructions will be sent.';
}
export async function setRecoveryPassword(password){
 if(!recoveryAccessToken)throw Error('Recovery link missing or expired. Request another email.');
 if(!isConfigured())throw Error('Account recovery is not configured.');
 if(typeof password!=='string'||password.length<8||password.length>128)
  throw Error('Enter a password between 8 and 128 characters.');
 const accessToken=recoveryAccessToken;
 const result=await fetch(config.supabaseUrl+'/auth/v1/user',{method:'PUT',
  headers:{apikey:config.supabasePublishableKey,Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},
  body:JSON.stringify({password})});
 const data=await result.json().catch(()=>({}));
 if(!result.ok){
  if(result.status===401||result.status===403){clearRecovery();throw Error('This reset link has expired. Request another reset email.');}
  throw Error(data.error_description||data.msg||data.message||'Password update failed.');
 }
 // Do not sign the user in through the temporary recovery authorization.
 clearRecovery();
 await fetch(config.supabaseUrl+'/auth/v1/logout',{method:'POST',
  headers:{apikey:config.supabasePublishableKey,Authorization:'Bearer '+accessToken}}).catch(()=>{});
 return true;
}
