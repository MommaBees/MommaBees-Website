import {config,currentUser,list,update,upload,escapeHtml as e} from './api.js';
import {BACKGROUND_OPTIONS,backgroundChoice,verifiedBackgroundUrl,applyBakeryBackground} from './background.js';
export async function showBackgroundEditor(ctx){
 const root=document.querySelector('#admin-main');
 if(!root)return;
 if(!['owner','admin'].includes(ctx.role)||!currentUser()){
  root.textContent='Only Owner/Admin accounts may change site backgrounds.';return;
 }
 const settings=(await list('site_settings',{id:'eq.1',limit:1}))[0];
 if(!settings)throw Error('Website settings could not be loaded');
 const initial={background_enabled:true,background_style:'prairie_doors',
  background_image_url:null,background_position:'center',
  background_overlay_percent:76,background_solid_color:'#f8efdf',...settings};
 const options=BACKGROUND_OPTIONS.map(p=>'<option value="'+e(p.value)+'"'+
  (initial.background_style===p.value?' selected':'')+'>'+e(p.label)+'</option>').join('');
 const positions=['center','top','bottom','left','right'].map(p=>
  '<option value="'+p+'"'+(initial.background_position===p?' selected':'')+'>'+
  p[0].toUpperCase()+p.slice(1)+'</option>').join('');
 root.innerHTML='<section class="box background-admin">'+
  '<div class="eyebrow">Missouri prairie farmhouse</div><h2>Website Background</h2>'+
  '<p class="muted">Style the public website with wooden barn doors, aged timber, farmhouse linen, warm cream, or your own photograph.</p>'+
  '<form id="website-background-form">'+
  '<div class="field"><label><input type="checkbox" id="bg-enabled"'+
  (initial.background_enabled?' checked':'')+'> Enable the website background</label></div>'+
  '<div class="field"><label for="bg-style">Background design</label><select id="bg-style">'+options+'</select></div>'+
  '<div class="field"><label for="bg-photo-file">Upload a background photo (JPG, PNG or WebP; up to 5 MB)</label>'+
  '<input type="file" id="bg-photo-file" accept="image/jpeg,image/png,image/webp">'+
  '<p class="small muted">Choose a Missouri barn, rustic wooden doors, prairie scenery or another photograph you have permission to publish. Photos are uploaded only when saved.</p>'+
  '<button type="button" class="button secondary" id="bg-clear-photo">Remove selected photo</button></div>'+
  '<div class="field"><label for="bg-position">Photo position</label><select id="bg-position">'+positions+'</select></div>'+
  '<div class="field"><label for="bg-overlay">Photo lightening for readable text: <strong id="bg-overlay-value"></strong></label>'+
  '<input id="bg-overlay" type="range" min="30" max="95" step="5" value="'+Number(initial.background_overlay_percent||76)+'"></div>'+
  '<div class="field"><label for="bg-color">Plain background color</label><input id="bg-color" type="color" value="'+
  (/^#[0-9a-f]{6}$/i.test(initial.background_solid_color||'')?e(initial.background_solid_color):'#f8efdf')+'"></div>'+
  '<h3>Preview before publishing</h3>'+
  '<div id="bg-preview" class="site-background-preview" role="img" aria-label="Preview of the selected rustic country background">'+
  '<div class="preview-card">Mamma Bee’s Bakery<div class="small">Rooted in Faith. Made with Love. Shared with Joy.</div></div></div>'+
  '<p id="bg-preview-status" class="small muted" aria-live="polite"></p>'+
  '<div class="site-background-tools">'+
  '<button type="submit" class="button" id="bg-save">Save Background</button>'+
  '<button type="button" class="button secondary" id="bg-restore">Restore Missouri Barn Doors</button>'+
  '<button type="button" class="button secondary" id="bg-disable">Disable Background</button></div>'+
  '<p id="bg-save-status" aria-live="polite"></p></form></section>';
 const $=id=>root.querySelector('#'+id);
 const style=$('bg-style'),position=$('bg-position'),shade=$('bg-overlay'),
  color=$('bg-color'),enabled=$('bg-enabled'),file=$('bg-photo-file'),
  preview=$('bg-preview'),status=$('bg-save-status'),previewStatus=$('bg-preview-status');
 let existingUrl=verifiedBackgroundUrl(initial.background_image_url,config.supabaseUrl);
 let localBlob='';
 const forgetBlob=()=>{if(localBlob){URL.revokeObjectURL(localBlob);localBlob='';}};
 function showPreview(){
  const option=enabled.checked?backgroundChoice(style.value):'solid';
  const current=option==='photo'?(localBlob||existingUrl):'';
  preview.dataset.previewStyle=option;
  preview.style.setProperty('--preview-overlay',String(Number(shade.value)/100));
  preview.style.setProperty('--preview-solid',color.value);
  preview.style.setProperty('--preview-position',position.value);
  preview.style.setProperty('--preview-image',current?'url('+JSON.stringify(current)+')':'none');
  $('bg-overlay-value').textContent=shade.value+'%';
  previewStatus.textContent=option==='photo'&&!current?'Choose an image to preview the photo background.':
   'Preview only. Website visitors will see changes after you save.';
 }
 [style,position,shade,color,enabled].forEach(input=>input.addEventListener('input',showPreview));
 file.addEventListener('change',()=>{
  forgetBlob();
  const selection=file.files?.[0];
  if(selection){
   if(!['image/jpeg','image/png','image/webp'].includes(selection.type)||selection.size>5*1024*1024){
    file.value='';status.textContent='Choose a JPG, PNG or WebP image no larger than 5 MB.';return;
   }
   localBlob=URL.createObjectURL(selection);style.value='photo';enabled.checked=true;
  }
  showPreview();
 });
 $('bg-clear-photo').onclick=()=>{
  forgetBlob();file.value='';existingUrl='';style.value='prairie_doors';showPreview();
 };
 $('bg-restore').onclick=()=>{
  forgetBlob();file.value='';existingUrl='';enabled.checked=true;style.value='prairie_doors';
  position.value='center';shade.value='76';color.value='#f8efdf';
  status.textContent='Restored default in preview. Save to publish.';showPreview();
 };
 $('bg-disable').onclick=()=>{
  enabled.checked=false;status.textContent='Background disabled in preview. Save to publish.';showPreview();
 };
 $('website-background-form').onsubmit=async event=>{
  event.preventDefault();
  const save=$('bg-save');save.disabled=true;status.textContent='Saving website background…';
  try{
   let imageUrl=existingUrl;
   if(file.files?.length){
    const result=await upload('bakery-backgrounds',file.files[0]);
    if(!verifiedBackgroundUrl(result.url,config.supabaseUrl))throw Error('Uploaded image URL was not accepted');
    imageUrl=result.url;
   }
   if(enabled.checked&&style.value==='photo'&&!imageUrl)
    throw Error('Choose a photo before enabling Uploaded Background Photo.');
   const payload={background_enabled:enabled.checked,
    background_style:backgroundChoice(style.value),
    background_image_url:imageUrl||null,
    background_position:position.value,
    background_overlay_percent:Number(shade.value),
    background_solid_color:color.value};
   const saved=await update('site_settings',1,payload);
   if(!saved||saved.id!==1)throw Error('The website settings update could not be verified.');
   existingUrl=imageUrl;file.value='';forgetBlob();
   applyBakeryBackground(saved,config.supabaseUrl);
   await ctx.load();
   status.textContent='Saved. The public website now uses your selected background.';
   showPreview();
  }catch(error){status.textContent='Could not save background: '+(error.message||'Unknown error');}
  finally{save.disabled=false;}
 };
 showPreview();
}
