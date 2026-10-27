import {response,rpc,db,sha256,randomToken,getVerifiedUser,origin,limited} from '../_lib/db.js';
import {createStripeSession} from '../_lib/stripe.js';
export async function onRequestPost({request,env}){
 let orderId=null;
 try{
  const body=await request.json();if(!body||JSON.stringify(body).length>12000)return response({error:'Cart exceeds allowed size'},400);
  if(!env.STRIPE_SECRET_KEY?.startsWith('sk_test_') && env.LIVE_PAYMENT_ALLOWED!=='yes')return response({error:'Live payments are disabled. Use Stripe TEST keys until live payments are explicitly authorized.'},503);
  if(env.STRIPE_AUTOMATIC_TAX_ENABLED!=='yes')return response({error:'Tax setup is not verified. Configure Stripe Tax and enable STRIPE_AUTOMATIC_TAX_ENABLED only after reviewing applicable bakery tax obligations.'},503);
  const user=await getVerifiedUser(env,request);
  // Guest orders collect a real contact/address even when payment is online.
  const guestAddress=body.guest_address||{};
  const first=String(body.first_name||'').trim();
  const last=String(body.last_name||'').trim();
  const addr=['street','city','state'].every(k=>String(guestAddress?.[k]||'').trim().length>0)
   &&/^\d{5}(?:-\d{4})?$/.test(String(guestAddress?.zip||''));
  if(!user&&(!first||!last||!addr))
   return response({error:'Guest checkout requires first and last name, street address, city, state and ZIP'},400);
  if(!/^[^ @]+@[^ @]+\.[^ @]+$/.test(String(body.email||'')))
   return response({error:'An email address is required for Stripe online payments'},400);

  const guestToken=randomToken();
  const items=body.items?.map(x=>({product_id:String(x.product_id),mode:String(x.mode),batch_id:x.batch_id||null,quantity:Number(x.quantity)}));
  if(!Array.isArray(items)||!items.length||items.length>40||items.some(x=>!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>30))return response({error:'Invalid cart quantities'},400);
  const date=String(body.date||''),window=limited(body.window,60),method=body.method;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!window||!['pickup','delivery'].includes(method))return response({error:'Select an eligible fulfillment date and time window'},400);
  const guestHash=await sha256(guestToken);
  const reserved=await rpc(env,'reserve_checkout',{
    p_items:items,p_date:date,p_window:window,p_method:method,
    p_email:user?.email||limited(body.email,254),p_name:limited(body.name,120),p_phone:limited(body.phone,50),
    p_user_id:user?.id||null,p_address:method==='delivery'?body.address:null,
    p_note:limited(body.note,1000),p_code:limited(body.promo_code,60)||null,p_guest_hash:guestHash
  });
  orderId=reserved.order_id;
  if(addr)await db(env,'/rest/v1/orders?id=eq.'+orderId,{method:'PATCH',body:{
   guest_contact_address:{
    street:limited(guestAddress.street,160),city:limited(guestAddress.city,80),
    state:limited(guestAddress.state,30),zip:limited(guestAddress.zip,10),
    text_contact_consent:guestAddress.text_contact_consent===true
   },
   contact_channel:body.contact_channel==='text'?'text':'email'
  }});

  if(reserved.amount_cents<50)throw Error('Order amount must be at least $0.50. Please contact the bakery for a fully discounted order.');
  const site=origin(env);
  const params={mode:'payment','client_reference_id':orderId,'customer_email':user?.email||limited(body.email,254),
    'line_items[0][price_data][currency]':'usd',
    'line_items[0][price_data][unit_amount]':reserved.amount_cents,
    'line_items[0][price_data][product_data][name]':"Mamma Bee's Bakery order "+orderId.slice(0,8),
    'line_items[0][quantity]':'1',
    'automatic_tax[enabled]':'true',
    'billing_address_collection':'required',
    'expires_at':String(Math.floor(Date.now()/1000)+1800),
    'success_url':site+'/#success', 'cancel_url':site+'/#cart',
    'metadata[order_id]':orderId
  };
  const session=await createStripeSession(env,params);
  return response({checkout_url:session.url,order_id:orderId,guest_token:guestToken});
 }catch(err){console.error('Checkout error:',err?.message);if(orderId)await rpc(env,'release_checkout',{p_order_id:orderId,p_reason:'failed'}).catch(x=>console.error('Could not release reservation',x.message));return response({error:err?.message||'Checkout unavailable'},400);}
}
