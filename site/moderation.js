import {currentSession,list,signedImage,escapeHtml as e,safePhoto as photo} from './api.js';
export async function moderateAction(data){
 const token=currentSession()?.access_token;
 if(!token)throw Error('Sign in again to moderate');
 const r=await fetch('/api/admin/moderate',{method:'POST',headers:{
  Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(data)});
 const json=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(json.error||'Moderation request failed');
 return json;
}
export async function moderatorReviews({showError}){
 const main=document.querySelector('#admin-main');main.innerHTML='<div class="box">Loading customer reviews…</div>';
 try{
  const [reviews,images]=await Promise.all([
   list('reviews',{order:'created_at.desc',limit:'200'}),
   list('review_photos',{limit:'500'})
  ]);
  const pics=new Map();
  await Promise.all(images.map(async p=>{
   try{const url=await signedImage('review-photos',p.storage_path);if(url)(pics.get(p.review_id)||(pics.set(p.review_id,[]),pics.get(p.review_id))).push({id:p.id,url,approved:p.approved===true});}
   catch{/* no image access */}
  }));
  main.innerHTML='<section class="box"><h2>Review Moderation</h2>'+
   '<p class="small muted">Review customer feedback and approve only suitable content. Changes are checked by the server.</p>'+
   (reviews.map(r=>'<article class="box" style="margin:12px 0"><p><strong>'+e(r.title||'Customer review')+
   '</strong> · '+(r.approved?'Published':'Awaiting approval')+'</p>'+
   '<p>'+e(r.body||r.comment||r.text||'')+'</p>'+
   '<div class="message-images">'+(pics.get(r.id)||[]).map(p=>'<div class="review-photo-moderation"><a target="_blank" rel="noopener noreferrer" href="'+photo(p.url)+'"><img alt="Customer review photograph" src="'+photo(p.url)+'"></a><p class="small">'+(p.approved?'Photo approved':'Photo private — awaiting approval')+'</p><button class="button secondary" type="button" data-photo-decision="'+e(p.id)+'" data-photo-approved="'+(p.approved?'false':'true')+'">'+(p.approved?'Unpublish photo':'Approve photo')+'</button></div>').join('')+'</div>'+
   '<div class="actions"><button class="button secondary" data-decision="'+e(r.id)+'" data-approved="'+(r.approved?'false':'true')+'">'+
   (r.approved?'Unpublish':'Approve Review')+'</button></div></article>').join('')||'<p>No reviews submitted.</p>')+'</section>';
  main.querySelectorAll('[data-photo-decision]').forEach(b=>b.onclick=async()=>{
   const approved=b.dataset.photoApproved==='true';
   if(!window.confirm(approved?'Publish this customer photograph with its approved review?':'Withdraw this customer photograph from public view?'))return;
   try{
    await moderateAction({action:'review_photo',id:b.dataset.photoDecision,approved});
    await moderatorReviews({showError});
   }catch(error){showError(error);}
  });
  main.querySelectorAll('[data-decision]').forEach(b=>b.onclick=async()=>{
   try{const approved=b.dataset.approved==='true';
    if(!window.confirm(approved?'Approve this customer review?':'Unpublish this customer review?'))return;
    await moderateAction({action:'review',id:b.dataset.decision,approved});
    await moderatorReviews({showError});
   }catch(x){showError(x);}
  });
 }catch(x){main.innerHTML='<div class="box notice error">'+e(x.message)+'</div>';}
}
