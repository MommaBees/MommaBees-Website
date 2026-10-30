// Owner-only Stripe TEST/LIVE storefront switch.
// This control updates the effective Supabase runtime mode; it does NOT mutate Cloudflare secrets or emergency switches.
import {currentSession,escapeHtml as e} from './api.js';
const endpoint='/api/admin/live-selling';
const request=async body=>{
 const token=currentSession()?.access_token;
 if(!token)throw Error('Sign in as Owner again.');
 const r=await fetch(endpoint,{method:body?'POST':'GET',cache:'no-store',
  headers:{Authorization:'Bearer '+token,...(body?{'Origin':location.origin,'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})});
 const result=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(result.error||'Stripe payment mode unavailable');
 return result;
};
export async function showLiveSelling({showError}){
 const root=document.querySelector('#admin-main');if(!root)return;
 root.innerHTML='<section class="box"><h2>Stripe Payment Mode</h2><p>Verifying payment settings…</p></section>';
 try{
  const status=await request();
  const live=status.enabled===true;
  const mode=status.mode==='live'?'LIVE':'TEST';
  const ready=status.ready===true;
  const blocked=(status.requirements||[]).filter(x=>!x.ok);
  root.innerHTML='<section class="box owner-live-selling" aria-label="Owner Stripe payments">'+
   '<h2>Stripe Payments — Owner Control</h2>'+
   '<p>Choose between Stripe TEST and LIVE for customer checkout. The selected storefront mode is saved on the server; Cloudflare emergency settings remain independent.</p>'+
   '<div class="owner-payment-mode"><h3>Current storefront mode: '+e(mode)+'</h3>'+
   '<p><strong>Customer LIVE payments:</strong> '+(status.acceptingLivePayments?'Ready to process':live?'LIVE selected, but blocked by a release gate':'Disabled')+'</p>'+
   '<button type="button" role="switch" aria-label="Enable or disable LIVE Stripe payments" aria-checked="'+(live?'true':'false')+'" '+
    'id="owner-live-toggle" class="button '+(live?'danger':'')+'" '+(!live&&!ready?'disabled':'')+'>'+
      (live?'Disable LIVE Payments — return to TEST':'Enable LIVE Payments — switch to LIVE')+
   '</button></div>'+
   '<p class="small">Switching to LIVE requires explicit Owner confirmation, verified LIVE account credentials, tax configuration, eligible stock and fulfillment readiness. Turning LIVE off immediately closes customer checkout and restores TEST mode. The separate Cloudflare LIVE_PAYMENT_ALLOWED kill switch is not overridden by this button.</p>'+
   '<h3>Provider configuration</h3>'+
   '<p><strong>Cloudflare emergency payment gate:</strong> '+(status.emergencyGate?'Enabled':'Disabled')+'</p>'+
   '<p><strong>Cloudflare automatic-tax gate:</strong> '+(status.automaticTaxGate?'Enabled':'Disabled')+'</p>'+
   '<p><strong>Cloudflare STRIPE_PAYMENT_MODE fallback:</strong> '+e(String(status.cloudflareMode||'unset').toUpperCase())+'</p>'+
   '<h3>LIVE activation prerequisites</h3><ul>'+ (status.requirements||[]).map(x=>
    '<li><strong>'+(x.ok?'Verified':'Not ready')+':</strong> '+e(x.message)+'</li>').join('')+'</ul>'+
   '<p>'+(live?'LIVE mode is selected. Confirm every actual transaction and webhook against the correct LIVE account.':
     ready?'All automated prerequisites are satisfied. A LIVE activation still requires the Owner confirmation and genuine transaction acceptance.':
     'LIVE activation is blocked until '+blocked.length+' prerequisite'+(blocked.length===1?'':'s')+' pass.')+'</p>'+
   '<div class="actions"><button class="button ghost" id="owner-live-refresh">Refresh payment checks</button></div>'+
   '<p id="owner-live-result" role="status"></p></section>';
  const toggle=root.querySelector('#owner-live-toggle');
  toggle.onclick=async()=>{
   const enabled=!live;
   if(enabled&&window.prompt('Type ENABLE LIVE SALES to authorize real customer payments:')!=='ENABLE LIVE SALES')return;
   if(!enabled&&!window.confirm('Disable LIVE payments and return to Stripe TEST? Existing paid orders will be preserved.'))return;
   toggle.disabled=true;
   try{
    const changed=await request({enabled,confirm:enabled?'ENABLE LIVE SALES':undefined});
    if(changed.auditRecorded===false)showError(Error('Payment setting changed, but audit logging failed. Review the audit log.'));
    await showLiveSelling({showError});
   }catch(error){toggle.disabled=false;showError(error);}
  };
  root.querySelector('#owner-live-refresh').onclick=()=>showLiveSelling({showError});
 }catch(error){
  root.innerHTML='<section class="box"><h2>Stripe Payment Mode</h2><p>Payment status unavailable. No switch was changed.</p></section>';
  showError(error);
 }
}
