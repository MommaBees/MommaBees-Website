// Owner/Admin media cleanup. Only generated uploads no longer referenced may be removed.
import {config,currentSession,escapeHtml as e} from './api.js';
const API='/api/admin/media-cleanup';
async function call(bucket,remove=null){
 const token=currentSession()?.access_token;
 if(!token)throw Error('Sign in to manage uploaded photographs.');
 const args=remove?{method:'POST',headers:{Authorization:'Bearer '+token,'Origin':location.origin,'Content-Type':'application/json'},
  body:JSON.stringify({bucket,name:remove,confirm:'DELETE UNUSED PHOTO'})}:
  {headers:{Authorization:'Bearer '+token},cache:'no-store'};
 const r=await fetch(API+(remove?'':'?bucket='+encodeURIComponent(bucket)),args);
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(data.error||'Media library temporarily unavailable');
 return data;
}
const buckets=[['product-photos','Product photographs'],['carousel-photos','Homepage carousel'],['past-bakes','Past Bakes Gallery'],['bakery-backgrounds','Website backgrounds']];
export async function showMediaCleanup({showError},bucket='product-photos'){
 const root=document.querySelector('#admin-main');if(!root)return;
 root.innerHTML='<section class="box"><h2>Uploaded Photo Cleanup</h2><p>Checking references…</p></section>';
 try{
  const data=await call(bucket);
  root.innerHTML='<section class="box"><h2>Uploaded Photo Cleanup</h2>'+
   '<p>Uploaded images are retained when a record is archived or a carousel slide is deleted. This manager can permanently delete only unused uploads. Images still referenced by products, showcases, announcements or site settings cannot be deleted here.</p>'+
   '<label class="field">Photo library<select id="media-bucket">'+buckets.map(([v,label])=>'<option value="'+e(v)+'"'+(bucket===v?' selected':'')+'>'+e(label)+'</option>').join('')+'</select></label>'+
   '<p class="small">Showing up to 100 recent uploaded files. Built-in branding and stock images are excluded.</p>'+
   '<div class="table-wrap"><table><thead><tr><th>Uploaded image</th><th>First recorded</th><th>Status</th><th>Action</th></tr></thead><tbody>'+
   (data.items.length?data.items.map(item=>
    '<tr><td><div class="media-cleanup-photo"><img src="'+e((config.supabaseUrl.endsWith('/')?config.supabaseUrl.slice(0,-1):config.supabaseUrl)+'/storage/v1/object/public/'+bucket+'/'+encodeURIComponent(item.name))+'" alt="Uploaded file preview" loading="lazy"><span>'+e(item.name)+'</span></div></td><td>'+e(item.created_at?new Date(item.created_at).toLocaleDateString():'Unknown')+'</td>'+
    '<td>'+(item.referenced?'In use — protected':'Unused — eligible')+'</td>'+
    '<td><button type="button" class="button secondary" data-delete-image="'+e(item.name)+'"'+(item.referenced?' disabled':'')+'>Delete unused image</button></td></tr>'
   ).join(''):'<tr><td colspan="4">No managed photo uploads in this library.</td></tr>')+'</tbody></table></div>'+
   '<p id="media-cleanup-result" role="status"></p></section>';
  root.querySelector('#media-bucket').onchange=event=>showMediaCleanup({showError},event.target.value);
  root.querySelectorAll('[data-delete-image]').forEach(button=>button.onclick=async()=>{
   const name=button.dataset.deleteImage;
   if(!window.confirm('Permanently delete unused uploaded photo '+name+'? This cannot be undone.'))return;
   try{
    const result=await call(bucket,name);
    if(result.auditRecorded===false)showError(Error('Photo deleted but audit record failed. Contact Owner to review.'));
    await showMediaCleanup({showError},bucket);
   }catch(err){showError(err);}
  });
 }catch(err){root.innerHTML='<section class="box"><h2>Uploaded Photo Cleanup</h2><p>Unable to inspect the library. No images were changed.</p></section>';showError(err);}
}
