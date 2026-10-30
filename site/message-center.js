import {currentUser,list,add,upload,signedImage,escapeHtml as h,safePhoto} from './api.js';
import {moderateAction} from './moderation.js';
const options=[
 ['order','Existing order'],['custom_order','Custom cake or special order'],
 ['pickup_delivery','Pickup or local delivery'],['product_allergens','Products or allergens'],
 ['payment','Payments or billing'],['feedback','Comments or feedback'],['other','Other']
];
const safeText=s=>h(s).replace(/\n/g,'<br>');
const imageMarkup=url=>'<a href="'+safePhoto(url)+'" target="_blank" rel="noopener noreferrer"><img src="'+safePhoto(url)+'" alt="Customer message photograph" loading="lazy"></a>';
async function savedPhotos(messages){
 const ids=new Set(messages.map(m=>m.id)),r=await list('message_photos',{limit:'500'});
 const lookup={};
 await Promise.all(r.filter(p=>ids.has(p.message_id)).map(async p=>{
  try{const url=await signedImage('message-photos',p.storage_path);if(url)(lookup[p.message_id]??=[]).push(url);}catch(err){console.warn('Private message photo not available',err.message);}
 }));
 return lookup;
}
async function sendFiles(message,files){
 if(files.length>5)throw Error('You may attach up to five photos to one message.');
 for(const file of files){
  const uploaded=await upload('message-photos',file,{messageId:message.id});
  await add('message_photos',{message_id:message.id,storage_path:uploaded.path});
 }
}
function userMessage(m,photos){
 return '<div class="box" style="margin:10px 0;padding:14px">'+
  '<p class="small muted">'+h(m.is_staff_reply?'Owner/Admin':'Customer')+' · '+h(new Date(m.created_at).toLocaleString())+'</p>'+
  '<p>'+safeText(m.body)+'</p>'+
  (photos?.length?'<div class="message-images">'+photos.map(imageMarkup).join('')+'</div>':'')+'</div>';
}
function subjects(){return options.map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join('');}
function uploadField(){return '<label class="field">Photos (optional, up to 5; JPG, PNG, or WebP; 5 MB each)<input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple></label>';}
function selectedSubject(v){return options.find(x=>x[0]===v)?.[1]||'Other';}
export async function renderMessages({container,isAdmin=false,showError=()=>{}}){
 const target=typeof container==='string'?document.querySelector(container):container;
 if(!target)return;
 target.innerHTML='<div class="box">Loading private messages…</div>';
 try{
  const user=currentUser();
  if(!user){target.innerHTML='<p>Please sign in to use your private message center.</p>';return;}
  const messages=await list('messages',{order:'created_at.asc',limit:'300'});
  const photos=await savedPhotos(messages);
  const root=messages.filter(x=>!x.parent_id),byRoot=new Map();
  messages.filter(x=>x.parent_id).forEach(x=>{const list=byRoot.get(x.parent_id)||[];list.push(x);byRoot.set(x.parent_id,list);});
  let html='<section class="box"><h2>'+(isAdmin?'Customer Messages & Special Requests':'Private Messages to Momma Bee’s')+'</h2>';
  if(!isAdmin)html+='<form id="new-message" class="message-form"><h3>Send a new message</h3>'+
   '<label class="field">Subject<select name="subject_type" required>'+subjects()+'</select></label>'+
   '<label class="field" data-custom style="display:none">Other subject<input name="subject_custom" maxlength="100" placeholder="Describe your subject"></label>'+
   '<label class="field">Message<textarea name="body" required minlength="5" maxlength="3000" rows="4"></textarea></label>'+
   uploadField()+'<button class="button" type="submit">Send private message</button></form>';
  html+='<h3>Message history</h3>';
  html+=root.slice().reverse().map(m=>{
    const replies=byRoot.get(m.id)||[];
    const subject=(m.subject_type?selectedSubject(m.subject_type):m.subject)+(m.subject_type==='other'&&m.subject_custom?' — '+m.subject_custom:'');
    return '<article class="box message-thread" style="margin:15px 0"><h3>'+h(subject)+'</h3>'+
      '<p class="small muted">'+h(m.status||'new')+' · '+h(m.created_at?.slice(0,10)||'')+
       (isAdmin?'<span> · '+h(m.customer_email||'Guest message')+'</span>':'')+'</p>'+
      [m,...replies].map(x=>userMessage(x,photos[x.id])).join('')+
      ((isAdmin&&!m.customer_id)?'<p class="small muted">Guest request: account inbox reply is unavailable until email delivery is configured.</p>':
      '<form class="message-reply-form" data-root="'+h(m.id)+'"><label class="field">'+(isAdmin?'Reply to customer':'Reply to Owner/Admin')+
      '<textarea name="body" required minlength="2" maxlength="3000" rows="3"></textarea></label>'+
      (isAdmin?'':uploadField())+'<button class="button secondary" type="submit">Send reply</button></form>')+'</article>';
  }).join('')||'<p>No messages yet.</p>';
  html+='</section>';
  target.innerHTML=html;
  const form=target.querySelector('#new-message');
  if(form){
   const custom=form.querySelector('[data-custom]'),selection=form.elements.subject_type;
   selection.onchange=()=>{custom.style.display=selection.value==='other'?'block':'none';form.elements.subject_custom.required=selection.value==='other';};
   form.onsubmit=async ev=>{
    ev.preventDefault();const submit=form.querySelector('button[type="submit"]');submit.disabled=true;
    try{
     const files=[...form.elements.photos.files],type=selection.value,customText=form.elements.subject_custom.value.trim();
     if(files.length>5)throw Error('Maximum five photographs per message');
     if(type==='other'&&!customText)throw Error('Enter a subject for Other');
     const subject=type==='other'?customText:selectedSubject(type);
     const msg=await add('messages',{customer_id:user.id,customer_email:user.email,kind:type==='custom_order'?'custom_order':'message',
       subject_type:type,subject_custom:type==='other'?customText:null,subject,body:form.elements.body.value.trim(),is_staff_reply:false});
     if(files.length)await sendFiles(msg,files);
     await renderMessages({container:target,isAdmin,showError});
    }catch(ex){showError(ex);submit.disabled=false;}
   };
  }
  target.querySelectorAll('.message-reply-form').forEach(form=>form.onsubmit=async ev=>{
   ev.preventDefault();const submit=form.querySelector('button[type="submit"]');submit.disabled=true;
   try{
    const parent=root.find(x=>x.id===form.dataset.root);
    if(!parent)throw Error('Conversation not found');
    const files=isAdmin?[]:[...form.elements.photos.files];
    if(files.length>5)throw Error('Maximum five photographs per reply');
    if(isAdmin)await moderateAction({action:'reply',id:parent.id,body:form.elements.body.value.trim()});
    else{
      const msg=await add('messages',{customer_id:user.id,customer_email:parent.customer_email||user.email,
        kind:'reply',subject:'Re: '+parent.subject,subject_type:parent.subject_type,subject_custom:parent.subject_custom,
        body:form.elements.body.value.trim(),parent_id:parent.id,is_staff_reply:false,status:'new'});
      if(files.length)await sendFiles(msg,files);
    }
    await renderMessages({container:target,isAdmin,showError});
   }catch(ex){showError(ex);submit.disabled=false;}
  });
 }catch(err){target.innerHTML='<div class="notice error">Could not load messages: '+h(err.message)+'</div>';}
}
