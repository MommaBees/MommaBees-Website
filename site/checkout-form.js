import {config,currentUser,currentSession,money,escapeHtml as e,currentDate,futureDate,fmt} from './api.js';
import {mountPickupCalendar} from './pickup-calendar.js';
const dollars=n=>money(Math.max(0,Number(n)||0));
export async function showCheckout({cart,all,layout,nav,showError,clearCart}){
 if(!cart.length){nav('#cart');return;}
 const settings=all.settings||{};
 const canFulfillCartOn=date=>cart.every(item=>{
  const product=all.products.find(p=>p.id===item.product_id);
  if(!product||!product.published)return false;
  if(item.mode==='preorder')return date>=futureDate(product.lead_days)&&product.mode!=='ready';
  if(item.mode==='ready')return product.mode!=='preorder'&&
   all.batches.some(batch=>batch.id===item.batch_id&&batch.product_id===product.id&&
    !batch.disabled&&batch.baked_on<=currentDate()&&batch.best_before>=date&&batch.quantity_available>=item.quantity);
  return false;
 });
 const days=(all.days||[]).filter(d=>d.enabled&&d.cutoff_at&&new Date(d.cutoff_at)>new Date()&&
  d.date>=currentDate()&&canFulfillCartOn(d.date)).sort((a,b)=>a.date.localeCompare(b.date));
 const stripeAvailable=settings.checkout_enabled===true;
 const pickupEnabled=settings.pickup_enabled===true;
 const payAtPickup=settings.pay_at_pickup_enabled===true&&
     settings.pay_at_pickup_tax_reviewed===true&&Number.isInteger(settings.pay_at_pickup_tax_rate_bps);
 const anyAvailable=stripeAvailable||payAtPickup;
 const subtotal=cart.reduce((n,i)=>n+i.price_cents*i.quantity,0);
 layout('<section class="section"><h1>Choose Your Pickup Day</h1>'+
  ''+
  '<form id="checkout-form" class="cols"><div class="box"><h2>Pickup / delivery schedule</h2>'+
  '<div class="field"><label for="method">Fulfillment method</label><select name="method" id="method">'+
   (pickupEnabled?'<option value="pickup">Local pickup</option>':'')+
   (settings.delivery_enabled?'<option value="delivery">Local delivery</option>':'')+'</select></div>'+
  '<div class="field"><label for="date">Available bakery or fair day</label><select name="date" id="date" required>'+
   '<option value="">Select an available date</option>'+days.map(d=>
   '<option value="'+e(d.date)+'">'+e(fmt(d.date))+(d.day_type==='fair'?' — '+e(d.event_label||'Bake fair'):' — Baking day')+'</option>').join('')+
   '</select></div>'+
  '<details id="calendar-picker"><summary>Open pickup calendar — highlighted days are available</summary><div id="pickup-calendar" aria-label="Available baking dates calendar"></div></details>'+
  '<div class="field"><label for="window">Available pickup/delivery time</label>'+
    '<select name="window" id="window" required><option value="">Choose a date first</option></select></div>'+
  '<div id="delivery-fields" hidden><p class="small">Delivery is only offered for eligible locations and scheduled dates.</p></div>'+
  '<h2>Customer information</h2><p class="small">Full contact and address details are required.</p>'+
  '<div class="field"><label>First name<input name="first_name" maxlength="60" autocomplete="given-name" required></label></div>'+
  '<div class="field"><label>Last name<input name="last_name" maxlength="60" autocomplete="family-name" required></label></div>'+
  '<div class="field"><label>Street address<input name="street" maxlength="160" autocomplete="street-address" required></label></div>'+
  '<div class="field"><label>City<input name="city" maxlength="80" autocomplete="address-level2" required></label></div>'+
  '<div class="field"><label>State<input name="state" maxlength="30" autocomplete="address-level1" placeholder="State" required></label></div>'+
  '<div class="field"><label>ZIP code<input name="zip" maxlength="10" pattern="[0-9]{5}(-[0-9]{4})?" inputmode="numeric" autocomplete="postal-code" required></label></div>'+
  '<div class="field"><label>Preferred contact method<select name="contact_channel" id="contact-channel">'+
   '<option value="email">Email</option><option value="text">Phone (text messages only)</option></select></label></div>'+
  '<div class="field"><label>Email address<input name="email" id="contact-email" type="email" autocomplete="email" value="'+e(currentUser()?.email||'')+'"></label></div>'+
  '<div class="field"><label>Text-capable phone (optional for email contact)<input name="phone" id="contact-phone" type="tel" autocomplete="tel"></label></div>'+
  '<label id="text-consent-label" class="checkbox" hidden><input name="text_consent" type="checkbox" value="yes"> I consent to text messages about this order only. Marketing texts are not included.</label>'+
  '<div class="field"><label>Special instructions<textarea name="note" maxlength="1000"></textarea></label></div>'+
  '<div class="field"><label>Promotion code (online payment only)<input name="promo" maxlength="60" autocomplete="off"></label></div>'+
  (!currentUser()&&config.turnstileSiteKey?'<div id="pickup-captcha" class="cf-turnstile" data-sitekey="'+e(config.turnstileSiteKey)+'"></div>':'')+
  '</div><div class="box"><h2>Order summary</h2>'+
  cart.map(i=>'<div class="lineitem"><span>'+e(i.name)+' × '+i.quantity+'</span><strong>'+dollars(i.price_cents*i.quantity)+'</strong></div>').join('')+
  '<p class="total">Item subtotal: '+dollars(subtotal)+'</p>'+
  '<fieldset class="payment-choices"><legend>How would you like to pay?</legend>'+
  '<label><input type="radio" name="payment_choice" value="stripe"'+(stripeAvailable?' checked':' disabled')+'> Pay securely online with Stripe'+(!stripeAvailable?' (not available yet)':'')+'</label>'+
  '<label><input type="radio" name="payment_choice" value="pickup"'+(!stripeAvailable&&payAtPickup?' checked':'')+
   ' id="pay-at-pickup-radio" disabled> Pay at pickup (available on selected dates)</label></fieldset>'+
  '<p id="pickup-tax-estimate" class="small" aria-live="polite"></p>'+
  '<p class="small">Pay at pickup does not charge a card now. Staff will record your payment when collected. Taxes are included in the confirmed amount due.</p>'+
  (!anyAvailable?'<div class="notice error">Ordering is not enabled for this bakery yet.</div>':'')+
  '<button type="submit" class="button" id="submit-order"'+(!anyAvailable?' disabled':'')+'>Continue</button>'+
  '</div></form></section>'+
  '<dialog id="unavailable-day-dialog" aria-labelledby="unavailable-title"><h2 id="unavailable-title">Sorry, that day is not available</h2>'+
  '<p>We are not scheduled to bake or offer pickup on <strong id="requested-special-date"></strong>. We would be happy to discuss a special order if the bakery has availability.</p>'+
  '<p id="special-fee-explanation"></p>'+
  '<div class="actions"><button type="button" class="button" id="request-special-day">Contact about a special order</button>'+
  '<button type="button" class="button secondary" id="dismiss-unavailable">Close</button></div></dialog>');
 const form=document.getElementById('checkout-form');
 const date=form.elements.date,method=form.elements.method,windowSelect=form.elements.window;
 const payRadio=document.getElementById('pay-at-pickup-radio');
 const onlineRadio=form.querySelector('[value="stripe"]');
 const submit=document.getElementById('submit-order');
 const consent=form.elements.text_consent;
 const contactChannel=form.elements.contact_channel;
 const email=form.elements.email,phone=form.elements.phone;
 document.getElementById('dismiss-unavailable').onclick=()=>document.getElementById('unavailable-day-dialog').close();
 const resetCaptcha=()=>{if(window.turnstile&&document.getElementById('pickup-captcha'))window.turnstile.reset('#pickup-captcha');};
 const contactChanged=()=>{
  const text=contactChannel.value==='text';
  // Stripe online payments require email even when text contact is preferred.
  email.required=!text||!payRadio.checked;phone.required=text;
  document.getElementById('text-consent-label').hidden=!text;
  consent.required=text;if(!text)consent.checked=false;
 };
 contactChannel.addEventListener('change',contactChanged);contactChanged();
 const updateDate=()=>{
  const selected=days.find(d=>d.date===date.value);
  const isPickup=method.value==='pickup';
  const windows=isPickup?selected?.pickup_windows:selected?.delivery_windows;
  const validMode=isPickup?selected?.pickup_enabled:selected?.delivery_enabled;
  windowSelect.innerHTML='<option value="">Choose an available time</option>'+
    (validMode?(windows||[]):[]).map(w=>'<option value="'+e(w)+'">'+e(w)+'</option>').join('');
  document.getElementById('delivery-fields').hidden=isPickup;
  const payAvailable=isPickup&&payAtPickup&&selected?.pay_at_pickup_available===true;
  payRadio.disabled=!payAvailable;
  if(payRadio.checked&&!payAvailable){payRadio.checked=false;if(stripeAvailable)onlineRadio.checked=true;}
  if(!stripeAvailable&&payAvailable)payRadio.checked=true;
  submit.disabled=!(stripeAvailable||payAvailable);
  if(!stripeAvailable&&!payAvailable)submit.textContent='Pickup payment is unavailable on this date';
  else submit.textContent=payRadio.checked?'Reserve — Pay at Pickup':'Continue to Stripe';
  contactChanged();
  document.getElementById('pickup-tax-estimate').textContent=payRadio.checked&&payAvailable?
    'Estimated total including configured pickup tax: '+dollars(subtotal+Math.round(subtotal*settings.pay_at_pickup_tax_rate_bps/10000))+
    '. Your confirmed total is calculated by the bakery server.':'';
 };
 date.addEventListener('change',updateDate);method.addEventListener('change',updateDate);
 date.addEventListener('focus',()=>{document.getElementById('calendar-picker').open=true;});
 form.querySelectorAll('[name="payment_choice"]').forEach(r=>r.addEventListener('change',updateDate));
 updateDate();
 mountPickupCalendar({days:days.filter(d=>d.pickup_enabled||d.delivery_enabled),
  feeEnabled:settings.special_date_requests_enabled===true,
  feeCents:settings.special_date_convenience_fee_cents||0});
 if(!currentUser()&&config.turnstileSiteKey){
  const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js';
  script.async=true;script.defer=true;document.head.appendChild(script);
 }
 form.onsubmit=async event=>{
  event.preventDefault();
  const f=new FormData(form),choice=String(f.get('payment_choice')||'');
  const selected=days.find(d=>d.date===f.get('date'));
  if(!selected)return showError('Choose a highlighted available baking day.');
  if(choice==='pickup'&&(method.value!=='pickup'||!payAtPickup||!selected.pay_at_pickup_available))
   return showError('Pay at pickup is not available on this date.');
  if(choice==='stripe'&&!stripeAvailable)return showError('Online checkout is not available.');
  if(f.get('contact_channel')==='text'&&!consent.checked)return showError('Consent is required to use text-message contact.');
  if(choice==='stripe'&&!String(f.get('email')||'').trim())return showError('An email address is required for Stripe checkout.');
  const address={street:f.get('street'),city:f.get('city'),state:f.get('state'),zip:f.get('zip'),
   text_contact_consent:f.get('text_consent')==='yes'};
  const items=cart.map(x=>({product_id:x.product_id,mode:x.mode,batch_id:x.batch_id,quantity:x.quantity}));
  const payload={items,date:f.get('date'),window:f.get('window'),method:f.get('method'),
   first_name:f.get('first_name'),last_name:f.get('last_name'),email:f.get('email'),
   phone:f.get('phone'),contact_channel:f.get('contact_channel'),address,
   note:f.get('note'),captcha_token:form.querySelector('[name="cf-turnstile-response"]')?.value||''};
  const original=submit.textContent;
  submit.disabled=true;submit.textContent='Submitting…';
  try{
   const route=choice==='pickup'?'/api/pay-at-pickup':'/api/checkout';
   const body=choice==='pickup'?payload:{
    items,date:payload.date,window:payload.window,method:payload.method,
    name:payload.first_name+' '+payload.last_name,first_name:payload.first_name,last_name:payload.last_name,email:payload.email,phone:payload.phone,
    address,guest_address:address,contact_channel:payload.contact_channel,promo_code:f.get('promo'),note:payload.note
   };
   const response=await fetch(route,{method:'POST',headers:{'Content-Type':'application/json',
    ...(currentSession()?.access_token?{Authorization:'Bearer '+currentSession().access_token}:{})},
    body:JSON.stringify(body)});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||'The bakery could not record this order');
   sessionStorage.setItem('mb_latest_order',JSON.stringify({id:result.order_id,token:result.guest_token}));
   if(choice==='pickup'){
    layout('<section class="section box"><h1>Pickup reservation received</h1>'+
    '<p>Your order reference is <strong>'+e(result.order_id)+'</strong>.</p>'+
    '<p>Payment due when you collect the order: <strong>'+dollars(result.amount_due_cents)+'</strong>.</p>'+
    '<p>No online payment was taken. We will contact you using your selected contact method if needed.</p>'+
    '<a href="#shop" class="button secondary">Return to shop</a></section>');
    clearCart();return;
   }
   if(result.checkout_url)location.assign(result.checkout_url);
   else throw Error('Stripe did not supply a checkout link');
  }catch(err){showError(err);submit.disabled=false;submit.textContent=original;resetCaptcha();}
 };
}
