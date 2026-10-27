import {config,isConfigured,currentUser,currentSession,signIn,signUp,signOut,list,add,update,upload,signedImage,request,money,escapeHtml as e,safePhoto as photo,currentDate,futureDate,fmt} from './api.js';
import {isBackOfficeRole,backOfficeNavigation} from './role-navigation.js';
let all={categories:[],products:[],batches:[],days:[],photos:[],announcements:[],pastBakes:[],demoItems:[],settings:{},reviews:[]};
let cart=JSON.parse(sessionStorage.getItem('mb_cart')||'[]');
let checkoutMode='pickup';
let verifiedBackOfficeRole=null;
async function refreshBackOfficeRole(){
 verifiedBackOfficeRole=null; // Fail closed until current database role is verified.
 const user=currentUser();
 if(!user?.id || !isConfigured())return;
 try{
  const roles=await list('staff_roles',{select:'role',user_id:'eq.'+user.id,limit:1});
  const role=roles.find(x=>isBackOfficeRole(x.role))?.role;
  verifiedBackOfficeRole=role||null;
 }catch(err){
  console.warn('Bakery staff role lookup unavailable; hiding private navigation.');
 }
}

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const nav=(hash)=>location.hash=hash;
const saveCart=()=>sessionStorage.setItem('mb_cart',JSON.stringify(cart));
const showError=(ex)=>{const box=$('#feedback');if(box){box.innerHTML='<div role="alert" class="notice error">'+e(ex?.message||ex)+'</div>';box.scrollIntoView({behavior:'smooth',block:'nearest'});} else alert(ex?.message||ex);};

