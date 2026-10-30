import {currentSession,escapeHtml as e} from './api.js';
import {defaultFaqEntries} from './customer-faq.js';
const route='/api/faqs';
let records=[];
async function request(method='GET',payload){
 const token=currentSession()?.access_token;
 if(!token)throw Error('Please sign in as Owner or Admin.');
 const r=await fetch(route+(method==='GET'?'?admin=1':''),{method,cache:'no-store',headers:{
  'Authorization':'Bearer '+token,...(payload?{'Content-Type':'application/json','Origin':location.origin}:{})},
  ...(payload?{body:JSON.stringify(payload)}:{})});
 const body=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(body.error||'FAQ operation could not be completed');
 return body;
}
const defaults=defaultFaqEntries();
const originalAnswer=row=>{
 if(row.answer!==null)return String(row.answer||'');
 const source=defaults[Number(row.source_index)];
 if(!source)return '';
 const div=document.createElement('div');div.innerHTML=source.answer;
 return div.textContent||'';
};
export async function showFaqEditor({showError}){
 const root=document.querySelector('#admin-main');if(!root)return;
 root.innerHTML='<section class="box"><h2>FAQ Manager</h2><p>Loading existing questions…</p></section>';
 try{
  const data=await request();
  records=data.items||[];
  const rows=records.map((row,index)=>
   '<tr><td>'+e(row.question)+'</td><td>'+(row.published?'Published':'Hidden')+'</td><td>'+index+'</td>'+
   '<td class="faq-admin-actions"><button type="button" class="button secondary" data-faq-edit="'+e(row.id)+'">Edit</button>'+
   '<button type="button" class="button secondary" data-faq-up="'+e(row.id)+'" '+(index===0?'disabled':'')+'>Move Up</button>'+
   '<button type="button" class="button secondary" data-faq-down="'+e(row.id)+'" '+(index===records.length-1?'disabled':'')+'>Move Down</button>'+
   '<button type="button" class="button secondary" data-faq-remove="'+e(row.id)+'">Remove</button></td></tr>'
  ).join('');
  root.innerHTML='<section class="box"><h2>Frequently Asked Questions — Manager</h2>'+
  '<p>Create, edit, hide, delete, and arrange customer FAQs. The original policy links are retained for default answers until you replace their wording.</p>'+
  '<button type="button" class="button" id="faq-add">Add FAQ</button>'+
  '<div class="table-wrap"><table><thead><tr><th>Question</th><th>Visibility</th><th>Order</th><th>Manage</th></tr></thead><tbody>'+
   (rows||'<tr><td colspan="4">No FAQs currently configured.</td></tr>')+'</tbody></table></div>'+
  '<section class="box faq-editor-form" id="faq-editor" hidden><h3 id="faq-editor-title">Edit FAQ</h3>'+
  '<form id="faq-edit-form"><input type="hidden" name="id">'+
  '<div class="field"><label for="faq-question">Question</label><input name="question" id="faq-question" maxlength="220" minlength="5" required></div>'+
  '<div class="field"><label for="faq-answer">Answer</label><textarea name="answer" id="faq-answer" maxlength="4000" minlength="1" rows="6" required></textarea></div>'+
  '<div class="field"><label for="faq-order">Display order</label><input type="number" id="faq-order" name="sort_order" min="0" max="100000" step="1" required></div>'+
  '<label class="checkbox"><input type="checkbox" id="faq-published" name="published"> Publish this FAQ</label>'+
  '<div class="actions"><button class="button" type="submit">Save FAQ</button><button class="button secondary" id="faq-cancel" type="button">Cancel</button></div></form></section>'+
  '<p id="faq-manager-status" role="status" aria-live="polite"></p></section>';
  const panel=root.querySelector('#faq-editor'),form=root.querySelector('#faq-edit-form');
  const open=(row)=>{
   panel.hidden=false;
   root.querySelector('#faq-editor-title').textContent=row?'Edit FAQ':'Add FAQ';
   form.elements.id.value=row?.id||'';
   form.elements.question.value=row?.question||'';
   form.elements.answer.value=row?originalAnswer(row):'';
   form.elements.sort_order.value=String(row?.sort_order??(records.length+1)*10);
   form.elements.published.checked=row?.published??true;
   panel.scrollIntoView({block:'nearest'});
  };
  root.querySelector('#faq-add').onclick=()=>open(null);
  root.querySelector('#faq-cancel').onclick=()=>{panel.hidden=true;form.reset();};
  root.querySelectorAll('[data-faq-edit]').forEach(btn=>btn.onclick=()=>{
   const row=records.find(x=>x.id===btn.dataset.faqEdit);
   if(row)open(row);
  });
  root.querySelectorAll('[data-faq-remove]').forEach(btn=>btn.onclick=async()=>{
   const row=records.find(x=>x.id===btn.dataset.faqRemove);
   if(!row||!window.confirm('Permanently remove the FAQ "'+row.question+'"?'))return;
   try{await request('DELETE',{id:row.id,confirm:'DELETE FAQ'});await showFaqEditor({showError});}catch(err){showError(err);}
  });
  const swap=async(id,direction)=>{
   const idx=records.findIndex(x=>x.id===id),target=idx+direction;
   if(idx<0||target<0||target>=records.length)return;
   const reordered=records.map(x=>x.id);[reordered[idx],reordered[target]]=[reordered[target],reordered[idx]];
   try{await request('POST',{action:'reorder',ids:reordered});await showFaqEditor({showError});}
   catch(err){showError(err);}
  };
  root.querySelectorAll('[data-faq-up]').forEach(btn=>btn.onclick=()=>swap(btn.dataset.faqUp,-1));
  root.querySelectorAll('[data-faq-down]').forEach(btn=>btn.onclick=()=>swap(btn.dataset.faqDown,1));
  form.onsubmit=async event=>{
   event.preventDefault();
   const body={question:form.elements.question.value,answer:form.elements.answer.value,sort_order:Number(form.elements.sort_order.value),published:form.elements.published.checked};
   if(form.elements.id.value)body.id=form.elements.id.value;
   try{await request(body.id?'PATCH':'POST',body);await showFaqEditor({showError});}catch(err){showError(err);}
  };
 }catch(error){root.innerHTML='<section class="box"><h2>FAQ Manager</h2><p>Unable to load FAQ records. No edits were made.</p></section>';showError(error);}
}
