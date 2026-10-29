// Necessary site storage is always active. No optional trackers are installed here.
// Any future analytics/marketing integration must check permitsOptionalCookies first.
const STORAGE_KEY='mbee_cookie_consent_v1';
const SESSION_REJECTION_KEY='mbee_cookie_reject_session_v1';
export const COOKIE_PREFERENCES_VERSION='2026-10-27-v1';
const defaults=()=>({necessary:true,analytics:false,marketing:false});
let temporary=null;
let rejectedForSession=false;

function read(storage,key){
 try{return JSON.parse(storage?.getItem(key)||'null');}catch{return null;}
}
function sessionRejection(){
 try{
  const value=read(sessionStorage,SESSION_REJECTION_KEY);
  return value?.version===COOKIE_PREFERENCES_VERSION&&value?.scope==='session' ? value : null;
 }catch{return rejectedForSession?{version:COOKIE_PREFERENCES_VERSION,scope:'session',choices:defaults()}:null;}
}
function saved(){
 const rejected=sessionRejection();
 if(rejected)return rejected;
 try{
  const value=read(localStorage,STORAGE_KEY);
  return value?.version===COOKIE_PREFERENCES_VERSION?value:temporary;
 }catch{return temporary;}
}
export function cookiePreferences(){
 const choices=saved()?.choices;
 return {...defaults(),...(choices||{}),necessary:true};
}
export function permitsOptionalCookies(category){
 return (category==='analytics'||category==='marketing')&&cookiePreferences()[category]===true;
}
export function selectionToChoices(selection){
 return {necessary:true,analytics:selection==='analytics'||selection==='both',
  marketing:selection==='marketing'||selection==='both'};
}
function notify(choices){
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('mommabees:cookie-preferences-changed',{detail:choices}));
}
export function acceptCookieSelection(selection){
 const choices=selectionToChoices(selection);
 const value={version:COOKIE_PREFERENCES_VERSION,choices,recordedAt:new Date().toISOString()};
 // Persist an accepted, explicitly selected preference across future visits.
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));}catch{}
 try{sessionStorage.removeItem(SESSION_REJECTION_KEY);}catch{}
 rejectedForSession=false;
 temporary=value;
 notify(choices);
 paint(false);
 return choices;
}
export function rejectOptionalForSession(){
 const choices=defaults();
 const value={version:COOKIE_PREFERENCES_VERSION,scope:'session',choices,recordedAt:new Date().toISOString()};
 // A rejection is session-only and overrides any earlier persistent acceptance while this tab is active.
 try{sessionStorage.setItem(SESSION_REJECTION_KEY,JSON.stringify(value));}catch{rejectedForSession=true;}
 notify(choices);
 paint(false);
 return choices;
}
function root(){
 let el=document.getElementById('mbee-cookie-controls');
 if(!el){el=document.createElement('div');el.id='mbee-cookie-controls';document.body.appendChild(el);}
 return el;
}
function choiceValue(choice){
 return choice.analytics?(choice.marketing?'both':'analytics'):(choice.marketing?'marketing':'necessary');
}
function paint(open){
 const el=root(),choice=cookiePreferences();
 if(!open&&saved()){el.innerHTML='';return;}
 el.innerHTML='<section class="cookie-dialog" role="region" aria-labelledby="cookie-heading" aria-describedby="cookie-description">'+
 '<div class="cookie-top"><h2 id="cookie-heading">Cookie preferences</h2><p id="cookie-description">Necessary storage supports security, accounts and carts. Choose optional categories if you want to allow them. Reject applies for this browsing session. <a href="#legal/cookies">Cookie policy</a></p></div>'+
 '<div class="cookie-options"><label for="mbee-cookie-selection">Cookie selection</label>'+
 '<select id="mbee-cookie-selection" aria-label="Choose optional cookie categories">'+
 '<option value="necessary">Necessary — Always active</option>'+
 '<option value="analytics">Necessary + Optional analytics</option>'+
 '<option value="marketing">Necessary + Optional marketing</option>'+
 '<option value="both">Necessary + Optional analytics + Optional marketing</option>'+
 '</select></div>'+
 '<div class="cookie-actions"><button type="button" class="button secondary" data-cookie-action="reject">Reject</button>'+
 '<button type="button" class="button" data-cookie-action="accept">Accept</button></div></section>';
 const select=el.querySelector('#mbee-cookie-selection');
 select.value=choiceValue(choice);
 el.querySelector('[data-cookie-action="reject"]').onclick=()=>rejectOptionalForSession();
 el.querySelector('[data-cookie-action="accept"]').onclick=()=>acceptCookieSelection(select.value);
}
export function initCookiePreferences(){
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-cookie-settings]');
  if(button){event.preventDefault();paint(true);}
 });
 window.MommaBeesCookiePreferences=Object.freeze({get:cookiePreferences,permits:permitsOptionalCookies,open:()=>paint(true)});
 paint(false);
}
