// Manager-only removal of UNREFERENCED uploaded photos; never delete built-in assets.
// Actual object deletion uses Supabase Storage API (not SQL against storage.objects).
import {response,db} from '../../_lib/db.js';
import {requireBakeryManager,auditAccount} from '../../_lib/bakery-admin.js';
const BUCKETS=Object.freeze(['product-photos','past-bakes','carousel-photos','bakery-backgrounds']);
const UPLOAD_NAME=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i;
const SOURCES=Object.freeze([
 ['products','photo_url'],['product_photos','url'],['store_showcase_items','photo_url'],
 ['categories','photo_url'],['subcategories','photo_url'],['past_bakes','image_url'],
 ['home_carousel_slides','image_url'],['site_settings','hero_url,header_url,background_image_url'],
 ['announcements','image_url']
]);
const pathMatch=(url,bucket,name)=>{
 if(typeof url!=='string'||!url)return false;
 const suffix='/storage/v1/object/public/'+bucket+'/'+name;
 try{return decodeURIComponent(new URL(url).pathname).endsWith(suffix);}
 catch{return url.endsWith(suffix);}
};
async function usedImages(env,bucket,items){
 const rows=await Promise.all(SOURCES.map(async([table,cols])=>{
  const items=await db(env,'/rest/v1/'+table+'?select='+cols+'&limit=5000');
  if(!Array.isArray(items))throw Error('Image references could not be verified');
  if(items.length>=5000)throw Error('Reference review is incomplete: too many rows');
  return items.flatMap(row=>cols.split(',').map(k=>row[k]).filter(Boolean));
 }));
 const refs=rows.flat();
 return new Map(items.map(item=>[item,refs.some(src=>pathMatch(src,bucket,item))]));
}
async function storageFetch(env,path,{method='GET',body}={}){
 const key=env.SUPABASE_SECRET_KEY;
 const headers={apikey:key};
 if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
 if(body!==undefined)headers['Content-Type']='application/json';
 const r=await fetch(env.SUPABASE_URL.replace(/\/$/,'')+'/storage/v1'+path,
  {method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error('Storage refused the requested operation ('+r.status+').');
 return data;
}
async function authorize(env,request){
 const auth=await requireBakeryManager(env,request);return auth.error?{error:auth.error}:{auth};
}
export async function onRequestGet({request,env}){
 try{
  const a=await authorize(env,request);if(a.error)return a.error;
  const bucket=new URL(request.url).searchParams.get('bucket')||'product-photos';
  if(!BUCKETS.includes(bucket))return response({error:'Unsupported photo library'},400);
  const items=await storageFetch(env,'/object/list/'+bucket,{method:'POST',body:{prefix:'',limit:100,offset:0,sortBy:{column:'created_at',order:'desc'}}});
  if(!Array.isArray(items))throw Error('Storage did not provide an object list');
  const names=items.map(x=>x.name).filter(name=>UPLOAD_NAME.test(name));
  const refs=await usedImages(env,bucket,names);
  return response({bucket,items:items.filter(x=>UPLOAD_NAME.test(x.name)).map(x=>({name:x.name,created_at:x.created_at||null,referenced:refs.get(x.name)===true})),limit:100});
 }catch(error){return response({error:error.message||'Unable to list uploaded photos'},503);}
}
export async function onRequestPost({request,env}){
 try{
  const a=await authorize(env,request);if(a.error)return a.error;
  if(request.headers.get('Origin')!==new URL(env.SITE_URL).origin)return response({error:'Invalid request origin'},403);
  if(Number(request.headers.get('content-length')||0)>512)return response({error:'Request too large'},413);
  const body=await request.json(),bucket=String(body.bucket||''),name=String(body.name||'');
  if(!BUCKETS.includes(bucket)||!UPLOAD_NAME.test(name)||body.confirm!=='DELETE UNUSED PHOTO')
   return response({error:'Invalid photo deletion request'},400);
  const refs=await usedImages(env,bucket,[name]);
  if(refs.get(name)!==false)return response({error:'This image is still used on the website. Remove its references first.'},409);
  await storageFetch(env,'/object/'+bucket+'/'+encodeURIComponent(name),{method:'DELETE'});
  let auditRecorded=true;
  try{await auditAccount(env,a.auth.user.id,null,'unreferenced_photo_deleted',{bucket,name});}
  catch{auditRecorded=false;}
  return response({deleted:true,bucket,name,auditRecorded});
 }catch(error){return response({error:error.message||'Unable to delete uploaded photo'},503);}
}
