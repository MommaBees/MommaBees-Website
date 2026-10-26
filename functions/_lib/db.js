export function response(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});}
export async function db(env,path,{method='GET',body,prefer}={}){
 if(!env.SUPABASE_URL||!env.SUPABASE_SECRET_KEY)throw Error('Server database credentials are not configured');
 const endpoint=env.SUPABASE_URL.replace(/\/$/,'')+path;
 const headers={apikey:env.SUPABASE_SECRET_KEY};
 // New sb_secret_ keys are API keys, NOT bearer JWTs.
 if(!env.SUPABASE_SECRET_KEY.startsWith('sb_secret_'))headers.Authorization='Bearer '+env.SUPABASE_SECRET_KEY;
 if(body!==undefined)headers['content-type']='application/json';
 if(prefer)headers.Prefer=prefer;
 const result=await fetch(endpoint,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 const payload=await result.json().catch(()=>null);
 if(!result.ok){console.error('Database operation rejected:',result.status,payload?.code);throw Error(payload?.message||'Database query failed');}
 return payload;
}
export const rpc=(env,name,body)=>db(env,'/rest/v1/rpc/'+name,{method:'POST',body});
export const sha256=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');
export const randomToken=()=>[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function getVerifiedUser(env,request){const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');if(!token)return null;
 const r=await fetch(env.SUPABASE_URL+'/auth/v1/user',{headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+token}});
 if(!r.ok)throw Error('Session has expired. Please sign in again.');return r.json();}
export function origin(env){const str=String(env.SITE_URL||'').replace(/\/$/,'');if(!/^https:\/\//.test(str)&&!/^http:\/\/localhost(?::\d+)?$/.test(str))throw Error('SITE_URL must be configured');return str;}
export function limited(s,max=1000){return String(s??'').slice(0,max);}
