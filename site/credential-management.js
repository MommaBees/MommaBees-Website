// Owner-only credential console: no secret values, no password or CAPTCHA persisted.
// Runtime slots are Supabase Vault encrypted. Provider-issued keys still require rotation at provider.
import {config,currentSession,escapeHtml as e} from './api.js';
const API='/api/admin/credentials';
const LABELS={
 'STRIPE_SECRET_KEY:test':'Stripe secret API key — TEST',
 'STRIPE_SECRET_KEY:live':'Stripe secret API key — LIVE',
 'STRIPE_WEBHOOK_SECRET:test':'Stripe webhook signing secret — TEST',
 'STRIPE_WEBHOOK_SECRET:live':'Stripe webhook signing secret — LIVE',
 'TURNSTILE_SECRET_KEY:shared':'Cloudflare Turnstile server secret — shared'
};
const key=(item)=>item.name+':'+item.environment;
const badge=status=>status==='vault-managed'?'Stored in encrypted Vault':
 status==='environment-binding'?'Existing Cloudflare binding':'Not configured';
let loader;
const turnstileReady=()=>{
 if(window.turnstile)return Promise.resolve(window.turnstile);
 if(!loader)loader=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async=true;
  script.onload=()=>window.turnstile?resolve(window.turnstile):reject(Error('Human verification unavailable'));
  script.onerror=()=>reject(Error('Human verification could not load'));
  document.head.append(script);
 });
 return loader;
};
const authHeaders=()=>{
 const token=currentSession()?.access_token;
 if(!token)throw Error('Sign in as the bakery Owner.');
 return {Authorization:'Bearer '+token};
};
export async function renderCredentialManager({showError}){
 const main=document.querySelector('#admin-main');if(!main)return;
 main.innerHTML='<section class="box"><h2>API Credentials & Webhooks</h2><p>Loading protected configuration status…</p></section>';
 let result;
 try{
  const res=await fetch(API,{headers:authHeaders(),cache:'no-store'});
  result=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(result.error||'Owner credential inventory unavailable');
 }catch(error){main.innerHTML='<div class="box"><h2>Credential inventory unavailable</h2></div>';showError(error);return;}
 const managed=(result.managed||[]).filter(item=>LABELS[key(item)]);
 const external=Array.isArray(result.external)?result.external:[];
 const history=Array.isArray(result.history)?result.history:[];
 const turnstilePending=history.find(x=>x.name==='TURNSTILE_SECRET_KEY'&&x.state==='pending');
 main.innerHTML='<section class="box owner-credentials" aria-label="Owner credential management">'+
  '<h2>API Credentials & Webhooks</h2>'+
  '<p class="small">Owner-only. Every change requires your account password and fresh human verification. Existing secret values cannot be viewed or downloaded.</p>'+
  '<div class="credential-status-grid">'+managed.map(item=>'<div class="credential-status-item">'+
   '<strong>'+e(LABELS[key(item)])+'</strong><span>'+e(badge(item.status))+'</span>'+
   (item.changed_at?'<small>Updated '+e(new Date(item.changed_at).toLocaleString())+'</small>':'')+
   '</div>').join('')+'</div>'+
  '<form id="owner-credential-form" class="owner-credential-form" autocomplete="off">'+
   '<h3>Replace a website credential</h3>'+
   '<label for="owner-credential-slot">Provider key and environment</label>'+
   '<select id="owner-credential-slot" name="slot" required>'+managed.map(item=>
    '<option value="'+e(key(item))+'">'+e(LABELS[key(item)])+'</option>').join('')+'</select>'+
   '<label for="owner-credential-value">New key or signing secret</label>'+
   '<input id="owner-credential-value" type="password" name="value" maxlength="8192" autocomplete="new-password" required spellcheck="false">'+
   '<label for="owner-credential-password">Confirm with your Owner account password</label>'+
   '<input id="owner-credential-password" type="password" name="password" autocomplete="current-password" required>'+
   '<div id="owner-live-confirm" hidden><label for="owner-credential-confirm">Type LIVE to change production credentials</label>'+
   '<input id="owner-credential-confirm" name="confirm_live" type="text" autocomplete="off" placeholder="LIVE"></div>'+
   '<label class="checkbox"><input type="checkbox" id="owner-credential-human"> Verify I’m Human</label>'+
   '<div id="owner-credential-captcha"></div><p class="small" id="owner-credential-verification" role="status"></p>'+
   '<button type="submit" class="button" id="owner-save-credential" disabled>Verify and update key</button>'+
   '<p id="owner-credential-status" role="status" aria-live="polite"></p></form>'+
   '<h3>Provider-controlled credentials</h3>'+
   '<p class="small">Cloudflare, GitHub and Supabase account-level keys must be created or revoked in their provider dashboards. Do not paste these infrastructure bootstrap keys into website forms; they can lock out the site or deployments.</p>'+
   '<div class="credential-external">'+external.map(x=>'<div><strong>'+e(x.provider)+' — '+e(x.label)+'</strong>'+
    '<p class="small">'+e(x.details)+'</p></div>').join('')+'</div>'+
   '<h3>Rotation verification &amp; audit</h3>'+
   '<p class="small">Replacement keys are staged first. Stripe webhook secrets activate only after a genuinely signed event; Turnstile secrets require a successful challenge. The prior key remains active until verification succeeds.</p>'+
   '<div class="credential-rotation-history" aria-live="polite">'+
    (history.length?history.slice(0,30).map(item=>'<div class="credential-rotation-item">'+
     '<strong>'+e(LABELS[key(item)]||item.name)+'</strong> <span>'+e(item.state)+'</span>'+
     '<small>'+e(item.created_at?new Date(item.created_at).toLocaleString():'')+'</small>'+
     '<ul>'+(Array.isArray(item.dependencies)?item.dependencies:[]).map(d=>'<li><strong>'+e(d.name)+'</strong>: '+e(d.state)+
      (d.details?' — '+e(d.details):'')+'</li>').join('')+'</ul>'+
     (item.state==='pending'?'<button type="button" class="button secondary" data-rotation-cancel="'+e(item.id)+'">Cancel pending change</button>':'')+
     '</div>').join(''):'<p class="small">No rotations recorded.</p>')+'</div>'+
   (turnstilePending?'<form id="owner-turnstile-proof" class="owner-credential-form">'+
    '<h3>Verify pending Turnstile key</h3>'+
    '<p class="small">Enter your Owner password, then complete two different human challenges to verify Owner authorization and the new server key. A changed public site key must first be configured at its provider.</p>'+
    '<label for="owner-proof-password">Owner password</label><input type="password" id="owner-proof-password" required autocomplete="current-password">'+
    '<div id="owner-proof-auth-challenge"></div><div id="owner-proof-new-challenge"></div>'+
    '<button type="button" class="button" id="owner-proof-start">Verify and activate pending key</button>'+
    '<p role="status" id="owner-proof-status" aria-live="polite"></p></form>':'')+
   '<p class="small">Updating a website key does not create or revoke the key at its provider. TEST and LIVE are isolated. Saving LIVE credentials does not enable checkout or initiate any payment.</p>'+
   '</section>';
 const form=main.querySelector('#owner-credential-form'),slot=form.elements.slot,save=form.querySelector('[type="submit"]');
 const human=form.querySelector('#owner-credential-human'),verification=form.querySelector('#owner-credential-verification');
 const feedback=form.querySelector('#owner-credential-status'),captcha=form.querySelector('#owner-credential-captcha');
 let widget=null,api=null,captchaToken=null;
 const reflect=()=>{
  const [name,environment]=slot.value.split(':');
  form.querySelector('#owner-live-confirm').hidden=environment!=='live';
  save.disabled=!(captchaToken&&human.checked);
 };
 const invalidate=()=>{
  captchaToken=null;human.checked=false;
  if(api&&widget!==null)api.reset(widget);
  verification.textContent='';
  reflect();
 };
 slot.addEventListener('change',()=>{invalidate();feedback.textContent='';});
 human.addEventListener('change',async()=>{
  captchaToken=null;reflect();
  if(!human.checked){invalidate();return;}
  try{
   if(!config.turnstileSiteKey)throw Error('Human verification is not configured.');
   api=await turnstileReady();
   if(widget===null){
    widget=api.render(captcha,{sitekey:config.turnstileSiteKey,theme:'auto',appearance:'interaction-only',execution:'execute',
     callback:token=>{captchaToken=human.checked?token:null;verification.textContent=captchaToken?'Verification complete.':'';reflect();},
     'error-callback':()=>{invalidate();verification.textContent='Verification failed. Try again.';},
     'expired-callback':()=>{invalidate();verification.textContent='Verification expired. Try again.';}
    });
   }
   verification.textContent='Verifying…';
   api.execute(widget);
  }catch(error){invalidate();showError(error);}
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!captchaToken||!human.checked)return;
  const [name,environment]=slot.value.split(':');
  const value=form.elements.value.value;
  const password=form.elements.password.value;
  const confirmLive=form.elements.confirm_live.value;
  save.disabled=true;
  feedback.dataset.state='';
  feedback.textContent='Checking Owner confirmation and validating the replacement credential…';
  try{
   const res=await fetch(API,{method:'POST',headers:{...authHeaders(),'Content-Type':'application/json'},
    body:JSON.stringify({name,environment,value,owner_password:password,captcha_token:captchaToken,confirm_live:confirmLive})});
   const payload=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(payload.error||'Credential update unsuccessful');
   form.elements.value.value='';form.elements.password.value='';form.elements.confirm_live.value='';
   feedback.textContent=payload.message||'Rotation submitted.';
   feedback.dataset.state=payload.state||'pending';
   // Reload metadata only. Do not re-display or persist the secret.
   const statusRes=await fetch(API,{headers:authHeaders(),cache:'no-store'});
   if(statusRes.ok){
    const updated=await statusRes.json();
    const changed=(updated.managed||[]).find(x=>x.name===name&&x.environment===environment);
    const original=managed.find(x=>x.name===name&&x.environment===environment);
    if(changed&&original){Object.assign(original,changed);
     const rows=[...main.querySelectorAll('.credential-status-item')];
     const idx=managed.indexOf(original);
     if(rows[idx]){rows[idx].querySelector('span').textContent=badge(changed.status);
      const small=rows[idx].querySelector('small');
      if(small)small.textContent='Updated '+new Date(changed.changed_at).toLocaleString();
     }
    }
   }
  }catch(error){feedback.textContent='Update not completed: '+error.message;}
  finally{
   const success=['activated','pending'].includes(feedback.dataset.state);
   form.elements.password.value='';invalidate();
   if(success)await renderCredentialManager({showError});
  }
 });
 main.querySelectorAll('[data-rotation-cancel]').forEach(button=>button.addEventListener('click',async()=>{
  if(!captchaToken||!human.checked||!form.elements.password.value){
   feedback.textContent='Enter your Owner password and complete human verification first.';return;
  }
  button.disabled=true;
  try{
   const r=await fetch(API,{method:'DELETE',headers:{...authHeaders(),'Content-Type':'application/json'},
    body:JSON.stringify({rotation_id:button.dataset.rotationCancel,owner_password:form.elements.password.value,captcha_token:captchaToken})});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(data.error||'Cancellation unsuccessful');
   form.elements.password.value='';
   await renderCredentialManager({showError});
  }catch(error){feedback.textContent=error.message;button.disabled=false;invalidate();}
 }));
 if(turnstilePending){
  const proofForm=main.querySelector('#owner-turnstile-proof'),proofStart=proofForm.querySelector('#owner-proof-start');
  const proofStatus=proofForm.querySelector('#owner-proof-status');
  proofStart.addEventListener('click',async()=>{
   const pwd=proofForm.querySelector('#owner-proof-password').value;
   if(!pwd){proofStatus.textContent='Enter your Owner password.';return;}
   proofStart.disabled=true;proofStatus.textContent='Complete two independent human challenges.';
   try{
    const service=await turnstileReady();
    if(!config.turnstileSiteKey)throw Error('Public Turnstile site key missing.');
    const challenge=node=>new Promise((resolve,reject)=>{
     const id=service.render(node,{sitekey:config.turnstileSiteKey,theme:'auto',execution:'execute',
      callback:token=>resolve(token),'error-callback':()=>reject(Error('Challenge failed')),
      'expired-callback':()=>reject(Error('Challenge expired'))});
     service.execute(id);
    });
    const authProof=await challenge(proofForm.querySelector('#owner-proof-auth-challenge'));
    const newProof=await challenge(proofForm.querySelector('#owner-proof-new-challenge'));
    const r=await fetch(API,{method:'PATCH',headers:{...authHeaders(),'Content-Type':'application/json'},
     body:JSON.stringify({rotation_id:turnstilePending.id,owner_password:pwd,captcha_token:authProof,proof_token:newProof})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(data.error||'New key verification failed');
    proofForm.querySelector('#owner-proof-password').value='';
    await renderCredentialManager({showError});
   }catch(error){proofStatus.textContent=error.message;proofStart.disabled=false;}
  });
 }
 reflect();
}
