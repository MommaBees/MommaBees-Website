// Owner-only LIVE sales console: never directly writes Cloudflare bootstrap bindings.
import {currentSession,escapeHtml as e} from './api.js';
const endpoint='/api/admin/live-selling';
const request=async body=>{
 const token=currentSession()?.access_token;
 if(!token)throw Error('Sign in as Owner again.');
 const r=await fetch(endpoint,{method:body?'POST':'GET',cache:'no-store',
  headers:{Authorization:'Bearer '+token,...(body?{'Origin':location.origin,'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})});
 const result=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(result.error||'Live selling status unavailable');
 return result;
};
export async function showLiveSelling({showError}){
 const root=document.querySelector('#admin-main');if(!root)return;
 root.innerHTML='<section class="box"><h2>LIVE Selling</h2><p>Verifying checkout dependencies…</p></section>';
 try{
  const status=await request();
  root.innerHTML='<section class="box owner-live-selling"><h2>LIVE Selling — Owner Control</h2>'+
   '<p>Use this control to open or close real customer checkout. A separate Cloudflare emergency gate and the payment prerequisites continue to apply.</p>'+
   '<h3>Checkout status: '+(status.enabled?'Enabled in database':'Disabled')+'</h3>'+
   '<p><strong>Selected Stripe mode:</strong> '+e(status.mode.toUpperCase())+'</p>'+
   '<h3>Activation prerequisites</h3><ul>'+status.requirements.map(x=>
    '<li><strong>'+ (x.ok?'Verified':'Not ready') +':</strong> '+e(x.message)+'</li>').join('')+'</ul>'+
   '<p>'+ (status.ready?'All automated prerequisites are satisfied. Final authenticated checkout and compliance acceptance remain separate.':'Activation is blocked until the listed prerequisites pass.')+'</p>'+
   '<div class="actions"><button class="button" id="owner-live-enable" '+(!status.ready||status.enabled?'disabled':'')+'>Enable LIVE Selling</button>'+
   '<button class="button secondary" id="owner-live-disable" '+(!status.enabled?'disabled':'')+'>Disable LIVE Selling</button>'+
   '<button class="button ghost" id="owner-live-refresh">Refresh checks</button></div>'+
   '<p id="owner-live-result" role="status"></p>'+
   '<p class="small">The credential console supports staged Stripe TEST/LIVE secrets. Cloudflare/Supabase infrastructure bootstrap credentials still require provider-side management.</p></section>';
  const act=async(enabled)=>{
   if(enabled&&window.prompt('Type ENABLE LIVE SALES to authorize customer payments:')!=='ENABLE LIVE SALES')return;
   if(!enabled&&!window.confirm('Disable real checkout for new customers? Existing orders will be preserved.'))return;
   try{
    const result=await request({enabled,confirm:enabled?'ENABLE LIVE SALES':undefined});
    if(result.auditRecorded===false)showError(Error('Checkout setting changed, but audit entry could not be recorded. Review logs.'));
    await showLiveSelling({showError});
   }catch(error){showError(error);}
  };
  root.querySelector('#owner-live-enable').onclick=()=>act(true);
  root.querySelector('#owner-live-disable').onclick=()=>act(false);
  root.querySelector('#owner-live-refresh').onclick=()=>showLiveSelling({showError});
 }catch(error){root.innerHTML='<section class="box"><h2>LIVE Selling</h2><p>Status unavailable. No switch was changed.</p></section>';showError(error);}
}
