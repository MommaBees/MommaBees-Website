
const selector='input:not([type="hidden"]),select,textarea';
export function syncRequiredMarkers(root=document){
 for(const form of root.querySelectorAll('form')){
  for(const control of form.querySelectorAll(selector)){
   const label=control.closest('label')||[...root.querySelectorAll('label[for]')].find(x=>x.htmlFor===control.id&&control.id)||null;
   if(!label)continue;
   const need=control.required||label.dataset.requiredLabel==='true';
   const found=label.querySelector(':scope > .required-indicator');
   if(!need){found?.remove();control.removeAttribute('aria-required');continue;}
   if(control.required)control.setAttribute('aria-required','true');
   if(found)continue;
   const span=document.createElement('span');span.className='required-indicator';span.textContent='* Required';span.setAttribute('aria-hidden','true');
   if(control.closest('label')===label&&control.type!=='checkbox'&&control.type!=='radio')label.insertBefore(span,control);
   else label.append(span);
  }
 }
}
let observer;
export function bindRequiredMarkers(root=document){
 if(observer)return;
 syncRequiredMarkers(root);
 observer=new MutationObserver(changes=>{
  if(changes.some(x=>x.type==='childList'||x.attributeName==='required'||x.attributeName==='data-required-label'))syncRequiredMarkers(root);
 });
 observer.observe(root.body||root,{subtree:true,childList:true,attributes:true,attributeFilter:['required','data-required-label']});
}
