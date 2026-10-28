import {config,currentUser,list,update,signIn,signUp,signOut,money,escapeHtml as h,fmt} from './api.js';
import {renderMessages} from './message-center.js';
import {IDLE_OPTIONS,normalizeIdle} from './idle-session.js';
const addressFields=[
 ['address_line1','Street address','street-address',true],
 ['address_line2','Apt, suite or unit','address-line2',false],
 ['city','City','address-level2',true],
 ['state','State / province','address-level1',true],
 ['country','Country (two-letter code)','country',true],
 ['postal_code','ZIP / postal code','postal-code',true]
];
const billingFields=[
 ['billing_line1','Billing street address','address-line1',true],
 ['billing_line2','Billing apt, suite or unit','address-line2',false],
 ['billing_city','Billing city','address-level2',true],
 ['billing_state','Billing state / province','address-level1',true],
 ['billing_country','Billing country (two-letter code)','country',true],
 ['billing_postal_code','Billing ZIP / postal code','postal-code',true]
];
const item=(name,label,autocomplete,required=false,type='text',value='')=>
 '<label class="field">'+h(label)+'<input name="'+h(name)+'" type="'+type+'" autocomplete="'+h(autocomplete||'off')+
 '" maxlength="'+(name==='postal_code'||name==='billing_postal_code'?'15':'160')+'" value="'+h(value||'')+'"'+(required?' required':'')+'></label>';
function profileFields(p={}, {editableUsername=true}={}){
 return '<div class="account-fields">'+item('first_name','First name','given-name',true,'text',p.first_name)+
 item('last_name','Last name','family-name',true,'text',p.last_name)+
 (editableUsername?item('username','Username (chosen at sign-up; 3–30 letters, numbers or underscores)','username',true,'text',p.username):'<p class="field"><strong>Username:</strong> '+h(p.username||'Not set')+'<span class="small muted" style="display:block">Locked after registration. Only the bakery Owner/Admin can change a username.</span></p>')+
 item('phone','Phone (optional)','tel',false,'tel',p.phone)+
 '<fieldset><legend>Account address</legend>'+addressFields.map(f=>item(...f.slice(0,4),'text',p[f[0]]??(f[0]==='country'?'US':''))).join('')+'</fieldset>'+
 '<label class="checkbox"><input type="checkbox" name="billing_same"'+(p.billing_same!==false?' checked':'')+'> My billing address is the same as my account address</label>'+
 '<fieldset data-billing-fields><legend>Billing address</legend>'+billingFields.map(f=>item(...f.slice(0,4),'text',p[f[0]]??(f[0]==='billing_country'?'US':''))).join('')+'</fieldset></div>';
}
function billingToggle(form){
 const b=form.querySelector('[name="billing_same"]'),fieldset=form.querySelector('[data-billing-fields]');
 const sync=()=>{fieldset.hidden=b.checked;fieldset.querySelectorAll('input').forEach(x=>{x.required=!b.checked&&x.name!=='billing_line2';});};
 b.onchange=sync;sync();
}
function collect(form,{includeUsername=true}={}){
 const fd=new FormData(form),p={};
 for(const field of [...['first_name','last_name','phone'],...(includeUsername?['username']:[]),...addressFields.map(x=>x[0]),...billingFields.map(x=>x[0])])p[field]=String(fd.get(field)||'').trim();
 p.billing_same=form.elements.billing_same.checked;
 if(p.billing_same)for(const f of billingFields)p[f[0]]=p[({billing_line1:'address_line1',billing_line2:'address_line2',billing_city:'city',billing_state:'state',billing_country:'country',billing_postal_code:'postal_code'})[f[0]]];
 return p;
}
let loader;
function turnstileLoaded(){
 if(window.turnstile)return Promise.resolve(window.turnstile);
 if(!loader)loader=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async=true;script.onload=()=>window.turnstile?resolve(window.turnstile):reject(Error('CAPTCHA could not start'));
  script.onerror=()=>reject(Error('CAPTCHA could not load'));document.head.appendChild(script);
 });return loader;
}

