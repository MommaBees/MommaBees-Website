import {config,isConfigured,currentUser,currentSession,signIn,signUp,signOut,list,add,update,upload,signedImage,request,setIdleGate,money,escapeHtml as e,safePhoto as photo,currentDate,futureDate,fmt} from './api.js';
import {isBackOfficeRole,backOfficeNavigation} from './role-navigation.js';
import {photoFor,photoByUrl,photoStatusLabel} from './photo-library.js';
import {applyBakeryBackground} from './background.js';
import {applyWebsiteSize} from './website-size.js';
import {qrMarkup,qrSvg,bindQrActions} from './qr-code.js';
import {stockPhotoFor,sandboxProductPhoto,demoMatchesView} from './stock-photography.js';
import {SAMPLE_MENU,samplesFor} from './sample-menu.js';
import {accountNavigationMarkup,bindAccountNavigation} from './account-navigation.js';
import {bindSideNavigation} from './side-navigation.js';
import {catalogCarouselSlides} from './catalog-carousel.js';
import {normalizeIdle,startIdleWatch,stopIdleWatch,isIdle,idleActivityTime} from './idle-session.js';
import {bindRequiredMarkers} from './required-fields.js';
import {legalIndexPage,legalPage} from './legal-policies.js';
import {initCookiePreferences} from './cookie-consent.js';
import {faqPage} from './customer-faq.js';
import {eligibleHomeSlides,homeCarouselMarkup,bindHomeCarousel,stopHomeCarousel} from './home-carousel.js';
import {departmentForCategory,departmentLabel,effectiveDepartment,filterStoreProducts,homepageStorefronts,homepageVisibleDepartments,homepageGridLayout,shopVisibleDepartments} from './store-departments.js';
import {showcaseItemsFor,showcaseIcon} from './store-showcase.js';
import {showcaseEnabled,showcaseDescription,showcasePrice,showcaseOrigin,showcaseFields,showcaseAvailability} from './product-showcase-details.js';
import {sellingUnitLabel,validCartQuantity,availablePackages,packageTotal} from './selling-units.js';
import {availableReadyBatches,validQuickQty,publicShowcaseSaleProduct} from './quick-cart.js';
import {approvedDietaryClaims,knownAllergenStatement} from './dietary-labels.js';
import {capturePasswordRecoveryRedirect} from './password-recovery.js';
import {showcasePreviewLimit,previewRemaining,validPreviewQty,cartHasShowcase} from './showcase-preview-cart.js';
import {cartActionLabel,lineQuantity} from './cart-action.js';
const HEADER_OFFERINGS='Decorated Cakes, Cake Pops, & Cookies | Homemade Cheesecakes & Pies | Candies | Bread & Pastries | Handmade crocheted&sewn items | Custom engraved cutting boards | Natural homemade products - bug spray, sunscreen, lip balm, soaps & more';
let all={categories:[],subcategories:[],products:[],batches:[],days:[],photos:[],announcements:[],pastBakes:[],demoItems:[],carouselSlides:[],showcaseItems:[],settings:{},reviews:[]};
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
function demoStorePreview(mode='all',categoryName=null,hasRealProducts=false){
 const staff=['owner','admin'].includes(verifiedBackOfficeRole)&&all.settings.demo_store_enabled===true;
 const showPublicSamples=false; // Public storefront uses only actual catalog photographs and listings.
 if(!staff&&!showPublicSamples)return '';
 const selected=samplesFor(mode,categoryName);
 const products=staff?selected.filter(x=>all.demoItems.some(y=>y.enabled&&y.name===x.name)):showPublicSamples?selected:[];
 if(!products.length)return '';
 return '<section class="section demo-store bakery-menu-inspiration">'+
  '<div class="section-head"><div><div class="eyebrow"></div>'+
  '<h2>Example Menu</h2><p class="muted">'+
  'Examples only — not available to order. <a href="#sandbox-cart">View Sandbox Cart</a>.'+
  '</p></div></div>'+
  '<div class="grid bakery-menu-grid">'+products.map(d=>{
   const stored=staff?all.demoItems.find(item=>item.enabled&&item.name===d.name):null;
   const original=d.name==='Carrot Cake'?photoFor('Cakes','Carrot Cakes'):null;
   const visual=original||sandboxProductPhoto(d);
   const photoCaption=original?'An earlier Momma Bee bake — appearance may vary':'Illustrative image — not an actual bakery product';
   return '<article class="card bakery-product-card example-menu-card">'+
    '<div class="card-media">'+image(visual.url,'product-photo',d.name+' example')+'</div>'+
    '<div class="card-content"><p class="eyebrow">'+e(d.category)+' / '+e(d.subcategory)+'</p>'+
    '<h3>'+e(d.name)+'</h3><p class="small example-description">'+e(d.description)+'</p>'+
    '<p class="example-photo-note">'+e(photoCaption)+'</p>'+
    (staff&&stored?'<p class="example-test-price">'+money(stored.price_cents)+' <small>/ '+e(stored.unit)+'</small></p>'+
    '<span class="example-test-label">TEST MODE · NOT REAL INVENTORY</span>'+ 
    '<a class="button secondary" href="#sandbox-product/'+encodeURIComponent(stored.id)+'">View Sandbox Product</a>'+
    '<button type="button" class="button secondary" data-demo-checkout="'+e(stored.id)+'">Try Test Checkout</button>':
    '<p class="example-availability">Menu example · Not available to order</p>')+
    '</div></article>';
  }).join('')+'</div>'+
  ''+
  '</section>';
}
function bindDemoStore(){
 document.querySelectorAll('[data-demo-checkout]').forEach(button=>button.onclick=async()=>{
  button.disabled=true;try{await startSandboxCheckout(button.dataset.demoCheckout);}
  catch(err){showError(err);button.disabled=false;}
 });
}

const image=(src,cls='product-photo',alt='Bakery product photograph')=>src?`<img class="${cls}" src="${photo(src)}" alt="${e(alt)}" loading="lazy">`:(all.settings?.placeholder_missing_image===false?'':`<div class="photo-empty" aria-label="No product photo uploaded">MommaBee Bakery&Farmstand</div>`);
const productReady=(p)=>p.mode!=='preorder'&&all.batches.some(b=>b.product_id===p.id&&!b.disabled&&b.baked_on<=currentDate()&&b.quantity_available>0&&all.days.some(d=>d.enabled&&new Date(d.cutoff_at)>new Date()&&d.date<=b.best_before));
const productPreorder=(p)=>p.mode!=='ready'&&all.days.some(d=>d.enabled&&new Date(d.cutoff_at)>new Date()&&d.date>=futureDate(p.lead_days)&&d.capacity_total>0);
const available=(p)=>productReady(p)||productPreorder(p);
const sellable=()=>all.products.filter(p=>p.published&&available(p));
const categoryFor=p=>all.categories.find(x=>x.id===p.category_id);
const subcategoryFor=p=>all.subcategories.find(x=>x.id===p.subcategory_id);
const productVisual=p=>{
 const direct=photoByUrl(p.photo_url);
 const fallback=!p.photo_url?photoFor(categoryFor(p)?.name,subcategoryFor(p)?.name,p.name):null;
 const selected=direct||fallback;
 const src=p.photo_url||fallback?.url||'';
 const label=selected?'<div class="photo-disclosure">'+e(photoStatusLabel(selected))+
  (selected.type==='licensed_reference'?' · <a href="'+photo(selected.source)+'" target="_blank" rel="noopener noreferrer">'+
    e(selected.credit)+' ('+e(selected.license)+')</a>':'')+'</div>':'';
 return {src,credit:label};
};