async function startSandboxCheckout(id){
 if(!['owner','admin'].includes(verifiedBackOfficeRole))throw Error('Only bakery management can access test checkout');
 const token=currentSession()?.access_token;
 if(!token)throw Error('Please sign in again');
 const r=await fetch('/api/admin/demo-checkout',{method:'POST',
  headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({item_id:id})});
 const json=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(json.error||'Sandbox checkout is unavailable');
 if(!/^https:\/\/checkout\.stripe\.com\//.test(json.checkout_url||''))throw Error('Invalid checkout redirect');
 location.assign(json.checkout_url);
}
function demoStorePreview(){
 if(!['owner','admin'].includes(verifiedBackOfficeRole)||all.settings.demo_store_enabled!==true)return '';
 const products=all.demoItems.filter(x=>x.enabled===true);
 return '<section class="section demo-store"><h2>Sandbox Test Store — Owner/Admin Only</h2>'+
 '<p class="muted">These are fictitious examples for testing Stripe. No actual bakery products, inventory, orders or live charges are involved.</p>'+
 '<div class="grid">'+products.map(x=>
 '<article class="card"><div class="card-content"><span class="badge">TEST ONLY</span><h3>'+e(x.name)+'</h3>'+
 '<p class="small">'+e(x.category)+' · '+e(x.description)+'</p>'+
 '<p class="price">'+money(x.price_cents)+' / '+e(x.unit)+'</p>'+
 '<button type="button" class="button secondary" data-demo-checkout="'+e(x.id)+'">Test Stripe checkout</button></div></article>').join('')+
 '</div><p class="small">The test-payment button is disabled at the server until the MommaBeesBakery <strong>sk_test_</strong> key is configured. Tax testing and the real-order workflow remain separate.</p></section>';
}
function bindDemoStore(){
 document.querySelectorAll('[data-demo-checkout]').forEach(button=>button.onclick=async()=>{
  button.disabled=true;try{await startSandboxCheckout(button.dataset.demoCheckout);}
  catch(err){showError(err);button.disabled=false;}
 });
}

const image=(src,cls='product-photo',alt='Bakery product photograph')=>src?`<img class="${cls}" src="${photo(src)}" alt="${e(alt)}" loading="lazy">`:(all.settings?.placeholder_missing_image===false?'':`<div class="photo-empty" aria-label="No product photo uploaded">Mamma Bee's Bakery</div>`);
const productReady=(p)=>p.mode!=='preorder'&&all.batches.some(b=>b.product_id===p.id&&!b.disabled&&b.baked_on<=currentDate()&&b.quantity_available>0&&all.days.some(d=>d.enabled&&new Date(d.cutoff_at)>new Date()&&d.date<=b.best_before));
const productPreorder=(p)=>p.mode!=='ready'&&all.days.some(d=>d.enabled&&new Date(d.cutoff_at)>new Date()&&d.date>=futureDate(p.lead_days)&&d.capacity_total>0);
const available=(p)=>productReady(p)||productPreorder(p);
const sellable=()=>all.products.filter(p=>p.published&&available(p));
const card=(p)=>`<article class="card">${image(p.photo_url)}<div class="card-content"><div class="actions">${productReady(p)?'<span class="badge">Ready to sell</span>':''}${productPreorder(p)?'<span class="badge">Preorder</span>':''}</div><h3>${e(p.name)}</h3><p class="small">${e((p.description||'').slice(0,110))}</p><p class="price">${money(p.price_cents)} <small>/ ${e(p.unit)}</small></p><a class="button secondary" href="#product/${encodeURIComponent(p.id)}">View details</a></div></article>`;
const categories=()=>all.categories.filter(c=>c.active&&sellable().some(p=>p.category_id===c.id));
function layout(content){
 const settings=all.settings||{};
 $('#app').innerHTML=`<div class="topbar">Faith, country roots & sweet traditions</div><header class="header"><div class="shell nav">
 <a href="#home" class="brand">Mamma Bee's Bakery <span>${e(settings.brand_subtitle||'Iowa Roots. Faith-Filled Heart. Baked with Love.')}</span></a>
 <nav aria-label="Primary navigation" class="navlinks"><a href="#shop">Shop</a><a href="#ready">Ready to Sell</a><a href="#preorder">Preorder</a><a href="#gallery">Past Bakes</a><a href="#contact">Contact</a><a href="#cart">Cart (${cart.reduce((s,x)=>s+x.quantity,0)})</a><a href="#account">${currentUser()?'My Account':'Sign In'}</a>${backOfficeNavigation(verifiedBackOfficeRole)}</nav></div></header>
 <main id="main" class="shell"><div id="feedback" aria-live="polite"></div>${content}</main><footer class="footer"><div class="shell"><strong>Mamma Bee's Bakery</strong><p>Iowa roots. Missouri home. Baked with faith and love. · Local pickup and delivery when available</p><p><a href="#faq">FAQ & policies</a> · <a href="#contact">Contact</a></p><p class="tiny">${e(settings.food_notice||'Please ask about ingredients and allergens before ordering.')}</p></div></footer>`;
}
async function load(){
 if(!isConfigured())return;
 const tables=[['categories',{order:'sort_order.asc'}],['products',{}],['stock_batches',{}],['baking_days',{order:'date.asc',date:'gte.'+currentDate()}],['product_photos',{}],['announcements',{}],['past_bakes',{order:'sort_order.asc'}],['site_settings',{}]];
 const values=await Promise.all(tables.map(async ([t,q])=>list(t,q).catch(()=>[])));
 tables.forEach(([t],i)=>all[t==='stock_batches'?'batches':t==='baking_days'?'days':t==='product_photos'?'photos':t==='past_bakes'?'pastBakes':t==='site_settings'?'settings':t]=t==='site_settings'?values[i][0]||{}:values[i]);
}
function announcements(place='home'){
 return all.announcements.filter(x=>x.placement===place||x.placement==='all').map(a=>`<aside class="announcement"><strong>${e(a.title)}</strong><p>${e(a.body)}</p>${a.link_url&&/^https?:\/\//.test(a.link_url)?`<a href="${photo(a.link_url)}" rel="noopener">Details</a>`:''}</aside>`).join('');
}
function home(){const s=all.settings;layout(`${announcements()}<section class="hero"><div class="hero-copy"><div class="eyebrow">Country roots and a love for baking</div><h1>${e(s.home_heading||'Made with care. Shared with joy.')}</h1><p>${e(s.home_intro||'Explore handmade baked goods, ready to enjoy or preorder for a baking day.')}</p><div class="hero-actions"><a class="button" href="#ready">Shop ready-to-sell</a><a class="button secondary" href="#preorder">Schedule a preorder</a></div></div><div class="hero-art ${s.hero_url?'has-photo':''}" ${s.hero_url?`style="background-image:url('${photo(s.hero_url)}')"`:''} role="img" aria-label="Mamma Bee's Bakery storefront header"></div></section>
 <section class="section"><div class="section-head"><div><div class="eyebrow">Discover something delicious</div><h2>Shop by category</h2></div><a href="#shop">View all products</a></div><div class="grid">${categories().map(c=>`<a class="card" href="#category/${e(c.id)}" style="text-decoration:none">${image(c.photo_url)}<div class="card-content"><h3>${e(c.name)}</h3><p class="muted">Browse our ${e(c.name.toLowerCase())}</p></div></a>`).join('')||(s.placeholder_empty_shop===false?'':'<div class="empty">No products are currently available. Please check back for the next baking day.</div>')}</div></section>
 <section class="section"><h2>Featured bakery treats</h2><div class="grid">${sellable().filter(p=>p.featured).slice(0,6).map(card).join('')||(s.placeholder_featured===false?'':'<div class="empty">Featured baked goods will appear here when available.</div>')}</div></section>`);}
function shop(mode=null,categoryId=null){let items=sellable();if(mode==='ready')items=items.filter(productReady);if(mode==='preorder')items=items.filter(productPreorder);if(categoryId)items=items.filter(p=>p.category_id===categoryId);
 const title=categoryId?all.categories.find(c=>c.id===categoryId)?.name||'Category':mode==='ready'?'Ready to Sell':mode==='preorder'?'Preorder':'Shop All';
 layout(`<section class="section">${announcements('shop')}<div class="eyebrow">Mamma Bee's Bakery</div><h1>${e(title)}</h1><p class="muted">Select a treat to see all available ordering options. Browse what is currently available.</p><nav class="tabs" aria-label="Shop filters"><a class="tab ${!mode&&!categoryId?'active':''}" href="#shop">All products</a><a class="tab ${mode==='ready'?'active':''}" href="#ready">Ready to Sell</a><a class="tab ${mode==='preorder'?'active':''}" href="#preorder">Preorder</a>${categories().map(c=>`<a class="tab ${categoryId===c.id?'active':''}" href="#category/${e(c.id)}">${e(c.name)}</a>`).join('')}</nav><div class="grid">${items.map(card).join('')||(all.settings.placeholder_empty_shop===false?'':'<p class="empty">No products currently available in this selection.</p>')}</div>${demoStorePreview()}</section>`);bindDemoStore();}
function detail(id){const p=all.products.find(x=>x.id===id);if(!p||!p.published||!available(p)){layout('<div class="empty">Product not available. <a href="#shop">Return to shop</a>.</div>');return;}
 const batches=all.batches.filter(b=>b.product_id===p.id&&!b.disabled&&b.baked_on<=currentDate()&&b.quantity_available>0&&all.days.some(d=>d.enabled&&new Date(d.cutoff_at)>new Date()&&d.date<=b.best_before));
 const gallery=[p.photo_url,...all.photos.filter(x=>x.product_id===p.id).sort((a,b)=>a.sort_order-b.sort_order).map(x=>x.url)].filter(Boolean);
 layout(`<div class="detail"><div><div id="primary-photo">${image(gallery[0],'detail-photo',p.name)}</div>${gallery.length>1?`<div class="thumbs">${gallery.map((u,i)=>`<img src="${photo(u)}" alt="View image ${i+1}" data-primary="${i}">`).join('')}</div>`:''}</div><div><a href="#shop" class="muted">← Back to shop</a><h1>${e(p.name)}</h1><p class="price">${money(p.price_cents)} / ${e(p.unit)}</p><p>${e(p.description)}</p><hr><form id="add-form"><div class="field"><label for="mode">Ordering method</label><select id="mode" name="mode">${productReady(p)?'<option value="ready">Ready to Sell (already baked)</option>':''}${productPreorder(p)?'<option value="preorder">Preorder for a baking day</option>':''}</select></div>${batches.length?`<div class="field" id="batch-section"><label for="batch">Available finished batch</label><select id="batch" name="batch">${batches.map(b=>`<option value="${e(b.id)}">Baked ${e(b.baked_on)} · ${e(b.quantity_available)} available${b.clearance_approved?' · Clearance':''}</option>`).join('')}</select></div>`:''}<div class="field"><label for="qty">Quantity</label><input type="number" min="1" max="30" value="1" id="qty" required></div><button class="button" type="submit">Add to Cart</button></form><hr><h3>Ingredients and allergens</h3><p>${e(p.ingredients||'Please contact the bakery for ingredient details before purchasing.')}</p><p><strong>Allergens:</strong> ${e(p.allergens||'Contact the bakery for allergen information.')}</p><p class="small">${e(p.storage_notes||'')}</p></div></div><section class="section" id="reviews"><h2>Customer Reviews</h2><div id="review-content">Loading reviews…</div></section>`);
 $('#add-form').onsubmit=ev=>{ev.preventDefault();const mode=$('#mode').value;const batch=mode==='ready'?$('#batch')?.value:null;const qty=Number($('#qty').value);if(qty<1||qty>30)return showError('Choose a quantity between 1 and 30.');const key=p.id+':'+mode+':'+(batch||'');const found=cart.find(x=>x.key===key);if(found)found.quantity+=qty;else cart.push({key,product_id:p.id,mode,batch_id:batch,quantity:qty,name:p.name,price_cents:p.price_cents});saveCart();nav('#cart');};
 $('#mode').onchange=()=>{if($('#batch-section'))$('#batch-section').hidden=$('#mode').value!=='ready';};$('#mode').dispatchEvent(new Event('change'));
 $$('[data-primary]').forEach(el=>el.onclick=()=>{$('#primary-photo').innerHTML=image(gallery[Number(el.dataset.primary)],'detail-photo',p.name);});
 reviewArea(id);
}
async function reviewArea(pid){try{const reviews=await list('reviews',{product_id:'eq.'+pid,approved:'eq.true',order:'created_at.desc'});$('#review-content').innerHTML=`${reviews.map(r=>`<article class="box" style="margin:10px 0"><strong>${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</strong> <span class="small">${fmt(r.created_at)}</span><p>${e(r.body)}</p></article>`).join('')||'<p>No published reviews yet.</p>'}${currentUser()?`<form id="review-form" class="box"><h3>Leave a review</h3><div class="field"><label>Rating<select name="rating"><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select></label></div><div class="field"><label>Review<textarea name="body" minlength="10" maxlength="2000" required></textarea></label></div><div class="field"><label>Up to 3 photos (JPG/PNG/WebP, 5MB each)<input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple></label></div><button class="button">Submit for review</button></form>`:'<p><a href="#account">Sign in</a> to leave a review or upload photographs.</p>'}`;
 if(currentUser())$('#review-form').onsubmit=async ev=>{ev.preventDefault();const f=new FormData(ev.target);const files=[...ev.target.elements.photos.files];if(files.length>3)return showError('Up to three pictures per review.');try{const review=await add('reviews',{customer_id:currentUser().id,product_id:pid,rating:Number(f.get('rating')),body:String(f.get('body')).slice(0,2000)});for(const file of files){const media=await upload('review-photos',file);await add('review_photos',{review_id:review.id,storage_path:media.path});}$('#review-content').insertAdjacentHTML('afterbegin','<div class="notice success">Thank you. Your review has been submitted for moderation.</div>');ev.target.reset();}catch(err){showError(err);}};
 }catch{if($('#review-content'))$('#review-content').textContent='Reviews are not available right now.';}}
function cartPage(){layout(`<section class="section"><h1>Your Cart</h1>${cart.length?cart.map((x,i)=>`<div class="lineitem"><div><strong>${e(x.name)}</strong><p class="small">${x.mode==='ready'?'Ready to Sell':'Preorder'} · Qty ${x.quantity}</p></div><div><strong>${money(x.price_cents*x.quantity)}</strong> <button class="button ghost" data-remove="${i}" aria-label="Remove ${e(x.name)}">Remove</button></div></div>`).join('')+`<p class="total">Product subtotal: ${money(cart.reduce((s,x)=>s+x.price_cents*x.quantity,0))}</p><p class="muted">Final price, discounts, delivery fee and applicable tax are calculated at checkout. Product availability is verified before payment.</p><a class="button" href="#checkout">Continue to checkout</a>`:'<div class="empty">Your cart is empty. <a href="#shop">Browse baked goods</a>.</div>'}</section>`);$$('[data-remove]').forEach(b=>b.onclick=()=>{cart.splice(Number(b.dataset.remove),1);saveCart();cartPage();});}
async function checkoutPage(){const mod=await import('./checkout-form.js');await mod.showCheckout({cart,all,layout,nav,showError,clearCart:()=>{cart=[];saveCart();}});}
function success(){let last={};try{last=JSON.parse(sessionStorage.getItem('mb_latest_order')||'{}');}catch{}layout(`<section class="section box"><h1>Returning from Stripe</h1><p>Payment status is confirmed separately by Stripe. Do not assume the order is paid until its status shows Paid.</p><p>${last.id?'Order reference: '+e(last.id):'Your receipt will be emailed by Stripe when payment succeeds.'}</p>${last.token?`<a class="button" href="#track/${e(last.token)}">Check your order status</a>`:''}<p><a href="#shop">Back to bakery</a></p></section>`);cart=[];saveCart();}
async function track(token){layout('<section class="section"><h1>Track your guest order</h1><div id="order-details" class="box">Looking up order…</div></section>');try{const r=await fetch('/api/order-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});const d=await r.json();if(!r.ok)throw Error(d.error||'No order found');$('#order-details').innerHTML=`<p><strong>Order:</strong> ${e(d.order_id)}</p><p><strong>Payment:</strong> ${e(d.payment_status)}</p><p><strong>Order status:</strong> ${e(d.status)}</p><p><strong>Fulfillment:</strong> ${fmt(d.fulfillment_date)} · ${e(d.fulfillment_window)}</p><p><strong>Total:</strong> ${money(d.total_cents)}</p>`;}catch(x){showError(x);}}
async function account(){
 const mod=await import('./account.js');
 return mod.account({layout,rerender:async()=>{await load();await render();},showError});
}
function contact(){const requestDate=sessionStorage.getItem('mb_requested_special_date')||'';sessionStorage.removeItem('mb_requested_special_date');layout(`<section class="section"><h1>Contact & Custom Orders</h1><p>Ask a question or request a custom cake, dessert tray, or another special order. Special requests are reviewed by the bakery, and a quote will be provided before payment.</p><form class="box" id="contact-form"><div class="field"><label>Name<input name="name" required maxlength="120"></label></div><div class="field"><label>Email<input name="email" type="email" required value="${e(currentUser()?.email||'')}"></label></div><div class="field"><label>Request type<select name="kind"><option value="question">General question</option><option value="custom_order">Custom baking request</option><option value="message">Existing order question</option></select></label></div><div class="field"><label>Subject<input name="subject" maxlength="160" required value="${requestDate?e('Special order request for '+requestDate):''}"></label></div><div class="field"><label>Message / desired date / quantity<textarea name="body" maxlength="3000" minlength="10" required>${requestDate?e('I would like to ask about a special order for '+requestDate+'. Please let me know if you can accommodate it, the total price, and any additional convenience fee.'):''}</textarea></label></div>${config.turnstileSiteKey?`<div class="cf-turnstile" data-sitekey="${e(config.turnstileSiteKey)}"></div>`:''}<button class="button">Send request</button><p class="small">Sending does not create an order or reserve production capacity.</p></form></section>`);if(!currentUser()&&config.turnstileSiteKey){const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js';script.async=true;script.defer=true;document.head.appendChild(script);}$('#contact-form').onsubmit=async ev=>{ev.preventDefault();const payload=Object.fromEntries(new FormData(ev.target));try{if(currentUser())await add('messages',{customer_id:currentUser().id,customer_email:payload.email,kind:payload.kind,subject:payload.subject,body:payload.body});else{const r=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,turnstile_token:ev.target.querySelector('[name="cf-turnstile-response"]')?.value||''})});const data=await r.json();if(!r.ok)throw Error(data.error||'Message could not be sent');}ev.target.reset();$('#feedback').innerHTML='<div class="notice success">Your message was submitted to the bakery inbox.</div>';}catch(x){showError(x);}};}
function faq(){const s=all.settings;layout(`<section class="section"><h1>Frequently Asked Questions & Policies</h1><div class="box"><h2>How do orders work?</h2><p>Ready-to-sell items are already baked; preorders are made for the bakery dates offered at checkout. All orders are subject to actual availability.</p><h2>Pickup and delivery</h2><p>Only approved local dates and time windows appear during checkout. Delivery is available only to eligible ZIP codes and may include a fee.</p><h2>Food and allergens</h2><p>${e(s.food_notice||'Contact us about ingredients, allergens, dietary questions and storage before placing an order.')}</p><h2>Cancellation, refunds and other policies</h2><p>${e(s.terms||'The bakery owner has not published the final cancellation, refund, and fulfillment policies yet. Ordering stays disabled until configured.')}</p></div></section>`);}
function gallery(){
 const photos=all.pastBakes.filter(x=>x.published&&x.image_url);
 layout('<section class="section"><div class="eyebrow">Made with care at Mamma Bee’s Bakery</div>'+
  '<h1>Past Bakes Gallery</h1>'+
  '<p class="muted">A collection of desserts previously made by the bakery. These photographs showcase earlier creations and are <strong>not currently offered for sale</strong>. For current ordering options, visit the <a href="#shop">Shop</a>.</p>'+
  '<div class="grid past-bakes-gallery">'+
  (photos.map(p=>'<article class="card">'+image(p.image_url,'product-photo',p.title)+
    '<div class="card-content"><h3>'+e(p.title)+'</h3>'+
    (p.description?'<p class="small">'+e(p.description)+'</p>':'')+
    '<p class="small muted">Past creation · Not for sale</p></div></article>').join('')||
    (all.settings.placeholder_empty_gallery===false?'':'<div class="empty">Gallery photographs will appear here when available.</div>'))+
  '</div></section>');
}
async function render(){const [route,pid]=decodeURIComponent((location.hash||'#home').substring(1)).split('/');await refreshBackOfficeRole();all.demoItems=[];if(['owner','admin'].includes(verifiedBackOfficeRole)&&all.settings.demo_store_enabled===true){all.demoItems=await list('demo_catalog_items',{order:'sort_order.asc',limit:100}).catch(()=>[]);}document.title=(route==='admin'&&isBackOfficeRole(verifiedBackOfficeRole)?'Admin | ':'')+"Mamma Bee's Bakery";if(!isConfigured()){layout(`<section class="section"><h1>Welcome to Mamma Bee's Bakery</h1><div class="notice">Our online shop is temporarily unavailable. Please check back soon.</div><p>Thank you for your interest in Mamma Bee’s Bakery.</p></section>`);return;}
 try{if(route==='admin'&&!isBackOfficeRole(verifiedBackOfficeRole)){layout('<section class="section box"><h1>Page unavailable</h1><p>This page is not available for your account.</p><a class="button secondary" href="#shop">Return to shop</a></section>');return;}if(route==='admin'){const mod=await import('./admin.js');await mod.admin({layout,load,all,showError,render});return;}if(route==='shop')shop();else if(route==='ready')shop('ready');else if(route==='preorder')shop('preorder');else if(route==='category')shop(null,pid);else if(route==='product')detail(pid);else if(route==='cart')cartPage();else if(route==='checkout')await checkoutPage();else if(route==='success')success();else if(route==='sandbox-success'&&['owner','admin'].includes(verifiedBackOfficeRole))layout('<section class="section box"><h1>Stripe Sandbox Return</h1><p>This was a TEST transaction only. Open Admin → Sandbox Test Products to check the result after Stripe sends its webhook. No real customer order was created.</p><a class="button secondary" href="#shop">Back to Test Store</a></section>');else if(route==='track')track(pid);else if(route==='account')await account();else if(route==='contact')contact();else if(route==='faq')faq();else if(route==='gallery')gallery();else home();}
 catch(ex){layout(`<section class="section"><h1>Something went wrong</h1><div class="notice error">${e(ex.message)}</div><a class="button secondary" href="#home">Return home</a></section>`);}window.scrollTo({top:0,behavior:'instant'});}
window.addEventListener('hashchange',render);
(async()=>{try{await load();}catch(ex){console.error('Could not load storefront',ex);}await render();})();
