import {config,isConfigured,currentUser,currentSession,signIn,signUp,signOut,list,add,update,upload,signedImage,request,setIdleGate,money,escapeHtml as e,safePhoto as photo,currentDate,futureDate,fmt} from './api.js';
import {isBackOfficeRole,backOfficeNavigation} from './role-navigation.js';
import {photoFor,photoByUrl,photoStatusLabel} from './photo-library.js';
import {applyBakeryBackground} from './background.js';
import {applyWebsiteSize} from './website-size.js';
import {qrMarkup,qrSvg,bindQrActions} from './qr-code.js';
import {stockPhotoFor,sandboxProductPhoto,demoMatchesView} from './stock-photography.js';
import {SAMPLE_MENU,samplesFor} from './sample-menu.js';
import {accountNavigationMarkup,bindAccountNavigation} from './account-navigation.js';
import {catalogCarouselSlides} from './catalog-carousel.js';
import {normalizeIdle,startIdleWatch,stopIdleWatch,isIdle,idleActivityTime} from './idle-session.js';
import {bindRequiredMarkers} from './required-fields.js';
import {legalIndexPage,legalPage} from './legal-policies.js';
import {initCookiePreferences} from './cookie-consent.js';
import {faqPage} from './customer-faq.js';
import {eligibleHomeSlides,homeCarouselMarkup,bindHomeCarousel,stopHomeCarousel} from './home-carousel.js';
import {departmentForCategory,departmentLabel,effectiveDepartment,filterStoreProducts,homepageStorefronts,homepageVisibleDepartments,homepageGridLayout,shopVisibleDepartments} from './store-departments.js';
import {showcaseItemsFor,showcaseIcon} from './store-showcase.js';
import {showcaseEnabled,showcaseDescription,showcasePrice,showcaseOrigin,showcaseFields} from './product-showcase-details.js';
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
  'Examples only — not available to order.'+
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
const card=p=>{
 const visual=productVisual(p),cat=categoryFor(p),sub=subcategoryFor(p);
 return '<article class="card bakery-product-card"><div class="card-media">'+image(visual.src,'product-photo',p.name)+visual.credit+'</div>'+
  '<div class="card-content"><div class="actions">'+
  (productReady(p)?'<span class="badge">Ready to sell</span>':'')+
  (productPreorder(p)?'<span class="badge">Preorder</span>':'')+'</div>'+
  '<p class="eyebrow">'+e(cat?.name||'Bakery')+(sub?' / '+e(sub.name):'')+'</p>'+
  '<h3>'+e(p.name)+'</h3><p class="small">'+e((p.description||'').slice(0,120))+'</p>'+
  '<p class="price">'+money(p.price_cents)+' <small>/ '+e(p.unit)+'</small></p>'+
  '<a class="button secondary" href="#product/'+encodeURIComponent(p.id)+'">View details</a></div></article>';
};
const showcaseCard=item=>{
 const imageMarkup=item.photo_url?'<div class="card-media">'+image(item.photo_url,'product-photo',item.name)+'</div>':'';
 const parent=all.categories.find(c=>c.id===item.category_id);
 return '<a class="card bakery-product-card store-showcase-card'+(item.photo_url?'':' is-text-only')+
  '" href="#product/'+encodeURIComponent(item.slug)+'" aria-label="View '+e(item.name)+' details">'+imageMarkup+
  '<div class="card-content"><p class="eyebrow">'+e(parent?.name||departmentLabel(item.department))+'</p>'+
  '<h3>'+e(item.name)+'</h3>'+(showcasePrice(item)?'<p class="showcase-card-price">'+e(showcasePrice(item))+'</p>':'')+'<span class="showcase-card-link">View details</span></div></a>';
};
const categories=(department=null)=>all.categories.filter(c=>c.active&&(!department||departmentForCategory(c)===department)&&(sellable().some(p=>p.category_id===c.id)||(showcaseEnabled(all.settings)&&all.settings.split_store_enabled===true&&all.showcaseItems.some(i=>i.active&&i.category_id===c.id))||(['owner','admin'].includes(verifiedBackOfficeRole)&&all.settings.demo_store_enabled===true&&all.demoItems.some(x=>x.enabled&&x.category===c.name))));
function layout(content){
 const settings=all.settings||{};
 const routeName=(location.hash||'#home').slice(1).split('/')[0]||'home';
 document.body.dataset.page=routeName;
 const crumbLabels={shop:'Shop All',ready:'Ready to Sell',preorder:'Preorder',category:'Browse Categories',subcategory:'Browse Varieties',product:'Product Details',cart:'Your Cart',checkout:'Checkout',success:'Order Status',track:'Track Your Order',account:'My Account',contact:'Contact & Special Orders',faq:'Questions & Policies',legal:'Legal & Policies',gallery:'Past Bakes',qr:'Bakery QR Code',admin:'Admin Center'};
 const crumb=routeName!=='home'&&crumbLabels[routeName]
   ?'<nav class="page-crumbs" aria-label="Breadcrumb"><a href="#home">Home</a><span aria-hidden="true">/</span><span aria-current="page">'+e(crumbLabels[routeName])+'</span></nav>'
   :'';
 applyWebsiteSize(settings.website_size);
 applyBakeryBackground(settings,config.supabaseUrl);
 stopHomeCarousel();
 $('#app').innerHTML=`<header class="header"><div class="shell nav">
 <a href="#home" class="brand">MommaBee Bakery&Farmstand</a>
 <button type="button" id="mobile-nav-toggle" class="mobile-nav-toggle" aria-controls="primary-navigation" aria-expanded="false">Menu <span aria-hidden="true">☰</span></button><nav id="primary-navigation" aria-label="Primary navigation" class="navlinks"><a href="#shop" class="${location.hash==='#shop'?'current':''}" ${location.hash==='#shop'?'aria-current="page"':''}>Shop All</a><a href="#ready" class="${location.hash==='#ready'?'current':''}" ${location.hash==='#ready'?'aria-current="page"':''}>Ready to Sell</a><a href="#preorder" class="${location.hash==='#preorder'?'current':''}" ${location.hash==='#preorder'?'aria-current="page"':''}>Preorder</a><a href="#gallery">Past Bakes</a><a href="#contact">Contact</a><a href="#cart">Cart (${cart.reduce((s,x)=>s+x.quantity,0)})</a>${accountNavigationMarkup(Boolean(currentUser()),verifiedBackOfficeRole)}</nav></div><div class="header-offerings" aria-label="Products and services"><div class="shell">${e(settings.brand_subtitle||HEADER_OFFERINGS)}</div></div></header>
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
 const toggle=$('#mobile-nav-toggle');
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
 if(toggle&&primary){
  toggle.onclick=()=>{const opened=primary.classList.toggle('mobile-open');toggle.setAttribute('aria-expanded',String(opened));};
  primary.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{primary.classList.remove('mobile-open');toggle.setAttribute('aria-expanded','false');}));
 }
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
 const showcase=split&&!mode&&showcaseEnabled(all.settings)
  ?visibleDepartments.flatMap(d=>showcaseItemsFor(all.showcaseItems,d,categoryId,subcategoryId,40)):[];
 const navigationDepartments=split?Array.from(new Set([...visibleDepartments,
  ...(requestedDepartment&&['bakery','homestand'].includes(requestedDepartment)?[requestedDepartment]:[])])):[];
 layout(`<section class="section shop-page shop-page--${mode||'all'}" data-shop-view="${mode||'all'}">
 ${announcements('shop')}
 <div class="shop-hero">
  <div class="shop-hero-copy"><h1>${e(categoryId?title:pageTitle)}</h1>${description?'<p>'+e(description)+'</p>':''}
   ${items.length?'<p class="shop-result-count"><strong>'+items.length+'</strong> items available</p>':''}
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
 <div class="grid product-results">${items.map(card).join('')+
 showcase.filter(item=>!items.some(p=>p.variety_id&&p.variety_id===item.variety_id)).map(showcaseCard).join('')||
 '<p class="shop-empty">'+e(empty)+'</p>'}</div>
 ${department!=='homestand'?demoStorePreview(mode||'all',category?.name||null):''}
 </section>`);bindDemoStore();
}
/** An Owner-supplied catalog item's own page; the existing purchasable product route remains separate. */
function showcaseDetail(item){
 const department=item.department==='homestand'?'homestand':'bakery';
 const category=all.categories.find(c=>c.id===item.category_id);
 const subcategory=all.subcategories.find(c=>c.id===item.subcategory_id);
 const allDepartment=showcaseItemsFor(all.showcaseItems,department,null,null,40);
 const related=allDepartment.filter(x=>x.id!==item.id).slice(0,4);
 const departmentName=departmentLabel(department);
 const backHref='#shop/'+department;
 const provenance=showcaseOrigin(item);
 const description=showcaseDescription(item);
 const info=showcaseFields(item);
 const photoMarkup=item.photo_url?'<figure class="showcase-detail-photo-wrap">'+image(item.photo_url,'showcase-detail-photo',item.name)+'</figure>':'';
 const crumb=[departmentName,category?.name,subcategory?.name].filter(Boolean).map(e).join(' / ');
 layout('<section class="section showcase-item-page">'+
  '<nav class="showcase-detail-breadcrumb" aria-label="Product classification"><a href="'+backHref+'">'+e(departmentName)+'</a>'+
   (category?' <span aria-hidden="true">/</span> <a href="#category/'+encodeURIComponent(category.id)+'">'+e(category.name)+'</a>':'')+
  '</nav>'+
  '<div class="showcase-detail-grid">'+photoMarkup+
  '<div class="showcase-detail-copy"><p class="eyebrow">'+crumb+'</p><h1>'+e(item.name)+'</h1>'+
   '<p class="showcase-detail-provenance">'+e(provenance)+'</p>'+
   (description?'<p class="showcase-detail-description">'+e(description)+'</p>':'')+
   '<div class="showcase-details-table">'+
      info.map(([label,value])=>'<div class="showcase-detail-info"><strong>'+e(label)+'</strong><span>'+e(value)+'</span></div>').join('')+
   '</div>'+
   '<div class="actions showcase-detail-actions"><a class="button" href="#contact">Ask about this item</a>'+
   '<a class="button secondary" href="'+backHref+'">Browse '+e(departmentName)+'</a></div>'+
  '</div></div>'+
  (related.length?'<section class="showcase-detail-related" aria-label="More '+e(departmentName)+' items">'+
   '<h2>More '+e(departmentName)+'</h2><div class="grid">'+related.map(showcaseCard).join('')+'</div></section>':'')+
  '</section>');
}
function detail(id){
 const p=all.products.find(x=>x.id===id || (x.slug===id&&x.published&&available(x)));
 if(!p||!p.published||!available(p)){
  const item=showcaseEnabled(all.settings)?all.showcaseItems.find(x=>x.active!==false&&x.slug===id):null;
  if(item){showcaseDetail(item);return;}
  layout('<div class="empty">Item not found. <a href="#shop">Return to shop</a>.</div>');
  return;
 }
 const batches=all.batches.filter(b=>b.product_id===p.id&&!b.disabled&&b.baked_on<=currentDate()&&b.quantity_available>0&&all.days.some(d=>d.enabled&&new Date(d.cutoff_at)>new Date()&&d.date<=b.best_before));
 const visual=productVisual(p);
 const gallery=[visual.src,...all.photos.filter(x=>x.product_id===p.id).sort((a,b)=>a.sort_order-b.sort_order).map(x=>x.url)].filter(Boolean);
 layout(`<div class="detail"><div><div id="primary-photo">${image(gallery[0],'detail-photo',p.name)}</div>${visual.credit}${gallery.length>1?`<div class="thumbs">${gallery.map((u,i)=>`<img src="${photo(u)}" alt="View image ${i+1}" data-primary="${i}">`).join('')}</div>`:''}</div><div><a href="#shop" class="muted">← Back to shop</a><h1>${e(p.name)}</h1><p class="price">${money(p.price_cents)} / ${e(p.unit)}</p><p>${e(p.description)}</p><hr><form id="add-form"><div class="field"><label for="mode">Ordering method</label><select id="mode" name="mode">${productReady(p)?'<option value="ready">Ready to Sell (already baked)</option>':''}${productPreorder(p)?'<option value="preorder">Preorder for a baking day</option>':''}</select></div>${batches.length?`<div class="field" id="batch-section"><label for="batch">Available finished batch</label><select id="batch" name="batch">${batches.map(b=>`<option value="${e(b.id)}">Baked ${e(b.baked_on)} · ${e(b.quantity_available)} available${b.clearance_approved?' · Clearance':''}</option>`).join('')}</select></div>`:''}<div class="field"><label for="qty">Quantity</label><input type="number" min="1" max="30" value="1" id="qty" required></div><button class="button" type="submit">Add to Cart</button></form><hr><h3>Ingredients and allergens</h3><p>${e(p.ingredients||'Please contact the bakery for ingredient details before purchasing.')}</p><p><strong>Allergens:</strong> ${e(p.allergens||'Contact the bakery for allergen information.')}</p><p class="small">${e(p.storage_notes||'')}</p></div></div><section class="section" id="reviews"><h2>Customer Reviews</h2><div id="review-content">Loading reviews…</div></section>`);
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
 try{if(route==='admin'&&!isBackOfficeRole(verifiedBackOfficeRole)){layout('<section class="section box"><h1>Page unavailable</h1><p>This page is not available for your account.</p><a class="button secondary" href="#shop">Return to shop</a></section>');return;}if(route==='admin'){const mod=await import('./admin.js');await mod.admin({layout,load,all,showError,render});return;}if(route==='sandbox-store'){nav('#shop');return;}else if(route==='shop')shop(null,null,null,pid);else if(route==='ready')shop('ready',null,null,pid);else if(route==='preorder')shop('preorder',null,null,pid);else if(route==='category')shop(null,pid);else if(route==='subcategory'){const parts=(location.hash||'').slice(1).split('/');shop(null,parts[1],parts[2]);}else if(route==='product')detail(pid);else if(route==='cart')cartPage();else if(route==='checkout')await checkoutPage();else if(route==='success')success();else if(route==='sandbox-success'&&['owner','admin'].includes(verifiedBackOfficeRole))layout('<section class="section box"><h1>Stripe Sandbox Return</h1><p>This was a TEST transaction only. Open Admin → Sandbox Test Products to check the result after Stripe sends its webhook. No real customer order was created.</p><a class="button secondary" href="#shop">Back to Shop All</a></section>');else if(route==='track')track(pid);else if(route==='account')await account(pid);else if(route==='contact')contact();else if(route==='faq')faq();else if(route==='gallery')gallery();else if(route==='qr')qrPage();else home();}
 catch(ex){layout(`<section class="section"><h1>Something went wrong</h1><div class="notice error">${e(ex.message)}</div><a class="button secondary" href="#home">Return home</a></section>`);}if(route==='account'&&['profile','settings'].includes(pid)){
 const target=document.getElementById(pid==='profile'?'account-profile-section':'account-settings');
 if(target)target.scrollIntoView({block:'start',behavior:'instant'});
 else window.scrollTo({top:0,behavior:'instant'});
 }else window.scrollTo({top:0,behavior:'instant'});}
window.addEventListener('hashchange',render);
(async()=>{initCookiePreferences();bindRequiredMarkers();try{await load();}catch(ex){console.error('Could not load storefront',ex);}await render();})();