const availableQuickBatches=p=>availableReadyBatches(p,all.batches,all.days,cart,currentDate());
const showcaseSaleProduct=item=>publicShowcaseSaleProduct(item,all.products,categoryFor,available);
const canTestShowcase=()=>showcaseEnabled(all.settings);
const showcaseQuickCartMarkup=item=>{
 const count=canTestShowcase()&&item.active!==false?previewRemaining(item,cart):0;
 const max=canTestShowcase()&&item.active!==false?Math.min(30,showcasePreviewLimit(item)):0;
 return '<form class="card-quick-buy showcase-quick-buy" data-showcase-test="'+e(item.id)+'">'+
  '<p class="showcase-available" aria-live="polite">Available: '+count+'</p>'+
  '<div class="card-quick-actions"><label class="card-quick-qty"># Qty<span class="qty-input-wrap"><input name="qty" type="number" min="1" max="'+max+
  '" value="1" step="1" inputmode="numeric" '+(max>0?'':'disabled')+' required><span class="qty-arrows"><button type="button" data-qty-arrow="1" aria-label="Increase quantity" '+(max>0?'':'disabled')+'>▲</button><button type="button" data-qty-arrow="-1" aria-label="Decrease quantity" '+(max>0?'':'disabled')+'>▼</button></span></span></label>'+
  '<button type="submit" class="button card-quick-add" '+(max>0?'':'disabled')+'>Add to Cart</button></div>'+
  '<p class="card-quick-status" aria-live="polite"></p></form>';
};
const quickCartMarkup=p=>{
 if(!p?.published||!available(p))return '';
 const ready=productReady(p),preorder=productPreorder(p);
 if(!ready&&!preorder)return '';
 const batches=availableQuickBatches(p),mode=ready&&batches.length?'ready':preorder?'preorder':'ready';
 const max=mode==='ready'?Math.min(30,batches[0]?.remaining||0):30;
 const unit=sellingUnitLabel(p.unit);
 return '<form class="card-quick-buy" data-quick-buy="'+e(p.id)+'">'+
  (ready&&preorder?'<label class="card-sale-method">Order as<select name="mode" aria-label="Order type for '+e(p.name)+'">'+
   '<option value="ready" '+(mode==='ready'?'selected':'')+'>Ready to Sell</option>'+
   '<option value="preorder" '+(mode==='preorder'?'selected':'')+'>Preorder</option></select></label>':'<input type="hidden" name="mode" value="'+mode+'">')+
  '<div class="card-quick-actions"><label class="card-quick-qty"># Qty<span class="qty-input-wrap"><input name="qty" type="number" min="1" max="'+max+'" step="1" value="1" inputmode="numeric" aria-label="Quantity of '+e(p.name)+' ('+e(unit)+')" required><span class="qty-arrows"><button type="button" data-qty-arrow="1" aria-label="Increase quantity">▲</button><button type="button" data-qty-arrow="-1" aria-label="Decrease quantity">▼</button></span></span></label>'+
  '<button class="button card-quick-add" type="submit" '+(max<1?'disabled':'')+'>Add to Cart</button></div>'+
  '<p class="card-quick-status" role="status" aria-live="polite"></p></form>';
};
// Restore the selected cart quantity on revisits, and keep the action in sync with edits.
function syncQuickCartButtons(){
 for(const form of document.querySelectorAll('form[data-showcase-test],form[data-quick-buy]')){
  const input=form.elements.qty,button=form.querySelector('.card-quick-add');
  if(!input||!button)continue;
  let selection;
  if(form.hasAttribute('data-showcase-test')){
   const item=all.showcaseItems.find(x=>x.id===form.dataset.showcaseTest);
   if(!item)continue;
   selection={mode:'showcase',showcase_id:item.id};
   const limit=Math.min(30,showcasePreviewLimit(item));
   const held=lineQuantity(cart,selection);
   input.max=String(limit);
   input.disabled=limit<1;button.disabled=limit<1;
   const available=form.querySelector('.showcase-available');
   if(available)available.textContent='Available: '+previewRemaining(item,cart);
  }else{
   const p=all.products.find(x=>x.id===form.dataset.quickBuy);
   if(!p)continue;
   const mode=form.elements.mode?.value||'ready';
   const batch=mode==='ready'?availableQuickBatches(p)[0]:null;
   const held=cart.find(x=>x.product_id===p.id&&x.mode===mode);
   selection={mode,product_id:p.id,batch_id:mode==='ready'?(batch?.id||held?.batch_id||null):null};
  }
  const qty=Number(input.value);
  const label=cartActionLabel(cart,selection,qty);
  button.textContent=label;
  button.dataset.cartAction=label==='Checkout'?'checkout':'add';
  // A matching cart line is navigable even if no additional units remain.
  if(label==='Checkout')button.disabled=false;
 }
}
const card=(p,showShopDetails=false)=>{
 const visual=productVisual(p),cat=categoryFor(p),sub=subcategoryFor(p);
 return '<article class="card bakery-product-card"><div class="card-media">'+image(visual.src,'product-photo',p.name)+visual.credit+'</div>'+
  '<div class="card-content"><div class="actions">'+
  (productReady(p)?'<span class="badge">Ready to sell</span>':'')+
  (productPreorder(p)?'<span class="badge">Preorder</span>':'')+'</div>'+
  '<p class="eyebrow">'+e(cat?.name||'Bakery')+(sub?' / '+e(sub.name):'')+'</p>'+
  '<h3>'+e(p.name)+'</h3><p class="small">'+e((p.description||'').slice(0,120))+'</p>'+
  '<p class="price">'+money(p.price_cents)+' <small>/ '+e(sellingUnitLabel(p.unit))+'</small></p>'+
  '<a class="button secondary" href="#product/'+encodeURIComponent(p.id)+'">View details</a>'+
  quickCartMarkup(p)+'</div></article>';
};
const showcaseCard=(item,showShopDetails=false)=>{
 const sale=showcaseSaleProduct(item);
 const imageMarkup=item.photo_url?'<div class="card-media">'+image(item.photo_url,'product-photo',item.name)+'</div>':'';
 const parent=all.categories.find(c=>c.id===item.category_id);
 const linkedPrice=sale?money(sale.price_cents)+' / '+sellingUnitLabel(sale.unit):showcasePrice(item);
 return '<article class="card bakery-product-card store-showcase-card'+(item.photo_url?'':' is-text-only')+'">'+
  '<a class="showcase-card-main" href="#product/'+encodeURIComponent(item.slug)+'" aria-label="View '+e(item.name)+' details">'+imageMarkup+
  '<div class="card-content"><div class="actions">'+
   (sale&&productReady(sale)?'<span class="badge">Ready to sell</span>':'')+
   (sale&&productPreorder(sale)?'<span class="badge">Preorder</span>':'')+'</div>'+
   '<p class="eyebrow">'+e(parent?.name||departmentLabel(item.department))+'</p>'+
   '<h3>'+e(item.name)+'</h3>'+
   ((item.description||sale?.description)?'<p class="small showcase-card-description">'+e((item.description||sale?.description||'').slice(0,120))+'</p>':'')+
   (linkedPrice?'<p class="showcase-card-price">'+e(linkedPrice)+'</p>':'')+
   '<span class="showcase-card-link">View details</span></div></a>'+
  '<div class="card-showcase-buy">'+(sale?quickCartMarkup(sale):showcaseQuickCartMarkup(item))+'</div></article>';
};
function bindQuickCart(){
 // Delegation covers cards across homepage, Bakery, Homestand, featured and linked Showcase collections.
 if(document.body.dataset.quickCartBound==='1')return;
 document.body.dataset.quickCartBound='1';
 const controls=form=>{
  const p=all.products.find(x=>x.id===form.dataset.quickBuy),select=form.elements.mode;
  if(!p||!p.published||!available(p))return {p:null,mode:'',max:0,batch:null};
  const mode=select?.value||'ready';
  const availableBatch=mode==='ready'?availableQuickBatches(p)[0]:null;
  const held=cart.find(x=>x.product_id===p.id&&x.mode===mode&&x.batch_id);
  const batch=mode==='ready'?(held&&all.batches.find(b=>b.id===held.batch_id)?
   {id:held.batch_id,remaining:(availableBatch?.id===held.batch_id?availableBatch.remaining:0)}:availableBatch):null;
  const existing=mode==='ready'?lineQuantity(cart,{mode,product_id:p.id,batch_id:batch?.id}):0;
  const max=mode==='ready'?Math.min(30,(batch?.remaining||0)+existing):productPreorder(p)?30:0;
  return {p,mode,max,batch};
 };
 const refresh=form=>{
  const {max,mode}=controls(form),input=form.elements.qty,button=form.querySelector('button[type="submit"]');
  input.max=String(max);
  if(max>0&&Number(input.value)>max)input.value=String(max);
  if(!Number.isInteger(Number(input.value))||Number(input.value)<1)input.value='1';
  button.disabled=max<1;
  const status=form.querySelector('.card-quick-status');
  if(status&&mode==='ready'&&max===0)status.textContent='No remaining packages.';
  syncQuickCartButtons();
 };
 document.addEventListener('click',event=>{
  const arrow=event.target.closest?.('[data-qty-arrow]');
  if(!arrow||arrow.disabled)return;
  const input=arrow.closest('.qty-input-wrap')?.querySelector('input[type="number"]');
  if(!input||input.disabled)return;
  const min=Number(input.min||0),max=input.max===''?30:Number(input.max);
  const value=Number(input.value),current=Number.isFinite(value)?value:min;
  const next=Math.max(min,Math.min(max,current+Number(arrow.dataset.qtyArrow)));
  if(next===current)return;
  input.value=String(next);
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
 });
 document.addEventListener('input',event=>{
  if(event.target.matches?.('form[data-showcase-test] input[name="qty"],form[data-quick-buy] input[name="qty"]'))syncQuickCartButtons();
 });
 document.addEventListener('change',event=>{
  if(event.target.matches?.('form[data-showcase-test] input[name="qty"],form[data-quick-buy] input[name="qty"]'))syncQuickCartButtons();
 });
 document.addEventListener('change',event=>{
  const form=event.target.closest?.('form[data-quick-buy]');
  if(form&&event.target.name==='mode')refresh(form);
 });
 document.addEventListener('submit',event=>{
  const form=event.target.closest?.('form[data-showcase-test]');
  if(!form)return;
  event.preventDefault();
  const item=all.showcaseItems.find(x=>x.id===form.dataset.showcaseTest&&x.active!==false);
  const quantity=Number(form.elements.qty.value),status=form.querySelector('.card-quick-status');
  if(!canTestShowcase()||!item||!validCartQuantity(quantity)||quantity>showcasePreviewLimit(item)){
   if(status)status.textContent='Quantity unavailable.';return;
  }
  const selection={mode:'showcase',showcase_id:item.id};
  if(cartActionLabel(cart,selection,quantity)==='Checkout'){nav('#checkout');return;}
  const key='showcase:'+item.id;
  const existing=cart.find(line=>line.key===key);
  const price=Number.isInteger(item.price_cents)&&item.price_cents>=0?item.price_cents:0;
  if(existing){existing.quantity=quantity;}
  else cart.push({key,mode:'showcase',showcase_id:item.id,quantity,name:item.name,unit:item.price_unit||'each',price_cents:price});
  saveCart();
  document.querySelectorAll('.nav-cart-link').forEach(link=>{link.textContent='Cart ('+cart.reduce((n,x)=>n+x.quantity,0)+')';});
  if(status)status.textContent='Added to cart.';
  syncQuickCartButtons();
 });
 document.addEventListener('submit',event=>{
  const form=event.target.closest?.('form[data-quick-buy]');
  if(!form)return;
  event.preventDefault();
  const {p,mode,max,batch}=controls(form),qty=Number(form.elements.qty.value);
  const status=form.querySelector('.card-quick-status');
  if(!p||!validQuickQty(qty,max)){
   if(status)status.textContent='Choose a quantity that is available.';
   refresh(form);return;
  }
  const key=p.id+':'+mode+':'+(batch?.id||'');
  const selection={mode,product_id:p.id,batch_id:batch?.id||null};
  if(cartActionLabel(cart,selection,qty)==='Checkout'){nav('#checkout');return;}
  if(mode==='ready'&&qty>Number(all.batches.find(b=>b.id===batch?.id)?.quantity_available||0)){
   if(status)status.textContent='Not enough packages available.';return;
  }
  const existing=cart.find(x=>x.key===key);
  if(existing){existing.quantity=qty;existing.price_cents=p.price_cents;existing.unit=p.unit;}
  else cart.push({key,product_id:p.id,mode,batch_id:batch?.id||null,quantity:qty,name:p.name,price_cents:p.price_cents,unit:p.unit});
  saveCart();
  const count=cart.reduce((total,row)=>total+row.quantity,0);
  for(const link of document.querySelectorAll('.nav-cart-link'))link.textContent='Cart ('+count+')';
  if(status)status.textContent='Added to cart.';
  document.querySelectorAll('form[data-quick-buy]').forEach(refresh);
  syncQuickCartButtons();
 });
}
const categories=(department=null)=>all.categories.filter(c=>c.active&&(!department||departmentForCategory(c)===department)&&(sellable().some(p=>p.category_id===c.id)||(showcaseEnabled(all.settings)&&all.settings.split_store_enabled===true&&all.showcaseItems.some(i=>i.active&&i.category_id===c.id))||(['owner','admin'].includes(verifiedBackOfficeRole)&&all.settings.demo_store_enabled===true&&all.demoItems.some(x=>x.enabled&&x.category===c.name))));
function layout(content){
 const settings=all.settings||{};
 const routeName=(location.hash||'#home').slice(1).split('/')[0]||'home';
 document.body.dataset.page=routeName;
 document.body.dataset.cardStyle=settings.site_card_style==='open'?'open':'cards';
 const crumbLabels={shop:'Shop All',ready:'Ready to Sell',preorder:'Preorder',category:'Browse Categories',subcategory:'Browse Varieties',product:'Product Details',cart:'Your Cart',checkout:'Checkout',success:'Order Status',track:'Track Your Order',account:'My Account',contact:'Contact & Special Orders',faq:'Questions & Policies',legal:'Legal & Policies',gallery:'Past Bakes',qr:'Bakery QR Code',admin:'Admin Center'};
 const crumb=routeName!=='home'&&crumbLabels[routeName]
   ?'<nav class="page-crumbs" aria-label="Breadcrumb"><a href="#home">Home</a><span aria-hidden="true">/</span><span aria-current="page">'+e(crumbLabels[routeName])+'</span></nav>'
   :'';
 applyWebsiteSize(settings.website_size);
 applyBakeryBackground(settings,config.supabaseUrl);
 stopHomeCarousel();
 $('#app').innerHTML=`<header class="header"><div class="shell nav">
 <div class="nav-leading">
  <div class="nav-side-wrapper" data-side-navigation>
   <button type="button" id="mobile-nav-toggle" class="mobile-nav-toggle" aria-controls="primary-navigation" aria-expanded="false" aria-pressed="false" aria-label="Open navigation menu (click to keep open)">☰ <span>Menu</span></button>
   <nav id="primary-navigation" aria-label="Storefront navigation" class="navlinks" hidden>
    <a href="#shop">Shop All</a><a href="#ready">Ready to Sell</a><a href="#preorder">Preorder</a>
    <a href="#shop/bakery">Bakery Storefront</a><a href="#shop/homestand">Homestand Storefront</a>
    <a href="#gallery">Past Bakes</a><a href="#contact">Contact</a><a href="#faq">Questions &amp; Policies</a>
   </nav>
  </div>
  <a href="#home" class="nav-home-link" ${routeName==='home'?'aria-current="page"':''}>Home</a>
 </div>
 <a href="#home" class="brand">MommaBee Bakery&Farmstand</a>
 <div class="nav-utilities">
  <a href="#cart" class="nav-cart-link" ${routeName==='cart'?'aria-current="page"':''}>Cart (${cart.reduce((sum,item)=>sum+item.quantity,0)})</a>
  ${accountNavigationMarkup(Boolean(currentUser()),verifiedBackOfficeRole)}
  ${routeName==='home'&&!currentUser()?'<a href="#account/register" class="nav-account-register">Register</a>':''}
 </div></div>
 <div class="header-offerings" aria-label="Products and services"><div class="shell">${e(settings.brand_subtitle||HEADER_OFFERINGS)}</div></div></header>
 <main id="main" class="shell"><div id="feedback" aria-live="polite"></div>${crumb}${content}</main><footer class="footer"><div class="shell">
  <div class="footer-inner">
   <div class="footer-col"><div class="footer-brand-name">MommaBee Bakery&Farmstand</div>
    <p class="footer-location">Located in Nixa, Missouri — Farmstand &amp; Made to Order</p>
    </div>
   <nav class="footer-col footer-navigation" aria-label="Footer navigation">
    <div class="footer-nav-row"><a href="#shop">Shop All</a><a href="#ready">Ready to Sell</a><a href="#preorder">Preorder</a></div>
    <div class="footer-nav-row"><a href="#gallery">Past Bakes</a><a href="#contact">Ask Momma Bee</a><a href="#faq">Questions & Policies</a></div>
   </nav>
   <div class="footer-col"><p class="footer-col-title">Take us along</p>
    <a class="footer-qr" href="#qr" aria-label="Open the downloadable bakery homepage QR code">
     ${qrSvg()}<span>Scan to visit our bakery</span></a>
    </div>
  </div>
  <nav class="footer-legal" aria-label="Legal and customer policies">
   <div class="footer-legal-heading"><span>LEGAL &amp; CUSTOMER POLICIES</span><a href="#legal">View all policies</a></div>
   <div class="footer-legal-links">
    <a href="#legal/terms">Terms of Service</a><a href="#legal/privacy">Privacy Policy</a>
    <a href="#legal/cookies">Cookie Policy</a><a href="#legal/pickup">Pickup Policy</a>
    <a href="#legal/delivery">Delivery Policy</a><a href="#legal/refunds">Refunds &amp; Cancellations</a>
    <a href="#legal/property">Visitor &amp; Animal Safety</a><a href="#legal/food">Food &amp; Allergens</a>
    <button type="button" class="footer-cookie-link" data-cookie-settings>Cookie Settings</button>
   </div>
  </nav><div class="footer-bottom">${e(settings.food_notice||'Please ask about ingredients and allergens before ordering.')}</div>
 </div></footer>`;
 bindHomeCarousel(settings.home_carousel_interval_seconds);
 bindQuickCart();
 syncQuickCartButtons();
 const primary=$('#primary-navigation');
 if(primary){
  primary.querySelectorAll('a[href^="#"]').forEach(anchor=>{
   if(anchor.closest('[data-account-panel]'))return;
   const destination=anchor.getAttribute('href')?.slice(1).split('/')[0];
   const selected=destination===routeName||(['category','subcategory','product'].includes(routeName)&&destination==='shop');
   anchor.classList.toggle('current',selected);
   if(selected)anchor.setAttribute('aria-current','page');
   else anchor.removeAttribute('aria-current');
  });
 }
 bindSideNavigation();
 bindAccountNavigation({onSignOut:async()=>{
  try{
   await signOut();
   stopIdleWatch();idleOwner=null;
   verifiedBackOfficeRole=null;
   all.demoItems=[];
   await load(); // Drop any staff-visible cached records before rendering the guest view.
   if(!location.hash||location.hash==='#home')await render();
   else nav('#home');
  }catch(error){showError(error);throw error;}
 }});
 document.querySelectorAll('#app img').forEach(img=>{
  img.addEventListener('error',()=>{
   const placeholder=document.createElement('div');
   placeholder.className='photo-empty graceful-image-fallback';
   placeholder.setAttribute('role','img');
   placeholder.setAttribute('aria-label',img.alt+' photo currently unavailable');
   placeholder.textContent='Photo temporarily unavailable';
   img.replaceWith(placeholder);
  },{once:true});
 });
}
async function load(){
 if(!isConfigured())return;
 const tables=[['categories',{order:'sort_order.asc'}],['subcategories',{order:'sort_order.asc'}],['products',{}],['stock_batches',{}],['baking_days',{order:'date.asc',date:'gte.'+currentDate()}],['product_photos',{}],['announcements',{}],['past_bakes',{order:'sort_order.asc'}],['home_carousel_slides',{order:'sort_order.asc'}],['store_showcase_items',{order:'sort_order.asc'}],['site_settings',{}]];
 const values=await Promise.all(tables.map(async ([t,q])=>list(t,q).catch(()=>[])));
 tables.forEach(([t],i)=>all[t==='stock_batches'?'batches':t==='baking_days'?'days':t==='product_photos'?'photos':t==='past_bakes'?'pastBakes':t==='home_carousel_slides'?'carouselSlides':t==='store_showcase_items'?'showcaseItems':t==='site_settings'?'settings':t]=t==='site_settings'?values[i][0]||{}:values[i]);
}
function announcements(place='home'){
 return all.announcements.filter(x=>x.placement===place||x.placement==='all').map(a=>`<aside class="announcement"><strong>${e(a.title)}</strong><p>${e(a.body)}</p>${a.link_url&&/^https?:\/\//.test(a.link_url)?`<a href="${photo(a.link_url)}" rel="noopener">Details</a>`:''}</aside>`).join('');
}
function home(){
 const s=all.settings;
 const active=eligibleHomeSlides(all.carouselSlides);
 const backup=!s.home_carousel_enabled&&s.hero_url?[{
  published:true,id:'legacy',sort_order:10,eyebrow:'Rooted in Faith · Baked with Love',
  title:s.home_heading||'A Little Country. A Whole Lot of Homemade.',
  description:s.home_intro||'',image_url:s.hero_url,
  image_alt:'An original bakery creation by MommaBee Bakery&Farmstand',
  primary_label:'Shop ready-to-sell',primary_href:'#ready',
  secondary_label:'Schedule a preorder',secondary_href:'#preorder'
 }]:[];
 const slides=[...(active.length?active:backup),...catalogCarouselSlides({settings:s,products:sellable(),showcase:showcaseEnabled(s)?all.showcaseItems:[],categories:all.categories})];
 const split=s.split_store_enabled===true;
 const currentProducts=sellable();
 const homeGrid=homepageGridLayout(s);
  const homepageLimit=homeGrid.limit;
 const storefronts=homepageStorefronts(s,currentProducts,all.categories,homepageLimit);
 const departmentPanels=storefronts.length?
  '<section class="section home-departments-section" aria-label="Bakery and Homestand products">'+
  '<div class="home-departments-grid '+(storefronts.length===1?'is-single':'')+'">'+
  storefronts.map(view=>'<section class="home-department-panel home-department--'+view.department+
   '" aria-labelledby="home-'+view.department+'-heading">'+
    '<div class="home-department-heading"><h2 id="home-'+view.department+'-heading">'+e(view.label)+'</h2>'+
      '<a href="'+view.href+'">Shop '+e(view.label)+'</a></div>'+
    '<div class="home-department-products" style="--home-product-columns:'+homeGrid.columns+';--home-product-columns-tablet:'+Math.min(3,homeGrid.columns)+';--home-product-columns-mobile:'+Math.min(2,homeGrid.columns)+';">'+
      (view.products.map(card).join('')+
       (showcaseEnabled(s)?showcaseItemsFor(all.showcaseItems,view.department,null,null,homepageLimit):[])
        .filter(item=>!view.products.some(p=>p.variety_id&&p.variety_id===item.variety_id))
        .slice(0,Math.max(0,homepageLimit-view.products.length))
        .map(showcaseCard).join(''))+
    '</div></section>').join('')+
  '</div></section>':'';
 const combinedCategories=`<section class="section ${categories().length?'':'empty-category-section'}">
  <div class="section-head"><div><h2>Shop by category</h2></div><a href="#shop">View all products</a></div>
  <div class="grid">${categories().map(c=>`<a class="card" href="#category/${e(c.id)}" style="text-decoration:none">${c.photo_url?image(c.photo_url):''}<div class="card-content"><h3>${e(c.name)}</h3></div></a>`).join('')}</div>
 </section>`;
 const gallery=`<section class="section"><div class="section-head"><div><h2>Past Bakes</h2></div><a href="#gallery">Browse Past Bakes</a></div>
  
  <div class="grid home-gallery-preview">${all.pastBakes.filter(p=>p.published&&p.image_url).slice(0,3).map(p=>`<a class="card" href="#gallery">${image(p.image_url,'product-photo',p.title)}<div class="card-content"><strong>${e(p.title)}</strong></div></a>`).join('')}</div></section>`;
 const featured=currentProducts.filter(p=>p.featured).slice(0,6);
 const combinedFeatured=featured.length?'<section class="section"><h2>Featured treats</h2><div class="grid">'+featured.map(card).join('')+'</div></section>':'';
 layout(announcements()+homeCarouselMarkup(slides,e,photo,s.home_carousel_size)+
   (split?departmentPanels:combinedCategories)+gallery+(split?'':combinedFeatured));
 if(!split)bindDemoStore();
}
function shop(mode=null,categoryId=null,subcategoryId=null,requestedDepartment=null){
 const category=all.categories.find(x=>x.id===categoryId);
 const split=all.settings.split_store_enabled===true;
 const visibleDepartments=shopVisibleDepartments(all.settings,requestedDepartment,category);
 const department=split&&visibleDepartments.length===1?visibleDepartments[0]:null;
 let items=split?sellable().filter(product=>visibleDepartments.includes(departmentForCategory(categoryFor(product)))):sellable();
 if(mode==='ready')items=items.filter(productReady);
 if(mode==='preorder')items=items.filter(productPreorder);
 if(categoryId)items=items.filter(p=>p.category_id===categoryId);
 if(subcategoryId)items=items.filter(p=>p.subcategory_id===subcategoryId);
 const title=subcategoryId?all.subcategories.find(c=>c.id===subcategoryId)?.name||'Product type':
  categoryId?all.categories.find(c=>c.id===categoryId)?.name||'Category':
  mode==='ready'?'Ready to Sell':mode==='preorder'?'Preorder':'Shop All';
 const heading=mode==='ready'?'Ready for scheduled pickup':
  mode==='preorder'?'Made for an upcoming baking day':'Explore all currently available treats';
 const description=mode==='ready'?'Ready for pickup.':mode==='preorder'?'Order for an available date.':'';
 const empty='No items listed.';

 const isShopAll=(!mode&&!categoryId&&!subcategoryId)||department==='homestand';
 const pageTitle=department?departmentLabel(department)+(categoryId?'':mode==='ready'?' · Ready to Sell':mode==='preorder'?' · Preorder':' · Shop All'):title;
 const departmentSuffix=department?'/'+department:'';
 const categoryChoices=categories(department).filter(c=>!split||visibleDepartments.includes(departmentForCategory(c)));
 const showcase=!mode&&showcaseEnabled(all.settings)
  ?(split?visibleDepartments:['bakery','homestand']).flatMap(d=>showcaseItemsFor(all.showcaseItems,d,categoryId,subcategoryId,40)):[];
 // A linked Showcase entry is the storefront presentation for its sale product, not a second duplicate card.
 const linkedOnPage=new Set(showcase.map(item=>item.product_id).filter(Boolean));
 const shopProducts=items.filter(p=>!linkedOnPage.has(p.id));
 const shopShowcase=showcase.filter(item=>!items.some(p=>p.id!==item.product_id&&p.variety_id&&p.variety_id===item.variety_id));
 const navigationDepartments=split?Array.from(new Set([...visibleDepartments,
  ...(requestedDepartment&&['bakery','homestand'].includes(requestedDepartment)?[requestedDepartment]:[])])):[];
 layout(`<section class="section shop-page shop-page--${mode||'all'}" data-shop-view="${mode||'all'}">
 ${announcements('shop')}
 <div class="shop-hero">
  <div class="shop-hero-copy"><h1>${e(categoryId?title:pageTitle)}</h1>${description?'<p>'+e(description)+'</p>':''}
   ${shopProducts.length||shopShowcase.length?'<p class="shop-result-count"><strong>'+(shopProducts.length+shopShowcase.length)+'</strong> items listed</p>':''}
  </div>
  <div class="shop-hero-picture shop-hero-picture--brand"><img class="shop-hero-image shop-hero-brand-image" src="/assets/branding/mommabee-shop-logo.webp" alt="MommaBee Bakery&Farmstand" decoding="async" fetchpriority="high"></div>
 </div>
 ${split&&navigationDepartments.length?'<nav class="tabs shop-department-tabs" aria-label="Store departments">'+
  navigationDepartments.map(d=>'<a class="tab '+(department===d?'active':'')+'" href="#shop/'+d+'" '+(department===d?'aria-current="page"':'')+'>'+e(departmentLabel(d))+'</a>').join('')+
  '</nav>':''}
 <nav class="tabs shop-mode-tabs" aria-label="Browse available products">
  <a class="tab ${!mode&&!categoryId?'active':''}" href="#shop${departmentSuffix}" ${!mode&&!categoryId?'aria-current="page"':''}>Shop All</a>
  <a class="tab ${mode==='ready'?'active':''}" href="#ready${departmentSuffix}" ${mode==='ready'?'aria-current="page"':''}>Ready to Sell</a>
  <a class="tab ${mode==='preorder'?'active':''}" href="#preorder${departmentSuffix}" ${mode==='preorder'?'aria-current="page"':''}>Preorder</a>
 </nav>
 ${categoryChoices.length?'<nav class="tabs subcategory-tabs" aria-label="Categories">'+categoryChoices.map(c=>
  '<a class="tab '+(categoryId===c.id?'active':'')+'" href="#category/'+e(c.id)+'">'+e(c.name)+'</a>'
 ).join('')+'</nav>':''}
 ${categoryId?'<nav class="tabs subcategory-tabs" aria-label="Subcategory filters">'+
 '<a class="tab '+(!subcategoryId?'active':'')+'" href="#category/'+e(categoryId)+'">All '+e(all.categories.find(c=>c.id===categoryId)?.name||'')+'</a>'+
 all.subcategories.filter(x=>x.category_id===categoryId&&x.active&&items.some(p=>p.subcategory_id===x.id))
 .map(x=>'<a class="tab '+(subcategoryId===x.id?'active':'')+'" href="#subcategory/'+e(categoryId)+'/'+e(x.id)+'">'+e(x.name)+'</a>').join('')+'</nav>':''}
 <div class="grid product-results">${shopProducts.map(p=>card(p,true)).join('')+
 shopShowcase.map(item=>showcaseCard(item,true)).join('')||
 '<p class="shop-empty">'+e(empty)+'</p>'}</div>
 ${department!=='homestand'?demoStorePreview(mode||'all',category?.name||null):''}
 </section>`);bindDemoStore();
}
/** An Owner-supplied catalog item's own page; the existing purchasable product route remains separate. */
function showcaseDetail(item){
 const sale=showcaseSaleProduct(item),dept=item.department==='homestand'?'homestand':'bakery';
 const category=all.categories.find(x=>x.id===item.category_id);
 const sub=all.subcategories.find(x=>x.id===item.subcategory_id);
 const departmentName=departmentLabel(dept);
 const backHref='#shop/'+dept;
 const info={...item,...(sale?{price_cents:sale.price_cents,price_unit:sale.unit,price_kind:'owner',
  ingredients:sale.ingredients||item.ingredients,allergens:sale.allergens||item.allergens,
  storage_notes:sale.storage_notes||item.storage_notes}:{})};
 const allergens=(item.allergen_reviewed||sale?.allergen_reviewed)?
  knownAllergenStatement(item.allergen_reviewed?item:sale):'Not listed';
 const dietary=approvedDietaryClaims((item.dietary_claims_reviewed&&item.dietary_claims?.length)?item:sale||item);
 const photoList=[item.photo_url,...(sale?all.photos.filter(x=>x.product_id===sale.id).sort((a,b)=>a.sort_order-b.sort_order).map(x=>x.url):[])].filter(Boolean);
 const gallery='<div class="showcase-detail-gallery">'+
  (photoList.length?'<div id="showcase-primary-photo">'+image(photoList[0],'showcase-detail-photo',item.name)+'</div>':
   '<div class="showcase-detail-no-photo"></div>')+
  (photoList.length>1?'<div class="showcase-detail-thumbs">'+photoList.map((url,index)=>
   '<button type="button" class="showcase-detail-thumb" data-showcase-photo-index="'+index+'" aria-label="Photo '+(index+1)+'">'+image(url,'product-photo',item.name)+'</button>').join('')+'</div>':'')+'</div>';
 const underPhoto='<section class="showcase-photo-information">'+
  '<h2>Ingredients</h2><p>'+e(info.ingredients||'Not listed')+'</p>'+
  '<h2>Allergens</h2><p>'+e(allergens)+'</p>'+
  '<h2>Storage & Handling</h2><p>'+e(info.storage_notes||'Not listed')+'</p>'+
  (dietary.length?'<h2>Dietary information</h2><p>'+e(dietary.join(' · '))+'</p>':'')+'</section>';
 const listedPrice=sale?money(sale.price_cents)+' / '+sellingUnitLabel(sale.unit):showcasePrice(item);
 const facts=showcaseFields(info).filter(([label])=>!['Price','Ingredients','Allergens','Storage & handling'].includes(label));
 const left='<div class="showcase-photo-column">'+gallery+underPhoto+'</div>';
 const copy='<div class="showcase-detail-copy"><p class="eyebrow">'+[departmentName,category?.name,sub?.name].filter(Boolean).map(e).join(' / ')+'</p>'+
  '<h1>'+e(item.name)+'</h1>'+
  (item.description||sale?.description?'<section class="product-description"><h2>Description</h2><p class="showcase-detail-description">'+e(item.description||sale.description)+'</p></section>':'')+
  (listedPrice?'<p class="price">'+e(listedPrice)+'</p>':'')+
  '<section class="showcase-sale-summary">'+
  (sale?'<p class="showcase-detail-stock">Available: '+availableQuickBatches(sale).reduce((n,b)=>n+b.remaining,0)+'</p>'+quickCartMarkup(sale):
    showcaseQuickCartMarkup(item))+
  '</section>'+
  (facts.length?'<dl class="showcase-details-table">'+facts.map(([label,value])=>
   '<div class="showcase-detail-info"><dt>'+e(label)+'</dt><dd>'+e(value)+'</dd></div>').join('')+'</dl>':'')+
  '<div class="actions showcase-detail-actions"><a class="button secondary" href="'+backHref+'">Browse '+e(departmentName)+'</a></div></div>';
 const related=showcaseItemsFor(all.showcaseItems,dept,null,null,40).filter(x=>x.id!==item.id).slice(0,4);
 layout('<section class="section showcase-item-page">'+
  '<nav class="showcase-detail-breadcrumb"><a href="'+backHref+'">'+e(departmentName)+'</a>'+
  (category?' / <a href="#category/'+encodeURIComponent(category.id)+'">'+e(category.name)+'</a>':'')+'</nav>'+
  '<div class="showcase-detail-grid">'+left+copy+'</div>'+
  (sale?'<section class="section" id="reviews"><h2>Customer Reviews</h2><div id="review-content"></div></section>':'')+
  (related.length?'<section class="showcase-detail-related"><h2>More '+e(departmentName)+'</h2><div class="grid">'+related.map(showcaseCard).join('')+'</div></section>':'')+
  '</section>');
 document.querySelectorAll('[data-showcase-photo-index]').forEach(button=>button.onclick=()=>{
  const url=photoList[Number(button.dataset.showcasePhotoIndex)];
  if(url)$('#showcase-primary-photo').innerHTML=image(url,'showcase-detail-photo',item.name);
 });
 if(sale)reviewArea(sale.id);
}
function detail(id){
 const p=all.products.find(x=>x.id===id||(x.slug===id&&x.published&&available(x)));
 if(!p||!p.published||!available(p)){
  const item=showcaseEnabled(all.settings)?all.showcaseItems.find(x=>x.active!==false&&x.slug===id):null;
  if(item){showcaseDetail(item);return;}
  layout('<div class="empty">Item not found. <a href="#shop">Return to shop</a>.</div>');return;
 }
 const batches=all.batches.filter(b=>b.product_id===p.id&&!b.disabled&&b.baked_on<=currentDate()&&b.quantity_available>0&&
  all.days.some(d=>d.enabled&&new Date(d.cutoff_at)>new Date()&&d.date<=b.best_before));
 const visual=productVisual(p);
 const gallery=[visual.src,...all.photos.filter(x=>x.product_id===p.id).sort((x,y)=>x.sort_order-y.sort_order).map(x=>x.url)].filter(Boolean);
 const unit=sellingUnitLabel(p.unit);
 const showReady=productReady(p),showPreorder=productPreorder(p);
 const allergens=Array.isArray(p.major_allergens)&&p.major_allergens.length
  ?'Contains: '+p.major_allergens.join(', ')+'.'
  :knownAllergenStatement(p);
 layout(`<div class="detail product-detail"><div><div id="primary-photo">${image(gallery[0],'detail-photo',p.name)}</div>${visual.credit}${gallery.length>1?`<div class="thumbs">${gallery.map((u,i)=>`<img src="${photo(u)}" alt="View image ${i+1}" data-primary="${i}">`).join('')}</div>`:''}<section class="product-ingredient-details"><h2>Ingredients</h2><p>${e(p.ingredients||'Not listed')}</p><h2>Allergens</h2><p>${e(allergens)}</p>${p.storage_notes?'<h2>Storage &amp; Handling</h2><p>'+e(p.storage_notes)+'</p>':''}${approvedDietaryClaims(p).length?'<h2>Dietary information</h2><p>'+e(approvedDietaryClaims(p).join(' · '))+'</p>':''}</section></div><div><a href="#shop" class="muted">← Back to shop</a><h1>${e(p.name)}</h1><p class="price">${money(p.price_cents)} / ${e(unit)}</p><section class="product-description" aria-label="Product description"><h2>Description</h2><p>${e(p.description||'Contact Momma Bee for product details.')}</p></section><form id="add-form"><div class="field"><label for="mode">Ordering method</label><select id="mode" name="mode">${showReady?'<option value="ready">Ready to Sell (already prepared)</option>':''}${showPreorder?'<option value="preorder">Preorder for a baking day</option>':''}</select></div>${batches.length?`<div class="field" id="batch-section"><label for="batch">Available finished batch</label><select id="batch" name="batch">${batches.map(b=>`<option value="${e(b.id)}">Prepared ${e(b.baked_on)} · ${e(b.quantity_available)} packages available</option>`).join('')}</select></div>`:''}<div class="field"><label for="qty"># Qty (${e(unit)} packages)</label><div class="product-quantity-control"><span class="qty-input-wrap"><input type="number" min="1" max="30" step="1" value="1" id="qty" inputmode="numeric" required><span class="qty-arrows"><button type="button" data-qty-arrow="1" aria-label="Increase quantity">▲</button><button type="button" data-qty-arrow="-1" aria-label="Decrease quantity">▼</button></span></span></div><p class="small muted" id="product-stock-note"></p><strong id="product-line-total" aria-live="polite"></strong></div><button class="button" type="submit">Add to Cart</button><a class="button secondary" href="#cart">View Cart</a></form></div></div><section class="section" id="reviews"><h2>Customer Reviews</h2><div id="review-content">Loading reviews…</div></section>`); 
 const mode=$('#mode'),batch=$('#batch'),quantity=$('#qty'),lineTotal=$('#product-line-total');
 const existingForBatch=(id)=>cart.filter(i=>i.product_id===p.id&&i.mode==='ready'&&i.batch_id===id)
  .reduce((sum,i)=>sum+i.quantity,0);
 const capacity=()=>{
  if(mode.value!=='ready')return 30;
  const selected=batches.find(b=>b.id===batch?.value);
  return selected?Math.min(30,Number(selected.quantity_available||0)):0;
 };
 const refreshQuantity=()=>{
  if($('#batch-section'))$('#batch-section').hidden=mode.value!=='ready';
  const max=capacity();quantity.max=String(max);
  if(max>0&&Number(quantity.value)>max)quantity.value=String(max);
  if(Number(quantity.value)<1)quantity.value='1';
  if(lineTotal)lineTotal.textContent='Estimated item total: '+money(packageTotal(p.price_cents,Number(quantity.value)||1));
  const note=$('#product-stock-note');
  if(note)note.textContent=mode.value==='ready'?'Available: '+max:'Preorder';
  const button=$('#add-form button[type="submit"]');
  const selection={mode:mode.value,product_id:p.id,batch_id:mode.value==='ready'?(batch?.value||null):null};
  const label=cartActionLabel(cart,selection,Number(quantity.value));
  button.textContent=label;button.dataset.cartAction=label==='Checkout'?'checkout':'add';
  button.disabled=max<1&&label!=='Checkout';
 };
 $('#add-form').onsubmit=ev=>{
  ev.preventDefault();
  const selectedMode=mode.value,selectedBatch=selectedMode==='ready'?batch?.value:null,qty=Number(quantity.value);
  const selection={mode:selectedMode,product_id:p.id,batch_id:selectedBatch};
  if(cartActionLabel(cart,selection,qty)==='Checkout'){nav('#checkout');return;}
  if(!validCartQuantity(qty)||qty>capacity())return showError('Choose a valid Qty within the number of packages available.');
  const key=p.id+':'+selectedMode+':'+(selectedBatch||'');
  const found=cart.find(i=>i.key===key);
  if(selectedMode==='ready'&&qty>Number(batches.find(b=>b.id===selectedBatch)?.quantity_available||0))
   return showError('Only the available finished packages can be added to your cart.');
  if(found){found.quantity=qty;found.price_cents=p.price_cents;found.unit=p.unit;}
  else cart.push({key,product_id:p.id,mode:selectedMode,batch_id:selectedBatch,quantity:qty,name:p.name,price_cents:p.price_cents,unit:p.unit});
  saveCart();
  document.querySelectorAll('.nav-cart-link').forEach(link=>{link.textContent='Cart ('+cart.reduce((n,x)=>n+x.quantity,0)+')';});
  refreshQuantity();
 };
 mode.addEventListener('change',refreshQuantity);batch?.addEventListener('change',refreshQuantity);
 quantity.addEventListener('input',refreshQuantity);
 refreshQuantity();
 $$('[data-primary]').forEach(el=>el.onclick=()=>{$('#primary-photo').innerHTML=image(gallery[Number(el.dataset.primary)],'detail-photo',p.name);});
 reviewArea(p.id);
}
async function reviewArea(pid){try{const reviews=await list('reviews',{product_id:'eq.'+pid,approved:'eq.true',order:'created_at.desc'});$('#review-content').innerHTML=`${reviews.map(r=>`<article class="box" style="margin:10px 0"><strong>${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</strong> <span class="small">${fmt(r.created_at)}</span><p>${e(r.body)}</p></article>`).join('')||'<p>No published reviews yet.</p>'}${currentUser()?`<form id="review-form" class="box"><h3>Leave a review</h3><div class="field"><label>Rating<select name="rating"><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select></label></div><div class="field"><label>Review<textarea name="body" minlength="10" maxlength="2000" required></textarea></label></div><div class="field"><label>Up to 3 photos (JPG/PNG/WebP, 5MB each)<input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple></label></div><button class="button">Submit for review</button></form>`:'<p><a href="#account">Sign in</a> to leave a review or upload photographs.</p>'}`;
 if(currentUser())$('#review-form').onsubmit=async ev=>{ev.preventDefault();const f=new FormData(ev.target);const files=[...ev.target.elements.photos.files];if(files.length>3)return showError('Up to three pictures per review.');try{const review=await add('reviews',{customer_id:currentUser().id,product_id:pid,rating:Number(f.get('rating')),body:String(f.get('body')).slice(0,2000)});for(const file of files){const media=await upload('review-photos',file);await add('review_photos',{review_id:review.id,storage_path:media.path});}$('#review-content').insertAdjacentHTML('afterbegin','<div class="notice success">Thank you. Your review has been submitted for moderation.</div>');ev.target.reset();}catch(err){showError(err);}};
 }catch{if($('#review-content'))$('#review-content').textContent='Reviews are not available right now.';}}
function cartPage(){
 const hasPreviews=cartHasShowcase(cart);
 const real=cart.filter(x=>x.mode!=='showcase');
 const subtotal=real.reduce((n,item)=>n+packageTotal(all.products.find(p=>p.id===item.product_id)?.price_cents??item.price_cents,item.quantity),0);
 const previewTotal=cart.filter(x=>x.mode==='showcase').reduce((n,item)=>n+packageTotal(item.price_cents,item.quantity),0);
 const rows=cart.map((item,i)=>{
  const preview=item.mode==='showcase';
  const product=preview?null:all.products.find(p=>p.id===item.product_id);
  const showcase=preview?all.showcaseItems.find(x=>x.id===item.showcase_id):null;
  const unit=sellingUnitLabel(product?.unit||item.unit);
  const price=product?.price_cents??item.price_cents;
  const batch=all.batches.find(b=>b.id===item.batch_id&&b.product_id===item.product_id);
  const max=preview?Math.min(30,showcasePreviewLimit(showcase)):
   item.mode==='ready'?Math.min(30,Number(batch?.quantity_available||0)):30;
  return '<div class="lineitem cart-line"><div><strong>'+e(item.name)+'</strong>'+
   '<p class="small">'+(preview?'Cart preview':item.mode==='ready'?'Ready to Sell':'Preorder')+' · '+e(unit)+' · '+money(price)+'</p>'+
   '<label for="cart-qty-'+i+'"># Qty</label><span class="qty-input-wrap"><input id="cart-qty-'+i+'" data-cart-qty="'+i+'" type="number" min="0" max="'+max+
   '" step="1" value="'+item.quantity+'" inputmode="numeric"><span class="qty-arrows"><button type="button" data-qty-arrow="1" aria-label="Increase quantity">▲</button><button type="button" data-qty-arrow="-1" aria-label="Decrease quantity">▼</button></span></span></div><div><strong>'+money(packageTotal(price,item.quantity))+
   '</strong><button type="button" class="button ghost" data-remove="'+i+'">Remove</button></div></div>';
 }).join('');
 layout('<section class="section bakery-cart-section"><h1>Your Cart</h1>'+
  (cart.length?rows+
   (real.length?'<p class="total">Product subtotal: '+money(subtotal)+'</p>':'')+
   (hasPreviews?'<p class="total">Preview subtotal: '+money(previewTotal)+'</p>'+
    '<p class="small">Remove preview items to complete a real checkout.</p>':
    '<a class="button" href="#checkout">Continue to checkout</a>'):
   '<div class="empty">Your cart is empty. <a href="#shop">Browse products</a>.</div>')+'</section>');
 $$('[data-remove]').forEach(button=>button.onclick=()=>{
  cart.splice(Number(button.dataset.remove),1);saveCart();cartPage();
 });
 $$('[data-cart-qty]').forEach(input=>input.onchange=()=>{
  const index=Number(input.dataset.cartQty),item=cart[index],quantity=Number(input.value);
  if(quantity===0){cart.splice(index,1);saveCart();cartPage();return;}
  const batch=all.batches.find(b=>b.id===item.batch_id&&b.product_id===item.product_id);
  const preview=item.mode==='showcase';
  const showcase=preview?all.showcaseItems.find(x=>x.id===item.showcase_id):null;
  const permitted=preview?Math.min(30,showcasePreviewLimit(showcase)):
   item.mode==='ready'?Math.min(30,Number(batch?.quantity_available||0)):30;
  if(!validCartQuantity(quantity)||quantity>permitted){
   showError('Choose a Qty between 1 and '+permitted+'.');input.value=String(item.quantity);return;
  }
  item.quantity=quantity;saveCart();cartPage();
 });
}
async function checkoutPage(){
 if(cartHasShowcase(cart)){
  layout('<section class="section"><h1>Your Cart</h1><p>Remove preview items before checkout.</p><a class="button" href="#cart">View Cart</a></section>');
  return;
 }
 const mod=await import('./checkout-form.js');
 await mod.showCheckout({cart,all,layout,nav,showError,clearCart:()=>{cart=[];saveCart();}});
}
function success(){let last={};try{last=JSON.parse(sessionStorage.getItem('mb_latest_order')||'{}');}catch{}layout(`<section class="section box"><h1>Returning from Stripe</h1><p>Payment status is confirmed separately by Stripe. Do not assume the order is paid until its status shows Paid.</p><p>${last.id?'Order reference: '+e(last.id):'Your receipt will be emailed by Stripe when payment succeeds.'}</p>${last.token?`<a class="button" href="#track/${e(last.token)}">Check your order status</a>`:''}<p><a href="#shop">Back to bakery</a></p></section>`);cart=[];saveCart();}
async function track(token){layout('<section class="section"><h1>Track your guest order</h1><div id="order-details" class="box">Looking up order…</div></section>');try{const r=await fetch('/api/order-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});const d=await r.json();if(!r.ok)throw Error(d.error||'No order found');$('#order-details').innerHTML=`<p><strong>Order:</strong> ${e(d.order_id)}</p><p><strong>Payment:</strong> ${e(d.payment_status)}</p><p><strong>Order status:</strong> ${e(d.status)}</p><p><strong>Fulfillment:</strong> ${fmt(d.fulfillment_date)} · ${e(d.fulfillment_window)}</p><p><strong>Total:</strong> ${money(d.total_cents)}</p>`;}catch(x){showError(x);}}
async function account(section=null){
 const mod=await import('./account.js');
 return mod.account({layout,section,rerender:async()=>{await load();await render();},showError});
}
function contact(){const requestDate=sessionStorage.getItem('mb_requested_special_date')||'';sessionStorage.removeItem('mb_requested_special_date');layout(`<section class="section"><h1>Contact Momma Bee</h1><p>Questions and special-order requests are welcome. Quotes are confirmed before payment.</p><form class="box" id="contact-form"><div class="field"><label>Name<input name="name" required maxlength="120"></label></div><div class="field"><label>Email<input name="email" type="email" required value="${e(currentUser()?.email||'')}"></label></div><div class="field"><label>Request type<select name="kind"><option value="question">General question</option><option value="custom_order" ${requestDate?'selected':''}>Custom baking request</option><option value="message">Existing order question</option></select></label></div><div class="field"><label>Subject<input name="subject" maxlength="160" required value="${requestDate?e('Special order request for '+requestDate):''}"></label></div><div class="field"><label>Message / desired date / quantity<textarea name="body" maxlength="3000" minlength="10" required>${requestDate?e('I would like to ask about a special order for '+requestDate+'. Please let me know if you can accommodate it, the total price, and any additional convenience fee.'):''}</textarea></label></div>${config.turnstileSiteKey?`<div class="cf-turnstile" data-sitekey="${e(config.turnstileSiteKey)}"></div>`:''}<button class="button">Send request</button><p class="small">Sending does not create an order or reserve production capacity.</p></form></section>`);if(!currentUser()&&config.turnstileSiteKey){const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js';script.async=true;script.defer=true;document.head.appendChild(script);}$('#contact-form').onsubmit=async ev=>{ev.preventDefault();const payload=Object.fromEntries(new FormData(ev.target));try{if(currentUser())await add('messages',{customer_id:currentUser().id,customer_email:payload.email,kind:payload.kind,subject:payload.subject,body:payload.body});else{const r=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,turnstile_token:ev.target.querySelector('[name="cf-turnstile-response"]')?.value||''})});const data=await r.json();if(!r.ok)throw Error(data.error||'Message could not be sent');}ev.target.reset();$('#feedback').innerHTML='<div class="notice success">Your message was submitted to the bakery inbox.</div>';}catch(x){showError(x);}};}
function faq(){layout(faqPage());}
function gallery(){
 const photos=all.pastBakes.filter(x=>x.published&&x.image_url);
 layout('<section class="section"><div class="eyebrow"></div>'+
  '<h1>Past Bakes Gallery</h1>'+

  '<div class="grid past-bakes-gallery">'+
  (photos.map(p=>'<article class="card">'+image(p.image_url,'product-photo',p.title)+
    '<div class="card-content"><h3>'+e(p.title)+'</h3>'+
    (p.description?'<p class="small">'+e(p.description)+'</p>':'')+
    '</div></article>').join('')||
    '')+
  '</div></section>');
}
function qrPage(){
 layout('<section class="section qr-page"><div class="eyebrow">Country Bakery · Share Our Shop</div><h1>Scan to Visit MommaBee Bakery&Farmstand</h1><p>Use this printable code on flyers, booth signs, business cards, and packaging. It leads directly to our homepage.</p>'+qrMarkup()+'</section>');
 bindQrActions();
}
let idleOwner=null,idleMinutes=5,logoutBusy=false;
setIdleGate(()=>{
 const user=currentUser();
 return Boolean(user)&&(localStorage.getItem('mbee_revoked_'+user.id)==='1'||
  isIdle(idleActivityTime(user.id)||Date.now(),idleMinutes));
});
async function watchIdleSession(){
 const user=currentUser();
 if(!user){stopIdleWatch();idleOwner=null;return}
 if(idleOwner===user.id)return;
 stopIdleWatch();idleOwner=user.id;logoutBusy=false;
 let minutes=5;
 try{const result=await list('customer_profiles',{select:'idle_timeout_minutes',id:'eq.'+user.id,limit:1});
  minutes=normalizeIdle(result?.[0]?.idle_timeout_minutes);
 }catch{}
 idleMinutes=minutes;
 startIdleWatch({userId:user.id,minutes,onExpire:async()=>{
  if(logoutBusy)return;logoutBusy=true;
  try{await signOut()}finally{
   stopIdleWatch();idleOwner=null;verifiedBackOfficeRole=null;all.demoItems=[];
   location.hash='#account';await render();
  }
 }});
}
export async function resetAccountIdle(){stopIdleWatch();idleOwner=null;await watchIdleSession()}
async function render(){await watchIdleSession();const [route,pid]=decodeURIComponent((location.hash||'#home').substring(1)).split('/');await refreshBackOfficeRole();
 // Return from Admin with freshly published carousel settings and slides.
 // Hash navigation does not reload the page; do not reuse initial storefront cache.
 if(route==='home'||!route){
  try{
   const [freshSlides,rows,showcaseItems,products]=await Promise.all([
    list('home_carousel_slides',{order:'sort_order.asc',limit:500}),
    list('site_settings',{limit:1}),
    list('store_showcase_items',{order:'sort_order.asc',limit:500}),
    list('products',{limit:500})
   ]);
   all.carouselSlides=freshSlides;
   all.settings=rows[0]||{};
   all.showcaseItems=showcaseItems;
   all.products=products;
  }catch(ex){console.warn('Homepage carousel refresh unavailable; retaining last loaded content',ex);}
 }
 all.demoItems=[];if(['owner','admin'].includes(verifiedBackOfficeRole)&&all.settings.demo_store_enabled===true){all.demoItems=await list('demo_catalog_items',{order:'sort_order.asc',limit:100}).catch(()=>[]);}document.title=(route==='admin'&&isBackOfficeRole(verifiedBackOfficeRole)?'Admin | ':'')+"MommaBee Bakery&Farmstand";if(route==='legal'){layout(pid?legalPage(pid,all.settings):legalIndexPage());return;}if(!isConfigured()){layout(`<section class="section"><h1>Welcome to MommaBee Bakery&Farmstand</h1><div class="notice">Our online shop is temporarily unavailable. Please check back soon.</div><p>Thank you for your interest in MommaBee Bakery&Farmstand.</p></section>`);return;}
 try{if(route==='admin'&&!isBackOfficeRole(verifiedBackOfficeRole)){layout('<section class="section box"><h1>Page unavailable</h1><p>This page is not available for your account.</p><a class="button secondary" href="#shop">Return to shop</a></section>');return;}if(route==='admin'){const mod=await import('./admin.js');await mod.admin({layout,load,all,showError,render});return;}if(route==='sandbox-store'){nav('#shop');return;}else if(route==='shop')shop(null,null,null,pid);else if(route==='ready')shop('ready',null,null,pid);else if(route==='preorder')shop('preorder',null,null,pid);else if(route==='category')shop(null,pid);else if(route==='subcategory'){const parts=(location.hash||'').slice(1).split('/');shop(null,parts[1],parts[2]);}else if(route==='product')detail(pid);else if(route==='sandbox-product'){const test=await import('./sandbox-products.js');test.sandboxProductPage({id:pid,items:all.demoItems,allowed:['owner','admin'].includes(verifiedBackOfficeRole)&&all.settings.demo_store_enabled===true,layout,nav,showError});}else if(route==='sandbox-cart'){const test=await import('./sandbox-products.js');test.sandboxCartPage({items:all.demoItems,allowed:['owner','admin'].includes(verifiedBackOfficeRole)&&all.settings.demo_store_enabled===true,layout,showError});}else if(route==='cart')cartPage();else if(route==='checkout')await checkoutPage();else if(route==='success')success();else if(route==='sandbox-success'&&['owner','admin'].includes(verifiedBackOfficeRole))layout('<section class="section box"><h1>Stripe Sandbox Return</h1><p>This was a TEST transaction only. Open Admin → Sandbox Test Products to check the result after Stripe sends its webhook. No real customer order was created.</p><a class="button secondary" href="#shop">Back to Shop All</a></section>');else if(route==='track')track(pid);else if(route==='account')await account(pid);else if(route==='contact')contact();else if(route==='faq')faq();else if(route==='gallery')gallery();else if(route==='qr')qrPage();else home();}
 catch(ex){layout(`<section class="section"><h1>Something went wrong</h1><div class="notice error">${e(ex.message)}</div><a class="button secondary" href="#home">Return home</a></section>`);}if(route==='account'&&['profile','settings'].includes(pid)){
 const target=document.getElementById(pid==='profile'?'account-profile-section':'account-settings');
 if(target)target.scrollIntoView({block:'start',behavior:'instant'});
 else window.scrollTo({top:0,behavior:'instant'});
 }else window.scrollTo({top:0,behavior:'instant'});}
window.addEventListener('hashchange',render);
(async()=>{capturePasswordRecoveryRedirect();initCookiePreferences();bindRequiredMarkers();try{await load();}catch(ex){console.error('Could not load storefront',ex);}await render();})();
