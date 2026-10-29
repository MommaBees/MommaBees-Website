// MBB-CATALOG-039: HTTPS-only Stripe TEST product catalog adapter.
import {runtimeCredential} from './runtime-credentials.js';
// Hard account binding prevents accidental use of any stock-market Stripe account.
export const MOMMABEES_STRIPE_TEST_ACCOUNT='acct_1UUtoDJF02bajTTM';
export function testStripeKeyAllowed(key){
 return /^(sk_test_|rk_test_)[A-Za-z0-9_]+$/.test(String(key||''));
}
function idempotency(s){
 return 'mbee-'+String(s).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,210);
}
export async function stripeTestCall(env,method,path,fields=null,idempotencySuffix=null){
 const key=await runtimeCredential(env,'STRIPE_SECRET_KEY','test');
 if(!testStripeKeyAllowed(key))throw new Error('MommaBees Stripe TEST key is not configured. LIVE keys are prohibited for catalog sync.');
 const form=new URLSearchParams();
 if(fields)for(const [k,v] of Object.entries(fields))if(v!==null&&v!==undefined)form.append(k,String(v));
 const headers={'Authorization':'Bearer '+key};
 if(fields)headers['Content-Type']='application/x-www-form-urlencoded';
 if(idempotencySuffix)headers['Idempotency-Key']=idempotency(idempotencySuffix);
 const response=await fetch('https://api.stripe.com/v1/'+path,{method,headers,body:fields?form:undefined});
 const value=await response.json().catch(()=>({}));
 if(!response.ok){
  // Avoid reflecting Stripe request headers, keys, or customer metadata.
  const problem=new Error('Stripe TEST catalog request failed ('+response.status+'): '+String(value?.error?.code||value?.error?.type||'stripe_error'));
  problem.status=response.status;
  throw problem;
 }
 return value;
}
export async function verifyMommaBeesTestAccount(env){
 const account=await stripeTestCall(env,'GET','account');
 if(account.id!==MOMMABEES_STRIPE_TEST_ACCOUNT)throw new Error('Stripe account mismatch: only MommaBeesBakery TEST account is permitted.');
 return account.id;
}
export const safeStripePicture=(env,input)=>{
 if(!input)return null;
 try{
  const image=new URL(input);
  const origin=new URL(env.SUPABASE_URL);
  if(image.protocol==='https:'&&image.origin===origin.origin&&image.pathname.startsWith('/storage/v1/object/public/'))
   return image.toString();
 }catch{}
 return null;
};
export const stripeFingerprint=(product)=>JSON.stringify({
 name:String(product.name||'').trim(),
 description:String(product.description||'').trim(),
 price:product.price_cents,
 unit:product.unit,
 type:product.product_type,
 published:product.published===true,
 image:product.photo_url||null,
 department:product.department||'bakery',
 category:product.category_id||null,
 subcategory:product.subcategory_id||null,
 variety:product.variety_id||null
});
export const testStripePriceLookup=(product)=>'mbee_'+product.id.replaceAll('-','')+'_'+Number(product.price_cents);
