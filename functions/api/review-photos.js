// Public approved-photo URLs for an already published customer review.
// Unapproved photos and photos attached to unpublished reviews remain private.
import {db,response} from '../_lib/db.js';
import {asUuid} from '../_lib/bakery-admin.js';
const pathSafe=/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i;
export async function onRequestGet({request,env}){
 try{
  const id=asUuid(new URL(request.url).searchParams.get('review_id'));
  if(!id)return response({error:'Invalid review'},400);
  const reviews=await db(env,'/rest/v1/reviews?select=id,approved&id=eq.'+id);
  if(reviews.length!==1||reviews[0].approved!==true)return response({photos:[]});
  const entries=await db(env,'/rest/v1/review_photos?select=id,storage_path&approved=eq.true&review_id=eq.'+id+'&limit=3');
  const photos=[];
  for(const p of entries){
   if(!pathSafe.test(p.storage_path))continue;
   const url=env.SUPABASE_URL.replace(/\/$/,'')+'/storage/v1/object/sign/review-photos/'+p.storage_path.split('/').map(encodeURIComponent).join('/');
   const key=env.SUPABASE_SECRET_KEY;
   const headers={apikey:key,'Content-Type':'application/json'};
   if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
   const signed=await fetch(url,{method:'POST',headers,body:JSON.stringify({expiresIn:300})});
   if(!signed.ok)continue;
   const body=await signed.json().catch(()=>({}));
   if(body.signedURL&&body.signedURL.startsWith('/object/sign/review-photos/')){
    photos.push({id:p.id,url:env.SUPABASE_URL.replace(/\/$/,'')+'/storage/v1'+body.signedURL});
   }
  }
  return response({photos});
 }catch{return response({error:'Review photographs temporarily unavailable'},503);}
}
