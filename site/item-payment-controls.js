// Owner/Admin item-level payment permissions. Showcase rows use their linked real product.
// These settings NEVER enable global LIVE checkout or bypass tax and pickup release gates.
import {list,update,money,escapeHtml as e} from './api.js';

const truth=value=>value===true;
const action=key=>document.querySelector('[data-panel="'+key+'"]')?.click();
const paymentLabels=p=>(truth(p.online_payment_enabled)?'Online enabled':'Online off')+' · '+(truth(p.pay_at_pickup_enabled)?'Pickup enabled':'Pickup off');

export async function showItemPayments({showError}){
 const root=document.querySelector('#admin-main');if(!root)return;
 root.innerHTML='<section class="box"><h2>Item Payment Controls</h2><p>Loading product and showcase payment permissions…</p></section>';
 try{
  const [products,showcase,settings]=await Promise.all([
   list('products',{limit:500}),
   list('store_showcase_items',{limit:500}),
   list('site_settings',{limit:1})
  ]);
  const byId=new Map(products.map(p=>[p.id,p]));
  const site=settings.find(x=>x.id===1)||{};
  const productRows=products.map(p=>`
   <tr data-payment-product="${e(p.id)}">
    <td><strong>${e(p.name)}</strong><div class="small">${e(p.department||'')} · ${money(p.price_cents||0)} · ${p.published?'Published':'Unpublished'}</div></td>
    <td><label class="admin-boolean-toggle"><input type="checkbox" data-method="online" ${p.online_payment_enabled?'checked':''}> Online Stripe</label></td>
    <td><label class="admin-boolean-toggle"><input type="checkbox" data-method="pickup" ${p.pay_at_pickup_enabled?'checked':''}> Pay at Pickup</label></td>
    <td><button type="button" class="button secondary" data-save-payment="${e(p.id)}">Save</button></td>
   </tr>`).join('');
  const showcaseRows=showcase.map(item=>{
   const p=item.product_id?byId.get(item.product_id):null;
   return `<tr>
    <td><strong>${e(item.name)}</strong><div class="small">${e(item.department||'')} · ${item.active?'Displayed':'Hidden'}</div></td>
    <td>${p?e(p.name):'<span class="muted">No sale product linked</span>'}</td>
    <td>${p?e(paymentLabels(p)):'Display only — no payment accepted'}</td>
    <td>${p?'<button type="button" class="button secondary" data-linked-payment="'+e(p.id)+'">Edit payment settings</button>':
     '<button type="button" class="button secondary" data-link-showcase>Link a sale product</button>'}</td>
   </tr>`;
  }).join('');
  root.innerHTML='<section class="box item-payment-controls">'+
   '<h2>Item Payment Controls</h2>'+
   '<p>Control which payment methods each <strong>real product</strong> may accept. A visible Product Showcase item does not take payments until it is linked to a published sale product with a permitted method, valid inventory and an approved fulfillment date.</p>'+
   '<p class="small">Online Stripe checkout: '+(site.checkout_enabled?'enabled at storefront level':'disabled at storefront level')+
   ' · Pay at Pickup: '+(site.pay_at_pickup_enabled?'enabled at site level':'disabled at site level')+
   '. These item permissions do not override either global setting, tax review, or the Cloudflare LIVE emergency switch.</p>'+
   '<h3>Real Products ('+products.length+')</h3>'+
   (products.length?'<div class="table-wrap"><table><thead><tr><th>Product</th><th>Online Stripe</th><th>Pay at Pickup</th><th>Action</th></tr></thead><tbody>'+
   productRows+'</tbody></table></div>':'<p class="small">No real sale products exist yet. Create them in Products, then return to enable their payment methods.</p>')+
   '<div class="actions"><button type="button" class="button secondary" id="open-payment-products">Open Products</button></div>'+
   '<h3>Product Showcase ('+showcase.length+')</h3>'+
   '<p class="small">Showcase items inherit payment permissions from their linked real product. The showcase price and preview quantity do not create Stripe inventory or sale eligibility.</p>'+
   (showcase.length?'<div class="table-wrap"><table><thead><tr><th>Showcase item</th><th>Sale product</th><th>Payment status</th><th>Action</th></tr></thead><tbody>'+
   showcaseRows+'</tbody></table></div>':'<p class="small">No Product Showcase entries.</p>')+
   '<p class="small" id="item-payment-status" role="status" aria-live="polite"></p></section>';
  root.querySelector('#open-payment-products').onclick=()=>action('products');
  root.querySelectorAll('[data-link-showcase]').forEach(button=>button.onclick=()=>action('store_showcase_items'));
  root.querySelectorAll('[data-linked-payment]').forEach(button=>button.onclick=()=>{
   const id=button.dataset.linkedPayment;
   const row=root.querySelector('[data-payment-product="'+id+'"]');
   if(row){row.scrollIntoView({behavior:'smooth',block:'center'});row.querySelector('[data-method="online"]')?.focus();}
   else action('products');
  });
  root.querySelectorAll('[data-save-payment]').forEach(button=>button.onclick=async()=>{
   const id=button.dataset.savePayment,row=root.querySelector('[data-payment-product="'+id+'"]');
   const p=byId.get(id);if(!p||!row)return;
   const online=row.querySelector('[data-method="online"]').checked;
   const pickup=row.querySelector('[data-method="pickup"]').checked;
   const status=root.querySelector('#item-payment-status');
   button.disabled=true;status.textContent='Saving '+p.name+' payment methods…';
   try{
    await update('products',id,{online_payment_enabled:online,pay_at_pickup_enabled:pickup});
    status.textContent=p.name+' payment methods saved. Reloading the item permissions…';
    await showItemPayments({showError});
   }catch(error){
    status.textContent='Payment controls could not be saved; no success was recorded.';
    button.disabled=false;
    showError(error);
   }
  });
 }catch(error){
  root.innerHTML='<section class="box"><h2>Item Payment Controls</h2><p>Payment controls could not be loaded. No settings were changed.</p></section>';
  showError(error);
 }
}
