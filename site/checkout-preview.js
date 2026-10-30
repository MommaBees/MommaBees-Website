// Safe, non-transactional preview checkout. It never reserves stock, takes payment,
// sends customer data, or writes an order; it is strictly for visual walkthroughs.
import {money,escapeHtml as e,currentUser} from './api.js';
import {packageTotal} from './selling-units.js';
export function showCheckoutPreview({cart,all,layout}){
 const rows=cart.map(item=>({name:String(item.name||'Product'),qty:Number(item.quantity)||0,
  amount:packageTotal(Number(item.price_cents)||0,Number(item.quantity)||0),
  type:item.mode==='showcase'?'Showcase preview':item.mode==='ready'?'Ready to Sell':'Preorder'}));
 const subtotal=rows.reduce((total,row)=>total+row.amount,0);
 const days=(all.days||[]).filter(d=>d.enabled&&d.date&&new Date(d.cutoff_at)>new Date()).sort((a,b)=>a.date.localeCompare(b.date));
 const settings=all.settings||{};
 layout('<section class="section checkout-preview"><div class="checkout-preview-title"><h1>Checkout Preview</h1><p>This is a demonstration of the next checkout step. No order will be submitted, no inventory will be reserved, and no payment will be taken.</p></div>'+
  '<div class="cols"><section class="box"><h2>Pickup / Delivery Schedule</h2>'+
  '<label class="field">Fulfillment method<select id="preview-method"><option value="pickup">Local pickup</option><option value="delivery">Local delivery</option></select></label>'+
  '<label class="field">Available bakery or fair day<select id="preview-day"><option value="">Choose a date</option>'+
  days.map(d=>'<option value="'+e(d.date)+'">'+e(d.date)+(d.event_label?' — '+e(d.event_label):'')+'</option>').join('')+'</select></label>'+
  '<label class="field">Pickup / delivery time<select id="preview-window"><option value="">Select a date first</option></select></label>'+
  (!days.length?'<p class="small">No currently eligible fulfillment dates are published. This is still a checkout layout preview.</p>':'')+
  '<h2>Customer Information</h2><form id="preview-checkout-form" autocomplete="off">'+
  '<div class="field"><label>First name<input name="first_name" autocomplete="given-name" placeholder="First name"></label></div>'+
  '<div class="field"><label>Last name<input name="last_name" autocomplete="family-name" placeholder="Last name"></label></div>'+
  '<div class="field"><label>Street address<input name="street" autocomplete="street-address"></label></div>'+
  '<div class="field"><label>City<input name="city"></label></div>'+
  '<div class="field"><label>State<input name="state"></label></div>'+
  '<div class="field"><label>ZIP code<input name="zip" inputmode="numeric"></label></div>'+
  '<div class="field"><label>Email address<input name="email" type="email" value="'+e(currentUser()?.email||'')+'"></label></div>'+
  '<div class="field"><label>Preferred contact method<select name="contact_method"><option>Email</option><option>Text message (opt-in required for real orders)</option></select></label></div>'+
  '<div class="field"><label>Special instructions<textarea name="instructions" maxlength="1000"></textarea></label></div>'+
  '<button type="button" class="button secondary" id="preview-close">Back to Cart</button></form></section>'+
  '<aside class="box"><h2>Order Summary — Preview</h2>'+
  rows.map(r=>'<div class="lineitem"><div>'+e(r.name)+' <span class="small">('+e(r.type)+')</span> × '+r.qty+'</div><strong>'+money(r.amount)+'</strong></div>').join('')+
  '<p class="total">Item subtotal: '+money(subtotal)+'</p>'+
  '<p class="small">Delivery fees, discounts and applicable taxes are not calculated in preview mode.</p>'+
  '<h3>Payment Options</h3><p>Online card payment with Stripe</p><p>Pay at Pickup (when available)</p>'+
  '<button type="button" class="button" disabled aria-disabled="true">Place Order — Disabled in Preview</button>'+
  '<p class="small">This preview does not validate inventory, service areas, taxes, scheduling, or payment eligibility.</p></aside></div></section>');
 const day=document.getElementById('preview-day'),method=document.getElementById('preview-method'),window=document.getElementById('preview-window');
 const refresh=()=>{
  const d=days.find(x=>x.date===day.value);
  const raw=method.value==='delivery'?d?.delivery_windows:d?.pickup_windows;
  const options=(Array.isArray(raw)?raw:String(raw||'').split(',')).map(x=>String(x).trim()).filter(Boolean);
  window.innerHTML='<option value="">'+(options.length?'Select a time':'No scheduled windows')+'</option>'+options.map(v=>'<option value="'+e(v)+'">'+e(v)+'</option>').join('');
 };
 day.onchange=refresh;method.onchange=refresh;
 document.getElementById('preview-close').onclick=()=>{location.hash='#cart';};
 document.getElementById('preview-checkout-form').onsubmit=event=>event.preventDefault();
}
