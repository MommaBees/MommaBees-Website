// Account inactivity policy: all roles, default five minutes.
export const IDLE_OPTIONS=Object.freeze([1,3,5,10,15,20,25,30,45,60]);
export const DEFAULT_IDLE=5;
export const normalizeIdle=n=>IDLE_OPTIONS.includes(Number(n))?Number(n):DEFAULT_IDLE;
export const isIdle=(last,minutes,now=Date.now())=>Number.isFinite(last)&&now-last>=normalizeIdle(minutes)*60000;
let stop=null;
export function stopIdleWatch(){stop?.();stop=null}
export function resetIdleStamp(userId,storage=localStorage){if(!userId)return;try{storage.removeItem('mbee_revoked_'+userId);storage.setItem('mbee_activity_'+userId,String(Date.now()))}catch{}}
export function revokeIdleStamp(userId,storage=localStorage){if(!userId)return;try{storage.setItem('mbee_revoked_'+userId,'1');storage.removeItem('mbee_activity_'+userId)}catch{}}
export function idleActivityTime(userId,storage=localStorage){
 const time=Number(storage.getItem('mbee_activity_'+userId));
 return Number.isFinite(time)&&time>0?time:0;
}
export function startIdleWatch({userId,minutes,onExpire,root=document,storage=localStorage,now=()=>Date.now()}){
 if(!userId||!onExpire)throw Error('Account session is required');
 stopIdleWatch();
 const duration=normalizeIdle(minutes),key='mbee_activity_'+userId,revoked='mbee_revoked_'+userId;
 let last=idleActivityTime(userId,storage)||now(),done=false;
 if(!idleActivityTime(userId,storage))storage.setItem(key,String(last));
 const check=()=>{
  if(done)return true;
  const shared=idleActivityTime(userId,storage);
  if(shared>last&&shared<=now())last=shared;
  if(storage.getItem(revoked)==='1'||isIdle(last,duration,now())){
   done=true;revokeIdleStamp(userId,storage);
   Promise.resolve().then(onExpire).finally(()=>stopIdleWatch());
   return true;
  }
  return false;
 };
 const activity=()=>{
  if(check())return;
  const time=now();
  if(time-last<10000)return;
  last=time;try{storage.setItem(key,String(last))}catch{}
 };
 const checkOnFocus=()=>{if(!check())activity()};
 const events=['pointerdown','keydown','touchstart','scroll'];
 for(const event of events)root.addEventListener(event,activity,{passive:true});
 root.addEventListener('visibilitychange',checkOnFocus);
 window.addEventListener('focus',checkOnFocus);
 window.addEventListener('storage',check);
 const ticker=setInterval(check,5000);
 const cleanup=()=>{
  clearInterval(ticker);for(const event of events)root.removeEventListener(event,activity);
  root.removeEventListener('visibilitychange',checkOnFocus);
  window.removeEventListener('focus',checkOnFocus);
  window.removeEventListener('storage',check);
 };
 stop=cleanup;check();return cleanup;
}
