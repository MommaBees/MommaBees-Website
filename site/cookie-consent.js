// Browser consent preferences. No optional trackers are installed by this module.
// Future analytics or marketing integrations MUST read permits() before loading.
const STORAGE_KEY='mbee_cookie_consent_v1';
export const COOKIE_PREFERENCES_VERSION='2026-10-27-v1';
const defaults=()=>({necessary:true,analytics:false,marketing:false});
let temporary=null;
function saved(){
 try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return value?.version===COOKIE_PREFERENCES_VERSION?value:null;}
 catch{return temporary;}
}
export function cookiePreferences(){const s=saved();return {...defaults(),...(s?.choices||{}) ,necessary:true};}
export function permitsOptionalCookies(category){return (category==='analytics'||category==='marketing')&&cookiePreferences()[category]===true;}
function record(choices){
 const value={version:COOKIE_PREFERENCES_VERSION,choices:{necessary:true,analytics:choices.analytics===true,marketing:choices.marketing===true},recordedAt:new Date().toISOString()};
 temporary=value;
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));}catch{}
 window.dispatchEvent(new CustomEvent('mommabees:cookie-preferences-changed',{detail:value.choices}));
 paint(false);
}
function root(){let el=document.getElementById('mbee-cookie-controls');if(!el){el=document.createElement('div');el.id='mbee-cookie-controls';document.body.appendChild(el);}return el;}
function paint(open){
 const el=root(),choice=cookiePreferences();
 const visible=open||!saved();
 if(!visible){el.innerHTML='';return;}
 el.innerHTML='<section class="cookie-dialog" role="region" aria-labelledby="cookie-heading" aria-describedby="cookie-description">'+
 '<div class="cookie-top"><div><h2 id="cookie-heading">Cookie preferences</h2><p id="cookie-description">Necessary site storage supports accounts, security, and your cart. Optional analytics and marketing technologies remain off unless you enable them. <a href="#legal/cookies">Cookie policy</a></p></div></div>'+
 '<div class="cookie-options"><label><input type="checkbox" checked disabled> Necessary <span>Always active</span></label>'+
 '<label><input type="checkbox" id="mbee-analytics" '+(choice.analytics?'checked':'')+'> Optional analytics</label>'+
 '<label><input type="checkbox" id="mbee-marketing" '+(choice.marketing?'checked':'')+'> Optional marketing</label></div>'+
 '<div class="cookie-actions"><button type="button" class="button secondary" data-cookie-action="reject">Reject optional</button>'+
 '<button type="button" class="button secondary" data-cookie-action="save">Save choices</button>'+
 '<button type="button" class="button" data-cookie-action="accept">Accept optional</button></div></section>';
 const reject=el.querySelector('[data-cookie-action="reject"]'),accept=el.querySelector('[data-cookie-action="accept"]'),save=el.querySelector('[data-cookie-action="save"]');
 reject.onclick=()=>record(defaults());
 accept.onclick=()=>record({analytics:true,marketing:true});
 save.onclick=()=>record({analytics:el.querySelector('#mbee-analytics').checked,marketing:el.querySelector('#mbee-marketing').checked});
}
export function initCookiePreferences(){
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-cookie-settings]');
  if(button){event.preventDefault();paint(true);}
 });
 // Consumers can check the permission before loading any optional integration.
 window.MommaBeesCookiePreferences=Object.freeze({get:cookiePreferences,permits:permitsOptionalCookies,open:()=>paint(true)});
 paint(false);
}
