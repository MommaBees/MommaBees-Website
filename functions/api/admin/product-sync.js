// Owner/Admin initiated after Supabase save; retries are safe. Never creates LIVE Stripe objects.
import {response,db} from '../../_lib/db.js';
import {requireBakeryManager,asUuid} from '../../_lib/bakery-admin.js';
import {stripeTestCall,verifyMommaBeesTestAccount,safeStripePicture,stripeFingerprint,testStripePriceLookup} from '../../_lib/product-stripe-test.js';
const savedQuery='?select=product_id,stripe_product_id,stripe_price_id,synced_amount_cents,synced_fingerprint,status,error_message,last_synced_at';
const table='/rest/v1/product_stripe_test_sync';
const productFields='id,name,description,price_cents,unit,product_type,department,photo_url,published,category_id,subcategory_id,variety_id';
const persist=(env,values)=>db(env,table,{method:'POST',prefer:'resolution=merge-duplicates,return=representation',body:values});
const errorInfo=err=>String(err?.message||'Could not sync product to Stripe TEST').slice(0,260);
async function getOne(env,id){
 const rows=await db(env,table+savedQuery+'&product_id=eq.'+encodeURIComponent(id));
 return rows[0]||null;
}
async function sync(env,p){
 const id=p.id;
 if(!Number.isInteger(p.price_cents)||p.price_cents<50||p.price_cents>99999999)
  throw new Error('Set a USD product price of at least $0.50 before Stripe TEST synchronization.');
 const current=await getOne(env,id);
 const fingerprint=stripeFingerprint(p);
 await verifyMommaBeesTestAccount(env);
 if(current?.status==='synced'&&current.synced_fingerprint===fingerprint)return {status:'synced',stripe_product_id:current.stripe_product_id,stripe_price_id:current.stripe_price_id,unchanged:true};
 const picture=safeStripePicture(env,p.photo_url);
 let stripeProduct=current?.stripe_product_id||null;
 try{
  if(!stripeProduct){
   // Stripe Search recovers an earlier creation after a lost Supabase write.
   const lookup=await stripeTestCall(env,'GET','products/search?'+new URLSearchParams({
    query:"metadata['mommabee_product_id']:'"+id+"'",
    limit:'2'
   }));
   stripeProduct=lookup.data?.[0]?.id||null;
  }
  const args={
   name:p.name,
   description:String(p.description||'').slice(0,500),
   active:p.published===true?'true':'false',
   'metadata[mommabee_product_id]':id,
   'metadata[project]':'MommaBeesBakery',
   'metadata[department]':p.department||'bakery',
   'metadata[category_id]':p.category_id||'',
   'metadata[subcategory_id]':p.subcategory_id||'',
   'metadata[variety_id]':p.variety_id||'',
   'metadata[unit]':p.unit||'each'
  };
  if(picture)args['images[0]']=picture;
  const product=stripeProduct
    ?await stripeTestCall(env,'POST','products/'+encodeURIComponent(stripeProduct),args,'product-update-'+id+'-'+await simpleHash(fingerprint))
    :await stripeTestCall(env,'POST','products',args,'product-create-'+id);
  stripeProduct=product.id;
  if(!/^prod_[A-Za-z0-9]+$/.test(stripeProduct))throw new Error('Stripe returned an invalid TEST product identifier.');
  // Save remote product identity before price creation so retries cannot orphan it.
  await persist(env,{product_id:id,stripe_product_id:stripeProduct,status:'pending',updated_at:new Date().toISOString()});
  const lookupKey=testStripePriceLookup(p);
  let priceId=current?.stripe_product_id===stripeProduct&&current?.synced_amount_cents===p.price_cents?current.stripe_price_id:null;
  if(!priceId){
   const matches=await stripeTestCall(env,'GET','prices?'+new URLSearchParams({'lookup_keys[0]':lookupKey,limit:'5'}));
   priceId=matches.data?.find(row=>row.product===stripeProduct&&row.currency==='usd'&&row.unit_amount===p.price_cents&&row.type==='one_time')?.id||null;
  }
  if(!priceId){
   const price=await stripeTestCall(env,'POST','prices',{
    product:stripeProduct,currency:'usd',unit_amount:String(p.price_cents),lookup_key:lookupKey,
    'metadata[mommabee_product_id]':id,
    'metadata[unit]':p.unit||'each'
   },'price-create-'+id+'-'+p.price_cents);
   priceId=price.id;
  }
  if(!/^price_[A-Za-z0-9]+$/.test(priceId))throw new Error('Stripe returned an invalid TEST price identifier.');
  await stripeTestCall(env,'POST','products/'+encodeURIComponent(stripeProduct),{
   default_price:priceId
  },'set-default-price-'+id+'-'+priceId);
  // Fresh reads prevent reporting an older save as synchronized after an intervening edit.
  const fresh=(await db(env,'/rest/v1/products?select='+productFields+'&id=eq.'+id))[0];
  const freshFingerprint=fresh?stripeFingerprint(fresh):null;
  const unchanged=freshFingerprint===fingerprint;
  const state={product_id:id,stripe_product_id:stripeProduct,stripe_price_id:priceId,synced_amount_cents:p.price_cents,
   synced_fingerprint:unchanged?fingerprint:null,status:unchanged?'synced':'pending',error_message:null,
   last_synced_at:unchanged?new Date().toISOString():null,updated_at:new Date().toISOString()};
  await persist(env,state);
  return {status:state.status,stripe_product_id:stripeProduct,stripe_price_id:priceId,unchanged:!unchanged};
 }catch(err){
  await persist(env,{product_id:id,stripe_product_id:stripeProduct||null,status:'error',error_message:errorInfo(err),updated_at:new Date().toISOString()}).catch(()=>{});
  throw err;
 }
}
async function simpleHash(value){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return [...new Uint8Array(digest)].slice(0,12).map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function onRequestGet({request,env}){
 try{
  const auth=await requireBakeryManager(env,request);if(auth.error)return auth.error;
  const url=new URL(request.url);
  const id=asUuid(url.searchParams.get('product_id'));
  if(url.searchParams.has('product_id')&&!id)return response({error:'Invalid product ID'},400);
  const records=await db(env,table+savedQuery+(id?'&product_id=eq.'+id:'')+'&limit=500');
  return response({environment:'MommaBeesBakery TEST',records});
 }catch(err){console.error('Product sync status error:',err.message);return response({error:'Unable to retrieve product synchronization status'},503);}
}
export async function onRequestPost({request,env}){
 try{
  const auth=await requireBakeryManager(env,request);if(auth.error)return auth.error;
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return response({error:'JSON is required'},415);
  const input=await request.json();
  const id=asUuid(input?.product_id);if(!id)return response({error:'Valid saved product ID required'},400);
  const result=await db(env,'/rest/v1/products?select='+productFields+'&id=eq.'+id);
  const product=result[0];if(!product)return response({error:'Product record not found'},404);
  const synchronized=await sync(env,product);
  return response({ok:true,environment:'MommaBeesBakery TEST',...synchronized});
 }catch(err){
  console.error('TEST product sync rejected:',err?.message);
  const status=/Stripe TEST key|account mismatch/i.test(err?.message||'')?503:409;
  return response({error:errorInfo(err),environment:'MommaBeesBakery TEST',synced:false},status);
 }
}
