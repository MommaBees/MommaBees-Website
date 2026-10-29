// Staff-only sandbox shopping experience. Never shares the real cart or order endpoints.
import {currentSession,money,escapeHtml as e} from './api.js';
import {sandboxProductPhoto} from './stock-photography.js';
import {sellingUnitLabel,validCartQuantity} from './selling-units.js';
const KEY='mb_sandbox_cart';
function getCart(){try{const result=JSON.parse(sessionStorage.getItem(KEY)||'[]');return Array.isArray(result)?result:[];}catch{return [];}}
function saveCart(items){sessionStorage.setItem(KEY,JSON.stringify(items));}
const findItem=(items,id)=>items.find(item=>item.id===id&&item.enabled===true);
const protectedPage=(allowed,layout)=>{
 if(allowed)return false;
 layout('<section class="section box"><h1>Sandbox unavailable</h1><p>This page is restricted to bakery Owner/Admin testing.</p><a href="#shop">Return to Shop All</a></section>');
 return true;
};
export function sandboxProductPage({id,items,allowed,layout,nav,showError}){
 if(protectedPage(allowed,layout))return;
 const item=findItem(items,id);
 if(!item){layout('<section class="section box"><h1>Sandbox product unavailable</h1><a href="#shop">Return to Shop All</a></section>');return;}
 const image=sandboxProductPhoto(item),unit=sellingUnitLabel(item.unit);
 layout('<section class="section sandbox-product-detail"><p class="eyebrow">Staff-only · Stripe TEST · No real inventory</p>'+
  '<a href="#shop">Back to the test menu</a><div class="detail"><div><img class="detail-photo" src="'+e(image.url)+'" alt="'+e(item.name)+' illustration">'+
  '<p class="small">Illustrative artwork — not an actual product photograph.</p></div><div><h1>'+e(item.name)+'</h1>'+
  '<p class="price">'+money(item.price_cents)+' / '+e(unit)+'</p>'+
  '<section class="product-description"><h2>Description</h2><p>'+e(item.description||'No TEST description entered.')+'</p></section>'+
  '<form id="sandbox-add-form"><label for="sandbox-qty"># Qty ('+e(unit)+' packages)</label>'+
  '<div class="product-quantity-control"><span class="qty-input-wrap"><input id="sandbox-qty" type="number" min="1" max="30" step="1" value="1" inputmode="numeric" required><span class="qty-arrows"><button type="button" data-qty-arrow="1" aria-label="Increase quantity">▲</button><button type="button" data-qty-arrow="-1" aria-label="Decrease quantity">▼</button></span></span></div>'+
  '<p id="sandbox-item-total" aria-live="polite"></p><button class="button" type="submit">Add to Sandbox Cart</button>'+
  '<a href="#sandbox-cart" class="button secondary">View Sandbox Cart</a></form>'+
  '<section class="product-ingredient-details"><h2>Ingredients</h2><p>'+e(item.ingredients||'No ingredient information recorded for this TEST item.')+'</p>'+
  '<h2>Allergens</h2><p>'+e(item.allergens||'No allergens have been recorded for this TEST item. Never rely on a test listing for allergy information.')+'</p>'+
  (item.storage_notes?'<h2>Storage & Handling</h2><p>'+e(item.storage_notes)+'</p>':'')+'</section>'+
  '<p class="small">TEST transactions do not create customer orders or reserve products.</p></div></div></section>');
 const qty=document.getElementById('sandbox-qty');
 const total=document.getElementById('sandbox-item-total');
 const update=()=>total.textContent='TEST item subtotal: '+money(item.price_cents*(Number(qty.value)||1));
 qty.addEventListener('input',update);
 update();
 document.getElementById('sandbox-add-form').onsubmit=event=>{
  event.preventDefault();
  const quantity=Number(qty.value);
  if(!validCartQuantity(quantity))return showError('Select a whole number between 1 and 30 TEST packages.');
  const cart=getCart(),existing=cart.find(row=>row.item_id===item.id);
  if(existing&& !validCartQuantity(existing.quantity+quantity))return showError('Maximum 30 packages per TEST cart item.');
  if(existing)existing.quantity+=quantity;else cart.push({item_id:item.id,quantity});
  saveCart(cart);nav('#sandbox-cart');
 };
}
export function sandboxCartPage({items,allowed,layout,showError}){
 if(protectedPage(allowed,layout))return;
 const cart=getCart();
 const found=cart.map((row,index)=>({row,index,item:findItem(items,row.item_id)}));
 const valid=found.filter(x=>x.item&&validCartQuantity(x.row.quantity));
 const amount=valid.reduce((total,x)=>total+x.row.quantity*x.item.price_cents,0);
 layout('<section class="section sandbox-cart-page"><h1>Sandbox Cart</h1>'+
  '<p class="muted">Staff-only Stripe TEST checkout. This cart is separate from customer orders.</p>'+
  (valid.length?valid.map(({row,index,item})=>'<div class="lineitem sandbox-cart-line"><div><strong>'+e(item.name)+'</strong>'+
   '<p class="small">'+e(sellingUnitLabel(item.unit))+' · '+money(item.price_cents)+' per TEST package</p>'+
   '<label for="sandbox-cart-qty-'+index+'"># Qty</label><span class="qty-input-wrap"><input id="sandbox-cart-qty-'+index+'" data-sandbox-cart-qty="'+index+'" type="number" min="0" max="30" step="1" value="'+row.quantity+'"><span class="qty-arrows"><button type="button" data-qty-arrow="1" aria-label="Increase quantity">▲</button><button type="button" data-qty-arrow="-1" aria-label="Decrease quantity">▼</button></span></span></div>'+
   '<div><strong>'+money(item.price_cents*row.quantity)+'</strong> <button class="button ghost" type="button" data-sandbox-remove="'+index+'">Remove</button></div></div>').join('')+
   '<p class="total">TEST subtotal: '+money(amount)+'</p>'+
   '<button class="button" type="button" id="sandbox-test-checkout"'+(cart.length!==valid.length?' disabled':'')+'>Try Stripe TEST Checkout</button>':
   '<p>Your sandbox cart is empty. Select an item from the example menu.</p>')+
  '<p><a href="#shop">Back to example menu</a></p></section>');
 document.querySelectorAll('[data-sandbox-remove]').forEach(button=>button.onclick=()=>{
  cart.splice(Number(button.dataset.sandboxRemove),1);saveCart(cart);sandboxCartPage({items,allowed,layout,showError});
 });
 document.querySelectorAll('[data-sandbox-cart-qty]').forEach(input=>input.onchange=()=>{
  const index=Number(input.dataset.sandboxCartQty),quantity=Number(input.value);
  if(quantity===0){cart.splice(index,1);saveCart(cart);sandboxCartPage({items,allowed,layout,showError});return;}
  if(!validCartQuantity(quantity)){showError('Choose between 1 and 30 TEST packages.');input.value=String(cart[Number(input.dataset.sandboxCartQty)]?.quantity||1);return;}
  cart[Number(input.dataset.sandboxCartQty)].quantity=quantity;saveCart(cart);sandboxCartPage({items,allowed,layout,showError});
 });
 const button=document.getElementById('sandbox-test-checkout');
 if(button)button.onclick=async()=>{
  button.disabled=true;
  try{
   if(valid.length!==cart.length)throw Error('Remove unavailable sandbox items before TEST checkout.');
   const token=currentSession()?.access_token;
   if(!token)throw Error('Sign in again as Owner/Admin.');
   const response=await fetch('/api/admin/demo-checkout',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({items:cart.map(row=>({item_id:row.item_id,quantity:row.quantity}))})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.error||'Sandbox checkout could not start.');
   if(!/^https:\/\/checkout\.stripe\.com\//.test(data.checkout_url||''))throw Error('Unexpected TEST checkout destination.');
   location.assign(data.checkout_url);
  }catch(error){showError(error);button.disabled=false;}
 };
}
