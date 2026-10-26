// Dependency-free browser adapter for Supabase REST + Auth. Never handles server secrets.
export const config = window.MAMMA_BEES_CONFIG || {};
export const isConfigured = () => /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl||'') && !String(config.supabasePublishableKey||'').startsWith('PASTE_');
const url = (path) => config.supabaseUrl + path;
const key = () => config.supabasePublishableKey;
let session = null;
try { session = JSON.parse(sessionStorage.getItem('mb_session')||'null'); } catch { session = null; }
export const currentSession = () => session;
export const currentUser = () => session?.user || null;
function saveSession(s){session=s; if(s) sessionStorage.setItem('mb_session',JSON.stringify(s));else sessionStorage.removeItem('mb_session');}
async function refresh(){
 if(!session?.refresh_token) return;
 const r=await fetch(url('/auth/v1/token?grant_type=refresh_token'),{method:'POST',headers:{'apikey':key(),'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
 const body=await r.json(); if(!r.ok){saveSession(null);throw Error(body.msg||body.error_description||'Please sign in again');} saveSession(body);
}
function headers(extra={}){return {'apikey':key(),...(session?.access_token?{'Authorization':'Bearer '+session.access_token}:{}),...extra};}
export async function request(path,options={}){
 if(!isConfigured()) throw Error('Supabase is not configured. See README.md.');
 if(session?.expires_at && session.expires_at*1000 < Date.now()+60000) await refresh();
 const method=options.method||'GET';
 const init={method,headers:headers(options.body!==undefined?{'Content-Type':'application/json'}:{})};
 if(options.body!==undefined)init.body=JSON.stringify(options.body);
 if(options.prefer)init.headers.Prefer=options.prefer;
 let r=await fetch(url(path),init);
 if(r.status===401 && session?.refresh_token){ await refresh();init.headers=headers(options.body!==undefined?{'Content-Type':'application/json'}:{});if(options.prefer)init.headers.Prefer=options.prefer;r=await fetch(url(path),init); }
 const data=r.status===204?null:await r.json().catch(()=>null);
 if(!r.ok)throw Error(data?.message||data?.error_description||`Request failed (${r.status})`);
 return data;
}
const qs = (obj) => Object.entries(obj||{}).filter(([,v])=>v!==undefined&&v!==null).map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');
export async function list(table,params={}){return request('/rest/v1/'+table+'?'+qs({select:'*',...params}));}
export async function add(table,record){return request('/rest/v1/'+table,{method:'POST',body:record,prefer:'return=representation'}).then(r=>r?.[0]);}
export async function update(table,id,values,keyName='id'){return request('/rest/v1/'+table+'?'+keyName+'=eq.'+encodeURIComponent(id),{method:'PATCH',body:values,prefer:'return=representation'}).then(r=>r?.[0]);}
export async function remove(table,id,keyName='id'){return request('/rest/v1/'+table+'?'+keyName+'=eq.'+encodeURIComponent(id),{method:'DELETE'});}
export async function rpc(name,args){return request('/rest/v1/rpc/'+name,{method:'POST',body:args});}
export async function signIn(email,password,captchaToken){
 const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,captcha_token:captchaToken})});
 const body=await r.json().catch(()=>({}));if(!r.ok)throw Error(body.error||'Sign in failed');
 saveSession(body);return body;
}
export async function signUp(email,password,profile,captchaToken){
 const r=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...profile,email,password,captcha_token:captchaToken})});
 const body=await r.json().catch(()=>({}));if(!r.ok)throw Error(body.error||'Registration failed');
 if(body.access_token)saveSession(body);return body;
}
export async function signOut(){
 if(session?.access_token)await fetch(url('/auth/v1/logout'),{method:'POST',headers:headers()}).catch(()=>{});saveSession(null);
}
export async function upload(bucket,file,options={}){
 if(!session?.access_token)throw Error('Sign in before uploading photos.');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('Upload JPG, PNG or WebP images up to 5MB.');
 const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
 const path=(bucket==='review-photos'?currentUser().id+'/':bucket==='message-photos'?currentUser().id+'/'+options.messageId+'/':'')+crypto.randomUUID()+'.'+ext;
 if(bucket==='message-photos'&&!/^[0-9a-f-]{36}$/.test(String(options.messageId||'')))throw Error('A saved message is required before photo upload');
 const r=await fetch(url('/storage/v1/object/'+bucket+'/'+path),{method:'POST',headers:headers({'Content-Type':file.type,'x-upsert':'false'}),body:file});
 const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.message||'Upload failed');
 return {path,url:bucket==='product-photos'?url('/storage/v1/object/public/'+bucket+'/'+path):null};
}
export const getPublicImage = (bucket,path) => url('/storage/v1/object/public/'+bucket+'/'+path);
export async function signedImage(bucket,path){
 const data=await request('/storage/v1/object/sign/'+bucket+'/'+path,{method:'POST',body:{expiresIn:300}});
 return data?.signedURL?url('/storage/v1')+data.signedURL:null;
}
export const money = cents => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format((Number(cents)||0)/100);
export const escapeHtml = input => String(input??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
export const safePhoto = value => { try {const u=new URL(value,location.origin);return ['https:','http:'].includes(u.protocol)?escapeHtml(u.href):'';}catch{return '';} };
export const currentDate = () => new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/Chicago'}).format(new Date());
export const futureDate = (d) => new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/Chicago'}).format(new Date(Date.now()+d*86400000));
export const fmt = d => d?new Date(d.length===10?d+'T12:00:00':d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Chicago'}):'—';
export const pretty = s => String(s).replaceAll('_',' ').replace(/\b\w/g,x=>x.toUpperCase());
