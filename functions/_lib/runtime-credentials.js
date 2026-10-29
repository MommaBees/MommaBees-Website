// Server-only: Supabase Vault holds Owner-rotated runtime credentials.
// Bootstrap env.SUPABASE_SECRET_KEY is kept outside the Vault to prevent lockout.
import {db} from './db.js';
export const RUNTIME_CREDENTIALS=Object.freeze({
 STRIPE_SECRET_KEY:['test','live'],
 STRIPE_WEBHOOK_SECRET:['test','live'],
 TURNSTILE_SECRET_KEY:['shared']
});
export function validCredentialSlot(name,environment){
 return Array.isArray(RUNTIME_CREDENTIALS[name])&&RUNTIME_CREDENTIALS[name].includes(environment);
}
export async function runtimeCredential(env,name,environment){
 if(!validCredentialSlot(name,environment))throw Error('Unsupported runtime credential');
 const value=await db(env,'/rest/v1/rpc/mommabees_credential_read',{
  method:'POST',body:{p_name:name,p_environment:environment}
 });
 if(typeof value==='string'&&value.length)return value;
 if(name==='STRIPE_SECRET_KEY'){
  const fallback=environment==='test'?env.STRIPE_TEST_SECRET_KEY||env.STRIPE_SECRET_KEY:env.STRIPE_LIVE_SECRET_KEY||env.STRIPE_SECRET_KEY;
  return (environment==='test'?/^sk_test_/.test(fallback||''):/^sk_live_/.test(fallback||''))?fallback:null;
 }
 if(name==='STRIPE_WEBHOOK_SECRET'){
  const current=env.STRIPE_PAYMENT_MODE==='live'||(!env.STRIPE_PAYMENT_MODE&&/^sk_live_/.test(env.STRIPE_SECRET_KEY||''))?'live':'test';
  return (environment==='test'?env.STRIPE_TEST_WEBHOOK_SECRET:env.STRIPE_LIVE_WEBHOOK_SECRET)||
   (current===environment?env.STRIPE_WEBHOOK_SECRET:null)||null;
 }
 return env.TURNSTILE_SECRET_KEY||null;
}
