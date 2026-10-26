export async function createStripeSession(env,fields){
 if(!env.STRIPE_SECRET_KEY)throw Error('Stripe API key is not configured');
 const form=new URLSearchParams();Object.entries(fields).forEach(([k,v])=>{if(v!==null&&v!==undefined)form.set(k,String(v));});
 const result=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY,'Content-Type':'application/x-www-form-urlencoded'},body:form});
 const data=await result.json();if(!result.ok)throw Error(data?.error?.message||'Stripe did not create a checkout session');return data;
}
export async function verifyStripeSignature(request,secret,raw){
 if(!secret)throw Error('Stripe webhook signing secret is not configured');
 const signature=request.headers.get('Stripe-Signature')||'';
 const params=Object.fromEntries(signature.split(',').map(x=>x.split('=',2)));
 const ts=Number(params.t);if(!Number.isFinite(ts)||Math.abs(Date.now()/1000-ts)>300)return false;
 const sigs=signature.split(',').filter(x=>x.startsWith('v1=')).map(x=>x.slice(3).toLowerCase());
 if(!sigs.length)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ts+'.'+raw)));
 const expected=[...mac].map(x=>x.toString(16).padStart(2,'0')).join('');
 return sigs.some(s=>s.length===expected.length&&s.split('').reduce((acc,ch,i)=>acc|(ch.charCodeAt(0)^expected.charCodeAt(i)),0)===0);
}
