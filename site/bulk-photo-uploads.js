// Bulk uploads grouped under one Admin tabbed workbench.
// Source images must be owned or authorized for public display; Owner/Admin controls remain unchanged.
import {list,update,add,upload,escapeHtml as e} from './api.js';
import {harvestUploadMatches} from './harvest-photo-import.js';
import {pastBakeName} from './past-bakes.js';

export async function showBulkPhotoUploads({showError}){
 const root=document.querySelector('#admin-main');
 if(!root)return;
 root.innerHTML='<section class="box"><h2>Bulk Photo Uploads</h2><p>Loading photo libraries…</p></section>';
 let showcases=[];
 try{showcases=await list('store_showcase_items',{limit:500});}
 catch(err){showError(err);}
 root.innerHTML='<section class="box bulk-photo-workbench">'+
  '<h2>Bulk Photo Uploads</h2>'+
  '<div class="bulk-upload-tabs" role="tablist" aria-label="Photo upload type">'+
   '<button type="button" class="bulk-upload-tab" role="tab" id="bulk-harvest-tab" aria-controls="bulk-harvest-panel" aria-selected="true" data-upload-tab="harvest">Upload Homestand Harvest Photos</button>'+
   '<button type="button" class="bulk-upload-tab" role="tab" id="bulk-past-tab" aria-controls="bulk-past-panel" aria-selected="false" data-upload-tab="past">Bulk Upload Past Baking Photos</button></div>'+
  '<section id="bulk-harvest-panel" role="tabpanel" aria-labelledby="bulk-harvest-tab" data-upload-panel="harvest">'+
   '<p>Select converted photographs together. Matching Homestand vegetables are updated automatically.</p>'+
   '<label class="field" for="harvest-upload-files">Harvest photographs (WebP, JPG, PNG · maximum 5 MB each)</label>'+
   '<input type="file" id="harvest-upload-files" accept="image/webp,image/jpeg,image/png" multiple>'+
   '<button class="button secondary" type="button" id="harvest-upload-button">Upload matching harvest photos</button>'+
   '<p id="harvest-upload-status" role="status" aria-live="polite"></p></section>'+
  '<section id="bulk-past-panel" role="tabpanel" aria-labelledby="bulk-past-tab" data-upload-panel="past" hidden>'+
   '<p>Select original bakery photographs together. They appear in the Past Bakes Gallery only, without prices or purchase links. Titles can be edited afterward.</p>'+
   '<label class="field" for="past-bakes-files">Photographs (JPG, PNG, WebP · maximum 5 MB each)</label>'+
   '<input type="file" id="past-bakes-files" accept="image/jpeg,image/png,image/webp" multiple>'+
   '<button type="button" class="button secondary" id="past-bakes-bulk">Upload selected gallery photographs</button>'+
   '<p id="past-bakes-status" role="status" aria-live="polite"></p></section>'+
  '</section>';
 const buttons=[...root.querySelectorAll('[data-upload-tab]')];
 const selectTab=tab=>{
  buttons.forEach(button=>{const active=button.dataset.uploadTab===tab;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
  root.querySelectorAll('[data-upload-panel]').forEach(panel=>panel.hidden=panel.dataset.uploadPanel!==tab);
 };
 buttons.forEach(button=>button.onclick=()=>selectTab(button.dataset.uploadTab));
 root.querySelector('#harvest-upload-button').onclick=async()=>{
  const button=root.querySelector('#harvest-upload-button'),status=root.querySelector('#harvest-upload-status');
  const files=[...root.querySelector('#harvest-upload-files').files];
  if(!files.length){status.textContent='Select harvest photographs first.';return;}
  if(files.length>30){status.textContent='Choose no more than 30 photographs at once.';return;}
  const {matched,skipped}=harvestUploadMatches(files,showcases);
  if(!matched.length){status.textContent='No matching Homestand vegetables were found. Name files to match the vegetable showcases.';return;}
  if(!window.confirm('Replace '+matched.length+' matching Homestand showcase photographs? The existing prices and products will not change.'))return;
  button.disabled=true;let count=0;const failed=[];
  try{
   for(const {file,item} of matched){
    status.textContent='Uploading '+(count+1)+' of '+matched.length+': '+file.name;
    try{
     const img=await upload('product-photos',file);
     if(!img?.url)throw Error('Storage did not return a URL');
     await update('store_showcase_items',item.id,{photo_url:img.url});count++;
    }catch(err){failed.push(file.name+': '+err.message);}
   }
   showcases=await list('store_showcase_items',{limit:500});
   status.textContent=count+' photo(s) updated.'+(skipped.length?' Skipped: '+skipped.join(', ')+'.':'')+(failed.length?' Failed: '+failed.join('; '):'');
  }catch(err){showError(err);}finally{button.disabled=false;}
 };
 root.querySelector('#past-bakes-bulk').onclick=async()=>{
  const button=root.querySelector('#past-bakes-bulk'),status=root.querySelector('#past-bakes-status');
  const files=[...root.querySelector('#past-bakes-files').files];
  if(!files.length){status.textContent='Choose photographs first.';return;}
  if(files.length>100){status.textContent='Choose 100 or fewer photographs per batch.';return;}
  if(!window.confirm('Publish '+files.length+' photographs to Past Bakes? No sellable products or prices will be created.'))return;
  button.disabled=true;let done=0;const failed=[];
  try{
   for(const file of files){
    status.textContent='Uploading '+(done+1)+' of '+files.length+': '+file.name;
    try{
     const img=await upload('past-bakes',file);
     if(!img?.url)throw Error('Storage did not return a URL');
     await add('past_bakes',{title:pastBakeName(file.name),description:'An earlier bakery creation — gallery display only.',image_url:img.url,sort_order:done+1,published:true});
     done++;
    }catch(err){failed.push(file.name+': '+err.message);}
   }
   status.textContent=done+' gallery photo(s) uploaded.'+(failed.length?' Review failed photos before retrying: '+failed.join('; '):'');
  }catch(err){showError(err);}finally{button.disabled=false;}
 };
}