function authError(form,message){
 const slot=form.querySelector('[data-auth-error]');
 if(slot){slot.textContent=String(message||'');slot.hidden=!message;}
}
function verificationStatus(form,message){
 const slot=form.querySelector('[data-captcha-status]');
 if(slot)slot.textContent=message||'';
}
function resetVerification(form){
 const slot=form.querySelector('[data-captcha]');
 if(slot?.dataset.widget!==undefined&&window.turnstile)window.turnstile.reset(slot.dataset.widget);
 form.querySelector('[data-verify-human]').checked=false;
 verificationStatus(form,'');
}
async function protect(form){
 if(!config.turnstileSiteKey)throw Error('Human verification is unavailable. Please try again later.');
 const api=await turnstileLoaded(),slot=form.querySelector('[data-captcha]');
 if(!slot)throw Error('Verification form not found.');
 if(!slot.dataset.widget){
  const id=api.render(slot,{
   sitekey:config.turnstileSiteKey,theme:'auto',appearance:'interaction-only',execution:'execute',
   callback:()=>verificationStatus(form,'Verification complete.'),
   'error-callback':()=>{verificationStatus(form,'');authError(form,'Verification failed. Select the checkbox to retry.');form.querySelector('[data-verify-human]').checked=false;},
   'expired-callback':()=>{verificationStatus(form,'');authError(form,'Verification expired. Select the checkbox again.');form.querySelector('[data-verify-human]').checked=false;}
  });
  slot.dataset.widget=String(id);
 }
 return api;
}
async function executeHumanCheck(form){
 const api=await protect(form),slot=form.querySelector('[data-captcha]');
 verificationStatus(form,'Verifying…');
 api.execute(slot.dataset.widget);
}
function captchaToken(form){
 if(!form.querySelector('[data-verify-human]')?.checked)throw Error('Select Verify I’m Human before signing in.');
 const token=form.querySelector('[name="cf-turnstile-response"]')?.value||'';
 if(!token)throw Error('Complete human verification before signing in.');
 return token;
}
async function authPage({layout,rerender,showError}){
 layout('<section class="section bakery-account-entry"><h1>Bakery Account</h1>'+
  '<p>Use your username or email address to access your account. Guest checkout is available.</p>'+
  '<form id="bakery-login" class="box">'+item('identifier','Username or email address','username',true,'text')+
  item('password','Password','current-password',true,'password')+
  '<p class="auth-form-error" data-auth-error role="alert" hidden></p>'+
  '<div class="actions auth-submit-actions"><button class="button" type="submit">Sign In Securely</button>'+
  '<button type="button" class="button secondary" data-auth-tab="register">Create Account</button></div>'+
  '<div class="auth-verification"><label class="checkbox auth-verify-choice"><input type="checkbox" data-verify-human> Verify I’m Human</label>'+
  '<div data-captcha></div><p class="small" data-captcha-status role="status" aria-live="polite"></p></div></form>'+
  '<form id="bakery-register" class="box" hidden><h2>Create Account</h2>'+
  '<p class="small muted">Fields marked * Required are mandatory. Your phone number is optional. Your address is stored privately.</p>'+
  item('email','Email address','email',true,'email')+item('password','Password (at least 8 characters)','new-password',true,'password')+
  profileFields({billing_same:true})+
  '<p class="auth-form-error" data-auth-error role="alert" hidden></p>'+
  '<div class="actions auth-submit-actions"><button class="button" type="submit">Create Account</button>'+
  '<button type="button" class="button secondary" data-auth-tab="login">Back to Sign In</button></div>'+
  '<div class="auth-verification"><label class="checkbox auth-verify-choice"><input type="checkbox" data-verify-human> Verify I’m Human</label>'+
  '<div data-captcha></div><p class="small" data-captcha-status role="status" aria-live="polite"></p></div></form></section>');
 const login=document.getElementById('bakery-login'),register=document.getElementById('bakery-register');
 billingToggle(register);
 const select=kind=>{const r=kind==='register';login.hidden=r;register.hidden=!r;authError(r?register:login,'');};
 document.querySelectorAll('[data-auth-tab]').forEach(b=>b.onclick=()=>select(b.dataset.authTab));
 select('login');
 document.querySelectorAll('[data-verify-human]').forEach(checkbox=>checkbox.onchange=async()=>{
  const form=checkbox.closest('form');authError(form,'');
  if(!checkbox.checked){resetVerification(form);return;}
  try{await executeHumanCheck(form);}catch(error){checkbox.checked=false;authError(form,error.message);}
 });
 login.onsubmit=async ev=>{
  ev.preventDefault();const button=login.querySelector('[type=submit]');authError(login,'');button.disabled=true;
  try{await signIn(login.elements.identifier.value,login.elements.password.value,captchaToken(login));await rerender();}
  catch(error){authError(login,error.message);resetVerification(login);button.disabled=false;}
 };
 register.onsubmit=async ev=>{
  ev.preventDefault();const button=register.querySelector('[type=submit]');authError(register,'');button.disabled=true;
  try{
   const result=await signUp(register.elements.email.value,register.elements.password.value,collect(register),captchaToken(register));
   if(result.access_token)await rerender();
   else{const info=document.createElement('div');info.className='notice success';
    info.textContent='Account created. Check your email to verify your address, then sign in.';
    register.prepend(info);resetVerification(register);button.disabled=false;}
  }catch(error){authError(register,error.message);resetVerification(register);button.disabled=false;}
 };
}
export async function account({layout,rerender,showError,section=null}){
 if(!currentUser())return authPage({layout,rerender,showError});
 const user=currentUser();
 layout('<section class="section"><h1>My Bakery Account</h1><p>Signed in as '+h(user.email)+'</p>'+
  '<button class="button secondary" id="signout">Sign Out</button><div class="cols">'+
  '<section class="box"><h2>Customer Account ID</h2><div id="my-account-code">Loading…</div>'+
  '<div id="account-profile-section"><h2>Profile & Addresses</h2><div id="my-profile">Loading…</div></div></section>'+ 
  '<section class="box"><h2>My Orders</h2><div id="my-orders">Loading…</div>'+
  '<h2>Notifications</h2><div id="my-notices">Loading…</div>'+
  '<section id="account-settings" aria-label="Account Settings"><h2>Account Settings</h2><label class="checkbox"><input type="checkbox" id="optin"> Receive promotional messages in my account</label>'+ 
  '<button class="button secondary" id="save-optin">Save Preference</button><div class="account-idle-pref"><label for="idle-minutes">Automatic sign-out after inactivity <span class="required-indicator" aria-hidden="true">* Required</span></label><select id="idle-minutes" required>'+IDLE_OPTIONS.map(n=>'<option value="'+n+'">'+n+' minute'+(n===1?'':'s')+'</option>').join('')+'</select><button class="button secondary" type="button" id="save-idle-minutes">Save Timeout</button><p id="idle-pref-status" role="status" aria-live="polite"></p></div></section></section></div>'+ 
  '<section class="section" id="my-messages" aria-label="Private customer messages">Loading messages…</section></section>');
 document.getElementById('signout').onclick=async()=>{await signOut();await rerender();};
 try{
  const [orders,notes,profiles]=await Promise.all([
   list('orders',{customer_id:'eq.'+user.id,order:'created_at.desc'}),
   list('notifications',{customer_id:'eq.'+user.id,order:'created_at.desc',limit:'40'}),
   list('customer_profiles',{id:'eq.'+user.id})]);
  const profile=profiles[0]||{};
  document.getElementById('my-account-code').innerHTML='<p><strong>Username:</strong> '+h(profile.username||'Not set')+'</p><p><strong>Account ID:</strong> '+h(profile.account_code||'Pending setup')+'</p>';
  document.getElementById('my-orders').innerHTML=orders.map(o=>'<p>'+h(o.id.slice(0,8))+' · '+h(o.status)+' · '+fmt(o.fulfillment_date)+' · '+money(o.total_cents)+'</p>').join('')||'<p>No orders yet.</p>';
  document.getElementById('my-notices').innerHTML=notes.map(n=>'<p><strong>'+h(n.title)+'</strong>: '+h(n.body)+'</p>').join('')||'<p>No notifications.</p>';
  document.getElementById('optin').checked=Boolean(profile.marketing_opt_in);
  document.getElementById('idle-minutes').value=String(normalizeIdle(profile.idle_timeout_minutes));
  document.getElementById('save-idle-minutes').onclick=async()=>{
   const n=Number(document.getElementById('idle-minutes').value);
   if(!IDLE_OPTIONS.includes(n))return;
   try{
    await update('customer_profiles',user.id,{idle_timeout_minutes:n});
    const app=await import('./app.js');
    await app.resetAccountIdle();
    document.getElementById('idle-pref-status').textContent='Saved: '+n+' minute'+(n===1?'':'s')+'.';
   }catch(e){showError(e)}
  };
  document.getElementById('save-optin').onclick=async()=>{try{await update('customer_profiles',user.id,{marketing_opt_in:document.getElementById('optin').checked});}catch(e){showError(e);}};
  document.getElementById('my-profile').innerHTML='<button class="button secondary" type="button" id="edit-profile">Edit Profile</button><div id="profile-editor" hidden><form id="profile-form">'+profileFields(profile,{editableUsername:false})+'<div class="actions"><button class="button" type="submit">Save Changes</button><button class="button secondary" type="button" id="cancel-profile">Cancel</button></div></form></div>';
  const form=document.getElementById('profile-form');billingToggle(form);
  const editor=document.getElementById('profile-editor');
  document.getElementById('edit-profile').onclick=()=>{editor.hidden=false;document.getElementById('edit-profile').hidden=true;};
  document.getElementById('cancel-profile').onclick=()=>{editor.hidden=true;document.getElementById('edit-profile').hidden=false;form.reset();billingToggle(form);};
  form.onsubmit=async ev=>{ev.preventDefault();try{await update('customer_profiles',user.id,collect(form,{includeUsername:false}));await rerender();}catch(e){showError(e);}};
  await renderMessages({container:'#my-messages',showError});
 }catch(e){showError(e);}
}
