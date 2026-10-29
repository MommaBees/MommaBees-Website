import {currentUser,currentSession,list,add,update,remove,rpc,upload,signedImage,money,escapeHtml as e,fmt,pretty} from './api.js';
import {referenceKeyFor} from './reference-keys.js';
import {PRODUCT_TYPES,productTypeForCategory,nonfoodHoldMessage} from './product-types.js';
import {centralInputFromIso,isoFromCentralInput} from './admin-time.js';
import {adminGroupsForRole,ADMIN_DESCRIPTIONS} from './admin-navigation.js';
import {adminFieldIsRequired} from './admin-required.js';
import {formatShowcaseDate} from './showcase-date.js';
import {STORE_DEPARTMENTS,departmentForCategory,departmentLabel,taxonomyPaths,searchTaxonomyPaths,homepageGridSettings} from './store-departments.js';
import {WEBSITE_SIZE_OPTIONS,normalizeWebsiteSize,applyWebsiteSize} from './website-size.js';
import {homeCarouselMarkup,bindHomeCarousel,stopHomeCarousel,DEFAULT_CAROUSEL_INTERVAL_SECONDS,CAROUSEL_SIZE_OPTIONS,normalizeCarouselSize} from './home-carousel.js';
import {MAJOR_ALLERGENS,suggestMajorAllergens,publicAllergenStatement} from './allergens.js';
import {DIETARY_CLAIMS} from './dietary-labels.js';
import {SELLING_UNITS,sellingUnitLabel} from './selling-units.js';
import {currentDate} from './api.js';
import {pastBakeName} from './past-bakes.js';
import {harvestUploadMatches} from './harvest-photo-import.js';
import {BUILTIN_PHOTO_PRESETS,photoByUrl} from './photo-library.js';
let selected='dashboard', data={},editing=null, refs={},ctx=null;
async function productStripeRequest(method,productId=null){
 const token=currentSession()?.access_token;
 if(!token)throw Error('Sign in as Owner/Admin to synchronize the Stripe TEST catalog.');
 const path='/api/admin/product-sync'+(method==='GET'?'':'');
 const headers={Authorization:'Bearer '+token};
 if(method==='POST')headers['Content-Type']='application/json';
 const requestOptions={method,headers};
 if(method==='POST')requestOptions.body=JSON.stringify({product_id:productId});
 const r=await fetch(path,requestOptions);
 const result=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(result.error||'Stripe TEST catalog synchronization is unavailable.');
 return result;
}
function productStripeStateLabel(row){
 if(!row)return 'Not synchronized';
 if(row.status==='synced')return 'Synchronized · '+(row.stripe_price_id||'');
 if(row.status==='pending')return 'Pending — retry';
 return 'Needs attention — retry';
}
async function updateStripeStatusRows(rows){
 try{
  const result=await productStripeRequest('GET');
  const states=new Map((result.records||[]).map(record=>[record.product_id,record]));
  for(const product of rows){
   const field=document.querySelector('[data-stripe-status="'+product.id+'"]');
   if(field)field.textContent=productStripeStateLabel(states.get(product.id));
  }
 }catch(error){
  for(const product of rows){
   const field=document.querySelector('[data-stripe-status="'+product.id+'"]');
   if(field)field.textContent='Status unavailable';
  }
 }
}

const $=s=>document.querySelector(s);
const cols=(...x)=>x;
const field=(key,label,type='text',extra={})=>({key,label,type,...extra});
const configs={
 categories:{label:'Categories',fields:cols(field('department','Store department','select',{options:STORE_DEPARTMENTS}),field('product_type','Product type','select',{options:PRODUCT_TYPES}),field('name','Category name'),field('slug','URL slug (example: cookies)'),field('description','Description','textarea'),field('photo_url','Category image','image'),field('sort_order','Display order','number'),field('active','Active','bool'))},
 products:{label:'Products',fields:cols(field('department','Store department','select',{options:STORE_DEPARTMENTS}),field('category_id','Category','ref',{table:'categories'}),field('product_type','Product type','select',{options:PRODUCT_TYPES}),field('subcategory_id','Subcategory','ref',{table:'subcategories'}),field('variety_id','Variety classification (optional)','ref',{table:'catalog_varieties'}),field('variety_count','Number of varieties','number'),field('name','Product name'),field('slug','Unique URL slug'),field('description','Description','textarea'),field('price_cents','Price in dollars','money'),field('unit','Selling unit (price per selected package)','select',{options:SELLING_UNITS.map(([id])=>id)}),field('mode','Selling method','select',{options:['ready','preorder','both']}),field('lead_days','Preorder lead days','number'),field('ingredients','Ingredients','textarea'),field('storage_notes','Storage and shelf-life notes','textarea'),field('photo_url','Main photo','image'),field('published','Published','bool'),field('featured','Featured','bool'))},
 store_showcase_items:{label:'Product Showcase',fields:cols(
  field('department','Department','select',{options:STORE_DEPARTMENTS}),
  field('category_id','Category','ref',{table:'categories'}),
  field('subcategory_id','Subcategory (optional)','ref',{table:'subcategories'}),
  field('variety_id','Variety classification (optional)','ref',{table:'catalog_varieties'}),
  field('variety_count','Number of varieties','number'),
  field('product_id','Linked sale product (optional · enables actual cart)','ref',{table:'products'}),
  field('name','Display name'),
  field('slug','Identifier'),
  field('description','Item description','textarea'),
  field('price_cents','Price in dollars','money'),
  field('price_unit','Price per','select',{options:['','each','dozen','box','tray','bag','bunch','basket','pint','quart','pound','loaf','slice']}),
  field('price_kind','Price type','select',{options:['market_average','owner']}),
  field('availability_date','Availability date','date'),
  field('ingredients','Confirmed ingredients (Bakery)','textarea'),
  field('allergens','Confirmed allergens (Bakery)','textarea'),
  field('storage_notes','Storage and handling instructions','textarea'),
  field('fulfillment_note','Pickup and delivery information','textarea'),
  field('photo_url','Photo (optional)','image'),
  field('sort_order','Display order','number'),
  field('active','Show on website','bool')
 )},
 catalog_varieties:{label:'Product Varieties',fields:cols(field('category_id','Category','ref',{table:'categories'}),field('subcategory_id','Subcategory (optional)','ref',{table:'subcategories'}),field('name','Variety name'),field('slug','Variety slug'),field('sort_order','Display order','number'),field('active','Active','bool'))},
 subcategories:{label:'Subcategories',fields:cols(field('category_id','Parent category','ref',{table:'categories'}),field('name','Subcategory name'),field('slug','Subcategory slug'),field('description','Description','textarea'),field('photo_url','Subcategory image','image'),field('sort_order','Display order','number'),field('active','Active','bool'))},
 past_bakes:{label:'Past Bakes Gallery',fields:cols(field('title','Gallery photo title'),field('description','Optional photo description','textarea'),field('image_url','Past bake photograph','image'),field('sort_order','Display order','number'),field('published','Display in gallery','bool'))},
 demo_catalog_items:{label:'Sandbox Test Products',fields:cols(field('name','Test product name'),field('category','Category','select',{options:['Cookies','Cakes','Pies','Cheesecakes','Pastries']}),field('description','Test description','textarea'),field('ingredients','Sandbox ingredients (optional; enter verified facts only)','textarea'),field('allergens','Sandbox allergens (optional; do not guess)','textarea'),field('storage_notes','Sandbox storage information (optional)','textarea'),field('price_cents','Example price (dollars)','money'),field('unit','Unit','select',{options:['each','dozen','box','tray','slice']}),field('sort_order','Display order','number'),field('enabled','Enable this sample','bool'))},
 product_photos:{label:'Product Gallery Photos',fields:cols(field('product_id','Product','ref',{table:'products'}),field('url','Photo upload','image'),field('alt_text','Image description'),field('sort_order','Display order','number'))},
 stock_batches:{label:'Ready-to-Sell Inventory',fields:cols(field('product_id','Product','ref',{table:'products'}),field('batch_label','Batch label'),field('baked_on','Produced / harvested on','date'),field('best_before','Last eligible fulfillment date','date'),field('quantity_available','Quantity available','number'),field('clearance_approved','Owner approved clearance','bool'),field('clearance_note','Clearance inspection / source order','textarea'),field('disabled','Remove batch from sale','bool'))},
 baking_days:{label:'Baking & Fulfillment Calendar',key:'date',fields:cols(field('date','Baking / fulfillment date','date'),field('cutoff_at','Order cutoff (Central Time)','datetime'),field('capacity_total','Total preorder units','number'),field('pickup_enabled','Pickup available','bool'),field('delivery_enabled','Delivery available','bool'),field('pickup_windows','Pickup time windows (comma-separated)','csv'),field('day_type','Day type','select',{options:['baking','fair']}),field('event_label','Fair/event name (optional)'),field('pay_at_pickup_available','Allow Pay at Pickup on this date','bool'),field('delivery_windows','Delivery time windows (comma-separated)','csv'),field('notes','Internal notes','textarea'),field('enabled','Enabled','bool'))},
 product_day_limits:{label:'Product Day Limits',key:['product_id','baking_date'],fields:cols(field('product_id','Product','ref',{table:'products'}),field('baking_date','Baking day','ref',{table:'baking_days',key:'date'}),field('max_quantity','Maximum units','number'))},
 orders:{label:'Order Management',readMostly:true,fields:cols(field('status','Fulfillment status','select',{options:['new','confirmed','baking','ready','completed','cancelled']}),field('note','Internal/customer order note','textarea'))},
 messages:{label:'Customer Messages & Requests',readMostly:true,fields:cols(field('status','Status','select',{options:['new','in_progress','replied','closed']}))},
 reviews:{label:'Customer Review Moderation',readMostly:true,fields:cols(field('approved','Approve for publication','bool'))},
 promotions:{label:'Promotions & Coupons',fields:cols(field('title','Campaign name'),field('code','Optional coupon code'),field('kind','Discount type','select',{options:['percent','fixed']}),field('value','Percent OR fixed cents (example 500 = $5)','number'),field('scope','Apply to','select',{options:['all','products','categories','batches']}),field('scope_ids','Selected item/category/batch UUIDs (comma-separated)','uuids'),field('audience','Eligible audience','select',{options:['all','selected','returning']}),field('starts_at','Starts at','datetime'),field('ends_at','Ends at','datetime'),field('min_subtotal_cents','Minimum order subtotal (cents)','number'),field('max_discount_cents','Maximum discount (cents)','number'),field('max_uses','Maximum redemptions','number'),field('published','Active','bool'))},
 promotion_recipients:{label:'Private Promo Recipients',key:['promotion_id','customer_id'],fields:cols(field('promotion_id','Promotion','ref',{table:'promotions'}),field('customer_id','Customer account UUID'))},
 announcements:{label:'Announcements & Alerts',fields:cols(field('title','Announcement title'),field('body','Message','textarea'),field('image_url','Announcement graphic','image'),field('link_url','Link (optional)'),field('placement','Display location','select',{options:['home','shop','all']}),field('audience','Audience','select',{options:['all','signed_in','selected']}),field('priority','Priority','select',{options:['normal','urgent']}),field('starts_at','Publish after','datetime'),field('ends_at','Expire after','datetime'),field('published','Published','bool'))},
 announcement_recipients:{label:'Private Announcement Recipients',key:['announcement_id','customer_id'],fields:cols(field('announcement_id','Announcement','ref',{table:'announcements'}),field('customer_id','Customer account UUID'))},
 expenses:{label:'Expenses',fields:cols(field('purchased_on','Purchase date','date'),field('description','Description'),field('category','Cost category','select',{options:['ingredients','packaging','delivery','labor','utilities','equipment','other']}),field('amount_cents','Amount in dollars','money'),field('notes','Notes','textarea'))},
 ingredients:{label:'Ingredients & Inventory',fields:cols(field('name','Ingredient / supply'),field('unit','Unit (grams, each, oz, etc.)'),field('package_size','Package quantity','number'),field('package_cost_cents','Package price (dollars)','money'),field('quantity_on_hand','Quantity currently on hand','number'))},
 recipes:{label:'Recipe Yields',fields:cols(field('product_id','Product','ref',{table:'products'}),field('yield_quantity','Recipe yield (sellable units)','number'),field('instructions','Instructions','textarea'))},
 recipe_ingredients:{label:'Recipe Ingredient Quantities',fields:cols(field('recipe_id','Recipe','ref',{table:'recipes'}),field('ingredient_id','Ingredient','ref',{table:'ingredients'}),field('quantity','Quantity required per batch','number'))},
 customer_profiles:{label:'Customer Accounts',readMostly:true,fields:cols(field('first_name','First name'),field('last_name','Last name'),field('username','Username'),field('phone','Phone'),field('address_line1','Account street'),field('address_line2','Apt / suite'),field('city','City'),field('state','State'),field('country','Country'),field('postal_code','ZIP / postal'),field('billing_same','Billing same as account','bool'),field('billing_line1','Billing street'),field('billing_line2','Billing apt / suite'),field('billing_city','Billing city'),field('billing_state','Billing state'),field('billing_country','Billing country'),field('billing_postal_code','Billing ZIP / postal'),field('marketing_opt_in','Marketing permission','bool'))},
 home_carousel_slides:{label:'Homepage Carousel',fields:cols(field('sort_order','Display position','number'),field('eyebrow','Small heading'),field('title','Main headline'),field('description','Supporting text','textarea'),field('image_url','Carousel photo','carousel_image'),field('image_alt','Image description for screen readers'),field('primary_label','Main button label'),field('primary_href','Main button destination','select',{options:['#shop','#ready','#preorder','#gallery','#contact','#faq']}),field('secondary_label','Second button label (optional)'),field('secondary_href','Second button destination','select',{options:['#shop','#ready','#preorder','#gallery','#contact','#faq']}),field('published','Published / visible','bool'),field('starts_at','Start showing (Central Time)','datetime'),field('ends_at','Stop showing (Central Time)','datetime'))},
 site_settings:{label:'Website Appearance & Settings',single:true,fields:cols(field('brand_subtitle','Header products & services line','textarea'),field('split_store_enabled','Split store into Bakery / Homestand','bool'),field('product_showcase_enabled','Enable Product Showcase','bool'),field('home_bakery_visible','Show Bakery on homepage (split mode)','bool'),field('home_homestand_visible','Show Homestand on homepage (split mode)','bool'),field('home_both_columns','Both visible: columns per department','number'),field('home_both_rows','Both visible: rows per department','number'),field('home_single_columns','Only one visible: columns','number'),field('home_single_rows','Only one visible: rows','number'),field('placeholder_empty_shop','Show empty-shop message','bool'),field('placeholder_empty_gallery','Show empty-gallery message','bool'),field('placeholder_missing_image','Show missing-photo placeholder','bool'),field('placeholder_featured','Show empty-featured message','bool'),field('demo_store_enabled','Show test products to Owner/Admin ONLY','bool'),field('home_heading','Homepage headline'),field('home_intro','Homepage introduction','textarea'),field('hero_url','Homepage background photo','image'),field('header_url','Header image','image'),field('email','Contact email'),field('phone','Contact phone'),field('pickup_instructions','Pickup instructions','textarea'),field('delivery_zips','Allowed delivery ZIP codes (comma-separated)','csv'),field('delivery_fee_cents','Local delivery fee (dollars)','money'),field('pickup_enabled','Offer pickup','bool'),field('delivery_enabled','Offer local delivery','bool'),field('checkout_enabled','ENABLE LIVE CHECKOUT AFTER TESTING','bool'),field('pay_at_pickup_enabled','Offer Pay at Pickup (separate from Stripe)','bool'),field('pay_at_pickup_tax_reviewed','Pay-at-pickup tax configuration (staff-only; do not enable until supported)','bool'),field('pay_at_pickup_tax_rate_bps','Pay-at-pickup fallback tax rate (restricted legacy setting)','number'),field('special_date_requests_enabled','Offer off-schedule special date inquiries','bool'),field('special_date_convenience_fee_cents','Proposed off-day convenience fee (dollars; subject to approval)','money'),field('food_notice','Food/allergen disclosure','textarea'),field('terms','Legacy policy draft (internal only; not published)','textarea'))}
};
const SITE_SETTING_GROUPS=Object.freeze({"site_settings":{"label":"Website Settings","keys":["brand_subtitle","header_url","email","phone","placeholder_empty_gallery","placeholder_missing_image","food_notice","terms"]},"homepage_content":{"label":"Homepage Content","keys":["home_heading","home_intro","hero_url","placeholder_empty_shop","placeholder_featured"]},"fulfillment_settings":{"label":"Pickup & Delivery Settings","keys":["pickup_instructions","delivery_zips","delivery_fee_cents","pickup_enabled","delivery_enabled","special_date_requests_enabled","special_date_convenience_fee_cents"]},"checkout_settings":{"label":"Checkout & Payment Settings","keys":["checkout_enabled","pay_at_pickup_enabled","pay_at_pickup_tax_reviewed","pay_at_pickup_tax_rate_bps"]},"sandbox_settings":{"label":"Sandbox Display Settings","keys":["demo_store_enabled"]}});
const originalSiteFields=configs.site_settings.fields;
for(const [moduleId,group] of Object.entries(SITE_SETTING_GROUPS)){
 const fields=group.keys.map(key=>{const f=originalSiteFields.find(item=>item.key===key);if(!f)throw Error('Missing site setting '+key);return f;});
 configs[moduleId]={label:group.label,single:true,table:'site_settings',fields};
}
// Administrative groups are centralized in admin-navigation.js.
const titleFor=(table,row)=>row?.name||row?.title||row?.email||row?.description||row?.date||row?.product_name||row?.full_name||row?.subject||String(row?.id||row?.product_id||'').slice(0,8);
const short=(value)=>{if(value===null||value===undefined)return '—';if(typeof value==='boolean')return value?'Yes':'No';if(typeof value==='object')return JSON.stringify(value).slice(0,90);return String(value).slice(0,105);};
const formatCell=(key,val)=>key==='availability_date'?formatShowcaseDate(val)||'—':key.endsWith('_cents')?money(val):key==='created_at'?fmt(val):short(val);
function authShell(){
 const visibleGroups=adminGroupsForRole(ctx.role);
 const labelFor=id=>id==='store_display'?'Homepage & Category Layout':id==='website_size'?'Website Size':id==='website_background'?'Website Background':id==='users'?'Accounts & Roles':configs[id]?.label||pretty(id);
 const groupFor=visibleGroups.find(([,ids])=>ids.includes(selected))?.[0]||'Overview';
 const sections=visibleGroups.map(([group,ids],i)=>
  `<details class="admin-nav-group" ${group===groupFor?'open':''}>
    <summary>${e(group)}<span class="admin-nav-count">${ids.length}</span></summary>
    <div class="admin-nav-items">${ids.map(id=>
     `<button type="button" class="admin-nav-link ${id===selected?'active':''}" data-panel="${id}" ${id===selected?'aria-current="page"':''}>
       <strong>${e(labelFor(id))}</strong><small>${e(ADMIN_DESCRIPTIONS[id]||'Manage records')}</small>
     </button>`).join('')}</div></details>`).join('');
 const jump=visibleGroups.flatMap(([,ids])=>ids).map(id=>
  `<option value="${e(id)}" ${id===selected?'selected':''}>${e(labelFor(id))}</option>`).join('');
 ctx.layout(`<section class="section admin-workspace">
  <div class="eyebrow">MommaBee Bakery&Farmstand · Staff workspace</div>
  <h1>Bakery Admin Center</h1>
  <div class="admin-layout">
    <aside class="admin-side" aria-label="Admin management sections">
      <label class="admin-menu-search-label" for="admin-menu-search">Find a module</label>
      <input type="search" id="admin-menu-search" placeholder="Search Admin…" autocomplete="off" aria-label="Search Admin modules">
      ${sections}
    </aside>
    <div class="admin-content">
     <div class="admin-content-toolbar">
      <div class="admin-content-path">${e(groupFor)} <span aria-hidden="true">/</span> <strong>${e(labelFor(selected))}</strong></div>
      <label for="admin-jump">Go to module</label><select id="admin-jump" aria-label="Go to Admin module">${jump}</select>
     </div>
     <div id="admin-main"><div class="box">Loading…</div></div>
    </div>
  </div>
 </section>`);
 const navigate=id=>{if(!visibleGroups.some(([,ids])=>ids.includes(id)))return;selected=id;authShell();renderPanel();};
 document.querySelectorAll('[data-panel]').forEach(el=>el.addEventListener('click',()=>navigate(el.dataset.panel)));
 document.querySelector('#admin-jump')?.addEventListener('change',ev=>navigate(ev.target.value));
 document.querySelector('#admin-menu-search')?.addEventListener('input',ev=>{
  const term=ev.target.value.trim().toLowerCase();
  document.querySelectorAll('.admin-nav-group').forEach(group=>{
   let any=false;
   group.querySelectorAll('[data-panel]').forEach(button=>{
    const matched=!term||(button.textContent||'').toLowerCase().includes(term)||button.dataset.panel.includes(term);
    button.hidden=!matched;if(matched)any=true;
   });
   group.hidden=!any;
   if(term&&any)group.open=true;
  });
 });
}
export async function admin(context){ctx=context;const user=currentUser();if(!user){ctx.layout('<div class="section box"><h1>Admin sign in required</h1><p>You must sign in to an Owner/Admin account before managing the bakery.</p><a class="button" href="#account">Sign in</a></div>');return;}
 try{
  const roles=await list('staff_roles',{user_id:'eq.'+user.id});
  const authorizedRole=roles.find(x=>['owner','admin','moderator'].includes(x.role));
  if(!authorizedRole)throw Error('Your account does not have Admin access. Owner permissions must be assigned securely from Supabase SQL Editor.');
  ctx.role=authorizedRole.role;
 }
 catch(x){ctx.layout(`<div class="section box"><h1>Access denied</h1><p>${e(x.message)}</p><a href="#shop">Return to shop</a></div>`);return;}
 if(ctx.role==='moderator')selected='messages';
 authShell();await renderPanel();}
async function renderPanel(){try{if(selected==='demo_checkout_tests')return sandboxHistory();if(ctx.role==='moderator'&&!['messages','reviews'].includes(selected))throw Error('Moderator permissions are limited to messages and reviews');if(selected==='home_carousel_slides')return carouselPanel();if(selected==='website_size')return websiteSizePanel();if(selected==='store_display')return storeDisplayPanel();if(selected==='website_background'){const mod=await import('./background-admin.js');return mod.showBackgroundEditor(ctx);}if(selected==='users'){const mod=await import('./user-management.js');return mod.userManagement({showError:ctx.showError});}if(selected==='reviews'&&ctx.role==='moderator'){const mod=await import('./moderation.js');return mod.moderatorReviews({showError:ctx.showError});}if(selected==='messages'){const mod=await import('./message-center.js');return mod.renderMessages({container:'#admin-main',isAdmin:true,showError:ctx.showError});}if(selected==='dashboard')return dashboard();if(selected==='shopping')return shopping();if(selected==='reports')return reports();if(selected==='notifications')return notices();await loadTable(selected);if(selected==='store_showcase_items')await loadTable('site_settings');listPanel();}catch(err){ctx.showError(err);}}
async function loadTable(t){const table=configs[t]?.table||t;data[t]=await list(table,selected==='orders'?{order:'created_at.desc',limit:250}:selected==='messages'||selected==='reviews'?{order:'created_at.desc',limit:250}:{limit:500});}
function listPanel(){if(configs[selected]?.table==='site_settings')return siteSettingsSummary();const c=configs[selected],rows=data[selected]||[],key=c.key||'id';const visible=selected==='orders'?['customer_name','fulfillment_date','fulfillment_window','payment_status','balance_due_cents']:selected==='products'?['department','name','product_type','price_cents','published']:selected==='store_showcase_items'?['department','name','price_cents','price_unit','availability_date','active']:selected==='customer_profiles'?['account_code',...c.fields.map(f=>f.key)]:c.fields.map(f=>f.key);$('#admin-main').innerHTML=`<div class="box"><div class="section-head"><div><h2>${e(c.label)}</h2><p class="muted">${rows.length} record(s)${rows.length===500?' (showing first 500)':''}</p>${selected==='baking_days'?'<button class="button secondary" id="create-fair">Set Up 4-Day Bake Fair</button>':''}</div>${!c.readMostly?`<button class="button" id="new-record">${c.single?'Edit settings':'Add new'}</button>`:''}</div>${selected==='store_showcase_items'?`<form id="showcase-master-form" class="showcase-master-switch" aria-label="Product Showcase visibility">
 <label class="admin-store-switch" for="showcase-master-enabled">
  <input type="checkbox" id="showcase-master-enabled" ${data.site_settings?.[0]?.product_showcase_enabled!==false?'checked':''}>
  <span><strong>Enable Product Showcase</strong><small>Show or hide all showcases on the homepage, store pages, details, and carousel. Individual products have their own Show on Website control.</small></span>
 </label>
 <div class="actions"><button type="submit" class="button secondary" id="save-showcase-master">Save Product Showcase</button></div>
 <p id="showcase-master-status" aria-live="polite" role="status"></p>
 </form>`:''}${selected==='store_showcase_items'?`<section class="box harvest-bulk-panel" aria-labelledby="harvest-upload-title">
 <h3 id="harvest-upload-title">Upload Homestand Harvest Photos</h3>
 <p class="small muted">Select converted photos together. Matching vegetables are updated automatically.</p>
 <label for="harvest-upload-files">Harvest photographs (WebP, JPG, PNG · maximum 5 MB each)</label>
 <input type="file" id="harvest-upload-files" accept="image/webp,image/jpeg,image/png" multiple>
 <label class="harvest-publish-confirm" for="harvest-photo-rights">
  <input type="checkbox" id="harvest-photo-rights" required>
  <span>I have permission to display the selected photographs on this website.</span>
 </label>
 <button class="button secondary" type="button" id="harvest-upload-button">Upload matching harvest photos</button>
 <p id="harvest-upload-status" role="status" aria-live="polite"></p>
 </section>`:''}selected==='past_bakes'?"<div class=\"box\" style=\"margin:12px 0\"><h3>Bulk Upload Past Baking Photos</h3><p class=\"small muted\">Select the original bakery photographs together. They appear in the Past Bakes Gallery only, without prices or purchase links. Titles can be edited afterward.</p><label>Photographs (JPG/PNG/WebP, max 5 MB each)<input type=\"file\" id=\"past-bakes-files\" accept=\"image/jpeg,image/png,image/webp\" multiple></label><button type=\"button\" class=\"button secondary\" id=\"past-bakes-bulk\">Upload selected gallery photographs</button><div id=\"past-bakes-status\" aria-live=\"polite\"></div></div>":''}<div class="table-wrap"><table><thead><tr>${visible.slice(0,5).map(f=>`<th>${e(pretty(f))}</th>`).join('')}<th>Actions</th></tr></thead><tbody>${rows.map((r,i)=>`<tr>${visible.slice(0,5).map(f=>`<td>${e(formatCell(f,r[f]))}</td>`).join('')}<td><button class="button secondary" data-edit="${i}">${c.readMostly?'Review':'Edit'}</button>${!c.readMostly&&!c.single?`<button class="button ghost" data-delete="${i}">${selected==='products'?'Archive':'Archive/Delete'}</button>`:''}${selected==='demo_catalog_items'?`<a class="button secondary" href="#sandbox-product/${encodeURIComponent(r.id)}">View Sandbox Product</a>`:''}${selected==='products'?`<div class="admin-stripe-sync"><span class="tiny" data-stripe-status="${r.id}" role="status">Checking TEST status…</span><button type="button" class="button secondary" data-sync-product="${i}">Sync Stripe TEST</button></div>`:''}${selected==='promotions'?`<button class="button ghost" data-deliver="${i}">Send in-app offer</button>`:''}${selected==='messages'?`<button class="button ghost" data-reply="${i}">Reply</button>`:''}${selected==='reviews'?`<button class="button ghost" data-reviewpics="${i}">Photos</button>`:''}${selected==='orders'&&r.payment_method==='pay_at_pickup'&&r.payment_status==='awaiting_pickup'?`<button class="button secondary" data-collect-pickup="${i}">Record Pickup Payment</button>`:''}${selected==='orders'&&r.payment_method==='pay_at_pickup'&&r.payment_status==='awaiting_pickup'?`<button class="button ghost" data-cancel-pickup="${i}">Cancel Unpaid Pickup</button>`:''}</td></tr>`).join('')}</tbody></table></div><p class="tiny muted">Destructive actions require confirmation. Deletes may be rejected when a record is referenced by an order; unpublish instead.</p></div><dialog id="editor"><form id="record-form"><h2 id="editor-title">Edit record</h2><div id="editor-fields"></div><div class="actions"><button class="button" type="submit">Save changes</button><button class="button secondary" type="button" id="close-editor">Cancel</button></div></form></dialog>`;
 if(selected==='store_showcase_items'){
  $('#showcase-master-form').onsubmit=async event=>{
   event.preventDefault();
   const enabled=$('#showcase-master-enabled').checked;
   const save=$('#save-showcase-master');save.disabled=true;
   try{
    await update('site_settings',1,{product_showcase_enabled:enabled});
    await loadTable('site_settings');
    await ctx.load();
    $('#showcase-master-status').textContent=enabled?'Product Showcase enabled.':'Product Showcase hidden from public pages.';
   }catch(error){ctx.showError(error)}
   finally{save.disabled=false}
  };
 }
 
 if(selected==='baking_days'){
  const button=$('#create-fair');
  if(button)button.onclick=async()=>{
   const start=prompt('First fair date (YYYY-MM-DD):');
   if(start===null)return;
   if(!/^\d{4}-\d{2}-\d{2}$/.test(start)){ctx.showError('Enter the first date as YYYY-MM-DD');return;}
   const label=prompt('Fair or event name:','MommaBee Bakery&Farmstand Fair');
   if(label===null||!label.trim())return;
   const cap=Number(prompt('Maximum preorder items per day:','30'));
   if(!Number.isInteger(cap)||cap<1||cap>1000){ctx.showError('Choose a capacity between 1 and 1000');return;}
   const pickupWindow=prompt('Pickup/fair hours (example 10:00–18:00):','10:00–18:00');
   if(pickupWindow===null||!pickupWindow.trim())return;
   const dates=Array.from({length:4},(_,i)=>{
     const d=new Date(start+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);
     return d.toISOString().slice(0,10);
   });
   if(!confirm('Create four consecutive fair dates '+dates[0]+' to '+dates[3]+
      ', each with Pay at Pickup allowed? The global option still controls whether customers can use it.'))return;
   let completed=0;
   try{
    for(const day of dates){
     const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',timeZoneName:'shortOffset'}).formatToParts(new Date(day+'T18:00:00Z'));
     const offset=parts.find(p=>p.type==='timeZoneName')?.value||'';
     const match=/GMT([+-]\d{1,2})(?::(\d{2}))?/.exec(offset);
     if(!match)throw Error('Could not establish America/Chicago time offset');
     const minutes=Number(match[1])*60+Math.sign(Number(match[1]))*Number(match[2]||0);
     const cutoff=new Date(Date.parse(day+'T23:59:00Z')-minutes*60000).toISOString();
     await add('baking_days',{date:day,cutoff_at:cutoff,capacity_total:cap,pickup_enabled:true,
      delivery_enabled:false,pickup_windows:[pickupWindow.trim()],delivery_windows:[],
      day_type:'fair',event_label:label.trim(),pay_at_pickup_available:true,
      enabled:true,notes:'Four-day bake fair — verify cutoff, time zone and staff schedule'});
     completed++;
    }
    alert('Four fair dates created. Review each calendar record and adjust cutoff before inviting customers.');
    await renderPanel();
   }catch(ex){ctx.showError('Created '+completed+' fair dates. Review existing dates before retrying. '+ex.message);}
  };
 }
 if(selected==='store_showcase_items'){
  const uploadButton=$('#harvest-upload-button');
  uploadButton.onclick=async()=>{
   const files=[...($('#harvest-upload-files')?.files||[])];
   const status=$('#harvest-upload-status');
   const consent=$('#harvest-photo-rights');
   if(!files.length){status.textContent='Choose converted photographs first.';return;}
   if(!consent.checked){status.textContent='Confirm that you have permission to publish the photographs.';return;}
   if(files.length>30){status.textContent='Choose no more than 30 photographs at once.';return;}
   const {matched,skipped}=harvestUploadMatches(files,rows);
   if(!matched.length){status.textContent='No matching Homestand vegetables were found. Choose WebP files from the store-cards folder.';return;}
   if(!confirm('Upload '+matched.length+' Homestand photographs? Each matching showcase image will be replaced. No prices or products will change.'))return;
   uploadButton.disabled=true;
   let completed=0;
   const errors=[];
   try{
    for(const {file,item} of matched){
     status.textContent='Uploading '+(completed+1)+' of '+matched.length+': '+file.name;
     try{
      const image=await upload('product-photos',file);
      if(!image.url)throw Error('Storage did not return a public image URL');
      await update('store_showcase_items',item.id,{photo_url:image.url});
      completed++;
     }catch(error){errors.push(file.name+': '+error.message);}
    }
    await ctx.load();
    await renderPanel();
    const message=[
     completed+' Homestand photo'+(completed===1?'':'s')+' updated.',
     skipped.length?skipped.length+' skipped (unmatched, duplicate or restricted): '+skipped.join(', '):'',
     errors.length?errors.length+' failed: '+errors.join('; '):''
    ].filter(Boolean).join(' ');
    const newStatus=$('#harvest-upload-status');
    if(newStatus)newStatus.textContent=message;
   }catch(error){
    status.textContent=completed+' uploaded; refresh and retry unsuccessful images. '+error.message;
   }finally{uploadButton.disabled=false;}
  };
 }
 if(selected==='past_bakes'){
  const uploadButton=$('#past-bakes-bulk');
  uploadButton.onclick=async()=>{
   const files=[...($('#past-bakes-files')?.files||[])],status=$('#past-bakes-status');
   if(!files.length){status.textContent='Choose photographs before uploading.';return;}
   if(files.length>100){status.textContent='Upload 100 or fewer photographs in one batch.';return;}
   if(!confirm('Publish '+files.length+' images to the public Past Bakes Gallery? No products or sale listings will be created.'))return;
   uploadButton.disabled=true;let complete=0;
   try{
    for(const file of files){
     status.textContent='Uploading '+(complete+1)+' of '+files.length+' photographs…';
     const img=await upload('past-bakes',file);
     if(!img.url)throw Error('Gallery image URL was not returned');
     await add('past_bakes',{title:pastBakeName(file.name),description:'An earlier bakery creation — gallery display only.',image_url:img.url,sort_order:complete+1,published:true});
     complete++;
    }
    status.textContent='Uploaded '+complete+' photographs successfully.';
    await renderPanel();
   }catch(err){
    status.textContent=complete+' uploaded successfully; upload stopped: '+err.message+'. Review the list before retrying to avoid duplicates.';
    uploadButton.disabled=false;
   }
  };
 }
 $('#new-record')&&( $('#new-record').onclick=()=>openEditor(c.single?rows[0]||{id:1}:null));
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEditor(rows[Number(b.dataset.edit)]));
 if(selected==='products'){
  updateStripeStatusRows(rows);
  document.querySelectorAll('[data-sync-product]').forEach(button=>button.onclick=async()=>{
   const product=rows[Number(button.dataset.syncProduct)];
   const label=document.querySelector('[data-stripe-status="'+product.id+'"]');
   button.disabled=true;
   if(label)label.textContent='Synchronizing TEST catalog…';
   try{
    const synced=await productStripeRequest('POST',product.id);
    if(label)label.textContent=synced.status==='synced'?'Synchronized · '+synced.stripe_price_id:'Pending — retry';
   }catch(error){
    if(label)label.textContent='Needs attention — retry';
    ctx.showError('Supabase product remains saved. Stripe TEST sync: '+error.message);
   }finally{button.disabled=false;}
  });
 }

 document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{
  const record=rows[Number(b.dataset.delete)];
  if(selected==='products'){
   if(!confirm('Archive '+record.name+'? It will be unpublished and removed from featured items. Its Stripe TEST catalog product will be made inactive when sync succeeds.'))return;
   try{
    await update('products',record.id,{published:false,featured:false});
    let issue=null;
    try{await productStripeRequest('POST',record.id);}catch(error){issue=error.message;}
    await ctx.load();await renderPanel();
    if(issue)ctx.showError('Archived in Supabase. Stripe TEST archive pending: '+issue);
   }catch(error){ctx.showError(error);}
   return;
  }
  if(!confirm(`Delete this ${c.label} record? This cannot be undone. Records connected to orders may not be deletable.`))return;
  try{
   if(Array.isArray(key)){ctx.showError('Composite-key deletion requires manual SQL review; use the individual Admin forms or SQL Editor.');return;}
   await remove(selected,record[key],key);await ctx.load();await renderPanel();
  }catch(error){ctx.showError(error);}
 });
 document.querySelectorAll('[data-deliver]').forEach(b=>b.onclick=async()=>{const p=rows[Number(b.dataset.deliver)];if(!confirm('Send this ACTIVE promotion as an in-app notification to eligible, opted-in customer accounts?'))return;try{const count=await rpc('deliver_promotion',{p_promo_id:p.id});alert('Delivered to '+count+' eligible account(s). No marketing emails or text messages were sent.');}catch(x){ctx.showError(x);}});
 document.querySelectorAll('[data-reply]').forEach(b=>b.onclick=()=>reply(rows[Number(b.dataset.reply)]));
 document.querySelectorAll('[data-reviewpics]').forEach(b=>b.onclick=()=>reviewPhotos(rows[Number(b.dataset.reviewpics)]));

 document.querySelectorAll('[data-cancel-pickup]').forEach(b=>b.onclick=async()=>{
  const order=rows[Number(b.dataset.cancelPickup)];
  const reason=prompt('Reason for cancelling this UNPAID pickup order (stock will be restored):');
  if(reason===null)return;
  if(reason.trim().length<6){ctx.showError('Provide a cancellation reason of at least six characters');return;}
  if(!confirm('Cancel order '+order.id+'? This returns reserved stock and cannot be undone.'))return;
  try{
   const token=JSON.parse(sessionStorage.getItem('mb_session')||'{}').access_token;
   const r=await fetch('/api/admin/cancel-pickup',{method:'POST',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
    body:JSON.stringify({order_id:order.id,reason:reason.trim(),confirm_cancel:true})});
   const data=await r.json();
   if(!r.ok)throw Error(data.error||'Cancellation failed');
   await renderPanel();
  }catch(ex){ctx.showError(ex);}
 });

 document.querySelectorAll('[data-collect-pickup]').forEach(b=>b.onclick=async()=>{
  const order=rows[Number(b.dataset.collectPickup)];
  const collectedVia=prompt('Payment received at pickup? Enter cash or external_card (only after money was collected):','cash');
  if(collectedVia===null)return;
  if(!['cash','external_card'].includes(collectedVia)){ctx.showError('Enter cash or external_card');return;}
  if(!confirm('I confirm the bakery has already received the full payment of '+money(order.balance_due_cents)+' for order '+order.id+'. Record it as paid?'))return;
  try{
   const token=JSON.parse(sessionStorage.getItem('mb_session')||'{}').access_token;
   const result=await fetch('/api/admin/collect-pickup',{method:'POST',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
    body:JSON.stringify({order_id:order.id,collected_via:collectedVia,confirm_collected:true})});
   const body=await result.json();
   if(!result.ok)throw Error(body.error||'Could not confirm collection');
   alert('Collection recorded: '+money(body.amount_paid_cents));
   await renderPanel();
  }catch(ex){ctx.showError(ex);}
 });

}
async function storeDisplayPanel(){
 if(!['owner','admin'].includes(ctx.role))throw Error('Only Owner/Admin can change the store display.');
 await loadTable('site_settings');
 const settings=data.site_settings?.[0]||{};
 const original={
  split_store_enabled:settings.split_store_enabled===true,
  home_bakery_visible:settings.home_bakery_visible!==false,
  home_homestand_visible:settings.home_homestand_visible!==false,
  ...homepageGridSettings(settings)
 };
 $('#admin-main').innerHTML=`<section class="box admin-store-display">
 <h2>Homepage & Category Layout</h2>
 <form id="store-display-form">
  <label class="admin-store-switch" for="store-display-split">
   <input id="store-display-split" type="checkbox" ${original.split_store_enabled?'checked':''}>
   <span><strong>Split Store — Bakery / Homestand</strong>
    <small>Show two store departments instead of a combined shop.</small></span>
  </label>
  <fieldset class="admin-home-visibility">
   <legend>Homepage storefront visibility</legend>
   <p class="small muted" id="home-visibility-help">Select which departments appear on the homepage and in Shop All. Direct department links remain available.</p>
   <label class="admin-store-switch" for="home-bakery-visible">
    <input id="home-bakery-visible" type="checkbox" ${original.home_bakery_visible?'checked':''}>
    <span><strong>Show Bakery on homepage</strong></span>
   </label>
   <label class="admin-store-switch" for="home-homestand-visible">
    <input id="home-homestand-visible" type="checkbox" ${original.home_homestand_visible?'checked':''}>
    <span><strong>Show Homestand on homepage</strong></span>
   </label>
  </fieldset>
  <fieldset class="admin-home-grid-settings">
  <legend>Homepage product layout</legend>
  <div class="admin-home-grid-option">
   <strong>Both Bakery and Homestand visible</strong>
   <div class="admin-home-grid-fields">
    <label for="store-display-home_both_columns">Columns per department<input id="store-display-home_both_columns" type="number" min="1" max="6" step="1" required value="${original.home_both_columns}"></label>
    <label for="store-display-home_both_rows">Rows per department<input id="store-display-home_both_rows" type="number" min="1" max="6" step="1" required value="${original.home_both_rows}"></label>
   </div>
  </div>
  <div class="admin-home-grid-option">
   <strong>Only Bakery or only Homestand visible</strong>
   <div class="admin-home-grid-fields">
    <label for="store-display-home_single_columns">Columns<input id="store-display-home_single_columns" type="number" min="1" max="6" step="1" required value="${original.home_single_columns}"></label>
    <label for="store-display-home_single_rows">Rows<input id="store-display-home_single_rows" type="number" min="1" max="6" step="1" required value="${original.home_single_rows}"></label>
   </div>
  </div>
  <p class="small muted">Cards per department = columns × rows. Smaller screens automatically use fewer columns.</p>
 </fieldset>
  <button type="submit" class="button" id="store-display-save">Save store display</button>
  <p id="store-display-status" role="status" aria-live="polite"></p>
 </form></section>`;
 $('#store-display-form').onsubmit=async event=>{
  event.preventDefault();
  const gridKeys=Object.keys(homepageGridSettings(settings));
  const gridValues=Object.fromEntries(gridKeys.map(key=>[key,Number($('#store-display-'+key).value)]));
  if(Object.values(gridValues).some(value=>!Number.isInteger(value)||value<1||value>6)){
   $('#store-display-status').textContent='Columns and rows must be whole numbers from 1 through 6.';
   return;
  }
  const next={
   split_store_enabled:$('#store-display-split').checked,
   home_bakery_visible:$('#home-bakery-visible').checked,
   home_homestand_visible:$('#home-homestand-visible').checked,
   ...gridValues
  };
  const save=$('#store-display-save');
  save.disabled=true;
  try{
   await update('site_settings',1,next);
   await ctx.load();
   $('#store-display-status').textContent='Saved. Homepage storefront visibility updated.';
  }catch(error){
   $('#store-display-split').checked=original.split_store_enabled;
   $('#home-bakery-visible').checked=original.home_bakery_visible;
   $('#home-homestand-visible').checked=original.home_homestand_visible;
   Object.keys(homepageGridSettings(settings)).forEach(key=>{$('#store-display-'+key).value=original[key];});
   ctx.showError(error);
  }finally{save.disabled=false;}
 };
}

async function websiteSizePanel(){
 if(ctx.role!=='owner'&&ctx.role!=='admin')throw Error('Website size can only be managed by Owner/Admin.');
 await loadTable('site_settings');
 let saved=normalizeWebsiteSize(data.site_settings?.[0]?.website_size);
 $('#admin-main').innerHTML=`<section class="box admin-website-size">
  <div class="section-head"><div><h2>Website Size</h2>
   <p class="muted">Change the size of the entire website, not the homepage carousel.</p></div></div>
  <form id="website-size-form">
   <label for="website-size-select">Website size <span class="required-indicator" aria-hidden="true">* Required</span></label>
   <div class="admin-carousel-interval-controls">
    <select id="website-size-select" name="website_size" required aria-describedby="website-size-help">
     ${WEBSITE_SIZE_OPTIONS.map(option=>`<option value="${option}" ${saved===option?'selected':''}>${option==='extra-small'?'Extra Small':pretty(option)}</option>`).join('')}
    </select>
    <button type="submit" class="button" id="website-size-save">Save website size</button>
    <button type="button" class="button secondary" id="website-size-reset">Reset preview</button>
   </div>
   <p class="small muted" id="website-size-help">Extra Small, Small, Medium or Large. Text, page width, menus, photos, cards and form spacing scale together. The carousel size remains separate. Buttons retain accessible touch targets.</p>
   <p id="website-size-status" aria-live="polite" role="status"></p>
  </form>
 </section>`;
 const field=$('#website-size-select'),status=$('#website-size-status');
 field.onchange=()=>{
  const preview=applyWebsiteSize(field.value);
  status.textContent='Preview: '+(preview==='extra-small'?'Extra Small':pretty(preview))+'. Save to apply sitewide.';
 };
 $('#website-size-reset').onclick=()=>{
  field.value=saved;
  applyWebsiteSize(saved);
  status.textContent='Preview reset to the saved size.';
 };
 $('#website-size-form').onsubmit=async event=>{
  event.preventDefault();
  const value=field.value;
  if(!WEBSITE_SIZE_OPTIONS.includes(value)){
   status.textContent='Choose a listed size.';
   return;
  }
  const save=$('#website-size-save');
  save.disabled=true;
  try{
   await update('site_settings',1,{website_size:value});
   applyWebsiteSize(value);
   await ctx.load();
   saved=value; // Keep the site's cached settings in sync after Admin navigation.
   status.textContent='Website size saved: '+(value==='extra-small'?'Extra Small':pretty(value))+'.';
  }catch(error){
   applyWebsiteSize(saved);
   status.textContent='Website size was not saved.';
   ctx.showError(error);
  }finally{save.disabled=false;}
 };
}

async function carouselPanel(){
 await Promise.all([loadTable('home_carousel_slides'),loadTable('site_settings')]);
 const settings=data.site_settings?.[0]||{};
 const interval=Number(settings.home_carousel_interval_seconds)||DEFAULT_CAROUSEL_INTERVAL_SECONDS;
 const size=normalizeCarouselSize(settings.home_carousel_size);
 const rows=[...(data.home_carousel_slides||[])].sort((a,b)=>a.sort_order-b.sort_order);
 const visible=rows.filter(x=>x.published && (!x.starts_at||Date.parse(x.starts_at)<=Date.now()) && (!x.ends_at||Date.parse(x.ends_at)>Date.now())).length;
 const drafts=rows.filter(x=>!x.published).length;
 const previewSlides=rows.map(x=>({...x,published:true})); // Admin-only view; never persists draft publication
 const previewMarkup=previewSlides.length>1?homeCarouselMarkup(previewSlides,e,x=>e(x),size):'';
 const card=(r,i)=>`<article class="admin-carousel-card ${r.published?'':'is-draft'}">
 <div class="admin-carousel-thumb"><img src="${e(r.image_url)}" alt="${e(r.image_alt||r.title)}" loading="lazy"></div>
 <div class="admin-carousel-details">
  <div class="admin-carousel-status">${r.published?'Published':'Draft — not shown publicly'}${r.starts_at?' · Scheduled':''}</div>
  <h3>${e(r.title)}</h3><p>${e(r.description||'')}</p>
  <div class="admin-carousel-actions">
   <button type="button" class="button secondary" data-slide-edit="${i}">Edit slide</button>
   <button type="button" class="button secondary" data-slide-up="${i}" ${i===0?'disabled':''}>Move up</button>
   <button type="button" class="button secondary" data-slide-down="${i}" ${i===rows.length-1?'disabled':''}>Move down</button>
   <button type="button" class="button secondary" data-slide-toggle="${i}">${r.published?'Unpublish':'Publish'}</button>
   <button type="button" class="button ghost" data-slide-delete="${i}">Delete</button>
  </div></div></article>`;
 $('#admin-main').innerHTML=`<section class="box admin-carousel-manager">
 <div class="section-head"><div><h2>Homepage Carousel</h2>
 <p class="muted">Manage slides and their publication dates.</p></div>
 <button type="button" class="button" id="new-carousel-slide">Add slide</button></div>
 <div class="admin-carousel-readiness" role="status"><strong>${visible} published and currently visible · ${drafts} draft${drafts===1?'':'s'}.</strong>
 ${visible<2?'Automatic rotation requires at least two currently visible published slides. Draft or expired slides cannot rotate on the public homepage.':'The homepage rotates eligible slides every ${interval} seconds. Reduced-motion and pause controls are respected.'}
 </div>
 <form id="carousel-interval-form" class="admin-carousel-interval" aria-label="Carousel timing settings">
  <label for="carousel-interval-seconds">Time between slides (seconds) <span class="required-indicator" aria-hidden="true">* Required</span></label>
  <div class="admin-carousel-interval-controls">
    <input type="number" id="carousel-interval-seconds" name="interval" min="3" max="60" step="0.5" value="${e(interval)}" required aria-describedby="carousel-interval-help">
    <button class="button secondary" type="submit">Save interval</button>
  </div>
  <p class="small muted" id="carousel-interval-help">3–60 seconds (default 6.5). Rotation requires two published slides.</p>
  <p id="carousel-interval-save-status" role="status" aria-live="polite"></p>
 </form>
 <form id="carousel-photo-sources" class="admin-carousel-interval" aria-label="Photo item carousel settings">
 <h3>Show Bakery and Homestand Items</h3>
 <label class="checkbox"><input id="carousel-show-bakery" type="checkbox" ${settings.home_carousel_bakery_items!==false?'checked':''}> Show Bakery item photographs</label>
 <label class="checkbox"><input id="carousel-show-homestand" type="checkbox" ${settings.home_carousel_homestand_items!==false?'checked':''}> Show Homestand item photographs</label>
 <p class="small muted">Only entries with an uploaded photograph appear. Their buttons link to the matching department.</p>
 <button class="button secondary" type="submit">Save Item Selection</button>
 <p id="carousel-photo-sources-status" role="status" aria-live="polite"></p>
 </form>
 <form id="carousel-size-form" class="admin-carousel-interval admin-carousel-size" aria-label="Carousel size settings">
  <label for="carousel-size">Carousel size <span class="required-indicator" aria-hidden="true">* Required</span></label>
  <div class="admin-carousel-interval-controls">
   <select id="carousel-size" name="size" required aria-describedby="carousel-size-help">
    ${CAROUSEL_SIZE_OPTIONS.map(value=>`<option value="${value}" ${size===value?'selected':''}>${value==='extra-small'?'Extra Small':pretty(value)}</option>`).join('')}
   </select>
   <button class="button secondary" type="submit">Save size</button>
  </div>
  <p class="small muted" id="carousel-size-help">Scales text and photos together. Medium is the default.</p>
  <p id="carousel-size-save-status" role="status" aria-live="polite"></p>
 </form>
 
 ${previewMarkup?'<details id="admin-slide-preview" class="admin-slide-preview"><summary>Private preview — includes drafts</summary><p>Draft slides stay private.</p>'+previewMarkup+'</details>':''}
 <div class="admin-carousel-list">${rows.map(card).join('')||'<p>No slides have been added. Upload your first bakery photograph to begin.</p>'}</div>
 </section>
 <dialog id="editor"><form id="record-form"><h2 id="editor-title">Edit slide</h2><div id="editor-fields"></div>
 <div class="actions"><button class="button" type="submit">Save changes</button><button type="button" class="button secondary" id="close-editor">Cancel</button></div></form></dialog>`;
 const previewDetails=$('#admin-slide-preview');
 if(previewDetails)previewDetails.addEventListener('toggle',()=>{if(previewDetails.open)bindHomeCarousel(interval);else stopHomeCarousel();});
 $('#carousel-interval-form').onsubmit=async event=>{
  event.preventDefault();
  const input=$('#carousel-interval-seconds');
  const status=$('#carousel-interval-save-status');
  const seconds=Number(input.value);
  if(!Number.isFinite(seconds)||seconds<3||seconds>60||Math.round(seconds*2)!==seconds*2){
   input.setCustomValidity('Choose a value from 3 to 60 seconds in half-second increments.');
   input.reportValidity();return;
  }
  input.setCustomValidity('');
  const submit=event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled=true;
  try{
   await update('site_settings',1,{home_carousel_interval_seconds:seconds});
   settings.home_carousel_interval_seconds=seconds;
   status.textContent='Interval saved: '+seconds+' seconds. It takes effect when the homepage or preview is reloaded.';
   if(previewDetails?.open)bindHomeCarousel(seconds);
  }catch(err){status.textContent='Unable to save interval.';ctx.showError(err);}
  finally{submit.disabled=false;}
 };
 const sizeInput=$('#carousel-size');
 const sizeStatus=$('#carousel-size-save-status');
 const refreshSizePreview=()=>{
  const root=previewDetails?.querySelector('.home-carousel');
  if(!root)return;
  for(const option of CAROUSEL_SIZE_OPTIONS)root.classList.remove('home-carousel--'+option);
  root.classList.add('home-carousel--'+normalizeCarouselSize(sizeInput.value));
 };
 sizeInput.addEventListener('change',()=>{
  refreshSizePreview();
  sizeStatus.textContent='Preview updated. Select Save size to apply it to the public website.';
 });
 $('#carousel-photo-sources').onsubmit=async event=>{
  event.preventDefault();
  const settingsUpdate={home_carousel_bakery_items:$('#carousel-show-bakery').checked,
   home_carousel_homestand_items:$('#carousel-show-homestand').checked};
  try{await update('site_settings',1,settingsUpdate);Object.assign(settings,settingsUpdate);
   $('#carousel-photo-sources-status').textContent='Item selection saved.';
  }catch(error){ctx.showError(error)}
 };
 $('#carousel-size-form').onsubmit=async event=>{
  event.preventDefault();
  const chosen=sizeInput.value;
  if(!CAROUSEL_SIZE_OPTIONS.includes(chosen)){
   sizeStatus.textContent='Choose Extra Small, Small, Medium, or Large.';
   return;
  }
  const submit=event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled=true;
  try{
   await update('site_settings',1,{home_carousel_size:chosen});
   settings.home_carousel_size=chosen;
   refreshSizePreview();
   sizeStatus.textContent='Saved: '+sizeInput.selectedOptions[0].textContent+'. All public slides now use this size after the homepage reloads.';
  }catch(error){
   sizeStatus.textContent='Unable to save carousel size.';
   ctx.showError(error);
  }finally{submit.disabled=false;}
 };

 $('#carousel-interval-seconds').oninput=event=>event.currentTarget.setCustomValidity('');
 $('#new-carousel-slide').onclick=()=>openEditor(null);
 document.querySelectorAll('[data-slide-edit]').forEach(el=>el.onclick=()=>openEditor(rows[Number(el.dataset.slideEdit)]));
 const orderUpdate=async(i,j)=>{
  if(j<0||j>=rows.length)return;
  const a=rows[i],b=rows[j];
  try{await update('home_carousel_slides',a.id,{sort_order:b.sort_order});
   await update('home_carousel_slides',b.id,{sort_order:a.sort_order});
   await carouselPanel();}catch(err){ctx.showError(err);}
 };
 document.querySelectorAll('[data-slide-up]').forEach(el=>el.onclick=()=>orderUpdate(Number(el.dataset.slideUp),Number(el.dataset.slideUp)-1));
 document.querySelectorAll('[data-slide-down]').forEach(el=>el.onclick=()=>orderUpdate(Number(el.dataset.slideDown),Number(el.dataset.slideDown)+1));
 document.querySelectorAll('[data-slide-delete]').forEach(el=>el.onclick=async()=>{
  const slide=rows[Number(el.dataset.slideDelete)];
  if(!slide||!confirm('Delete this homepage carousel slide? The underlying photo will stay in Storage.'))return;
  try{await remove('home_carousel_slides',slide.id);await carouselPanel();}catch(err){ctx.showError(err);}
 });
 document.querySelectorAll('[data-slide-toggle]').forEach(el=>el.onclick=async()=>{
  const slide=rows[Number(el.dataset.slideToggle)];
  if(!slide)return;
  try{await update('home_carousel_slides',slide.id,{published:!slide.published});await carouselPanel();}
  catch(err){ctx.showError(err);}
 });
}
function siteSettingsSummary(){
 const conf=configs[selected],row=data[selected]?.[0]||{id:1};
 const fields=conf.fields.map(f=>{
  const value=row[f.key];
  const display=f.type==='money'?money(value):f.type==='bool'?(value?'Enabled':'Disabled'):short(value);
  return '<div class="admin-setting-row"><dt>'+e(f.label)+'</dt><dd>'+e(display)+'</dd></div>';
 }).join('');
 $('#admin-main').innerHTML='<section class="box admin-site-settings-summary">'+
 '<div class="section-head"><div><h2>'+e(conf.label)+'</h2></div>'+
 '<button type="button" class="button" id="edit-site-settings">Edit settings</button></div>'+
 '<dl class="admin-settings-list admin-settings-copy">'+fields+'</dl>'+
 '<dialog id="editor"><form id="record-form"><h2 id="editor-title">Edit settings</h2>'+
 '<div id="editor-fields"></div><div class="actions"><button class="button" type="submit">Save changes</button>'+
 '<button class="button secondary" type="button" id="close-editor">Cancel</button></div></form></dialog>'+
 '</section>';
 $('#edit-site-settings').onclick=()=>openEditor(row);
}
function fieldInput(f,r){const val=r?.[f.key], id='field_'+f.key;let raw='';const value=val??'';
 const mandatory=adminFieldIsRequired(selected,f.key),req=mandatory?' required':'';
 if(f.type==='bool')return `<div class="field admin-boolean-field">
 <span class="admin-field-label" id="${id}_label">${e(f.label)}</span>
 <label class="admin-boolean-toggle" for="${id}">
  <input id="${id}" type="checkbox" aria-labelledby="${id}_label" ${value?'checked':''}>
  <span>Enabled / Yes</span>
 </label></div>`;
 else if(selected==='customer_profiles'&&f.key==='username')raw=`<input id="${id}" value="${e(value)}" readonly aria-readonly="true"><small>Username changes are managed under Accounts & Roles.</small>`;
 else if(f.type==='carousel_image')raw=`<input id="${id}" value="${e(value)}" readonly aria-readonly="true" placeholder="Upload a real bakery photograph">
  ${value?'<div class="carousel-admin-preview"><img src="'+e(value)+'" alt="Current carousel photograph"></div>':''}
  <input type="file" data-carousel-photo-for="${id}" accept="image/jpeg,image/png,image/webp" aria-label="Upload carousel photograph">
  <small>Upload a JPG, PNG or WebP photograph (maximum 5 MB). The current image stays until you save a replacement.</small>`;
 else if(f.type==='textarea')raw=`<textarea id="${id}" rows="4"${req}>${e(value)}</textarea>`;
 else if(f.type==='select'){
 const types=f.key==='product_type'?(refs.catalog_product_types||[]).filter(t=>t.active!==false):[];
 const options=types.length?types.map(t=>({value:t.code,label:t.name})):f.key==='unit'?SELLING_UNITS.map(([value,label])=>({value,label})):(f.options||[]).map(t=>({value:t,label:pretty(t)}));
 const canCreate=f.key==='product_type'&&['products','categories'].includes(selected);
 raw=`<select id="${id}"${req}>${selected==='categories'&&f.key==='product_type'?'<option value="">Choose product type</option>':''}${options.map(t=>`<option value="${e(t.value)}" ${String(value)===String(t.value)?'selected':''}>${e(t.label)}</option>`).join('')}${canCreate?'<option value="__create__">+ Create Product Type</option>':''}</select>`;
 }
 else if(f.type==='ref'){
  const rowKey=referenceKeyFor(f.table);
  const options=(refs[f.table]||[]).flatMap(x=>{
   const refValue=x[rowKey];
   if(refValue===null||refValue===undefined||String(refValue)==='')return [];
   const label=f.table==='categories'?departmentLabel(departmentForCategory(x))+' → '+x.name:titleFor(f.table,x);
   const suffix=['categories','subcategories','catalog_varieties'].includes(f.table)||f.table==='baking_days'?'':' ('+String(refValue).slice(0,8)+')';
   return [`<option value="${e(String(refValue))}" ${String(value)===String(refValue)?'selected':''}>${e(label+suffix)}</option>`];
  }).join('');
  const canCreate=['categories','subcategories'].includes(f.table)&&['products','store_showcase_items','catalog_varieties','subcategories'].includes(selected);
  const none=!(refs[f.table]||[]).length;
  const emptyMessage=f.table==='products'?'No products have been created. Add a real product in Catalog → Products first.'
   :f.table==='baking_days'?'No baking dates are available. Add a date in Baking & Fulfillment Calendar first.'
   :'No '+f.table.replaceAll('_',' ')+' records are available. Create the related record first.';
  raw=`<select id="${id}" ${none&&!canCreate?'disabled':''}${req}>
   <option value="">${none?'No entries available':'Choose…'}</option>${options}${canCreate?'<option value="__create__">+ Create '+(f.table==='categories'?'Category':'Subcategory')+'</option>':''}</select>${none&&!canCreate?'<p class="admin-reference-note" role="status">'+e(emptyMessage)+'</p>':''}`;
 }
 else if(f.type==='csv'||f.type==='uuids')raw=`<input id="${id}" value="${e(Array.isArray(value)?value.join(', '):value)}"${req}>`;
 else if(f.type==='image')raw=`<input id="${id}" value="${e(value)}" placeholder="Select a real photograph or upload your own" readonly>
 <label>Choose from verified, real photographs<select data-photo-library-for="${id}">
 <option value="">Keep current picture / choose below</option>
 ${BUILTIN_PHOTO_PRESETS.map((x,i)=>`<option value="${i}">${e(x.cat)} — ${e(x.name)}</option>`).join('')}
 </select></label>
 <input type="file" data-image-for="${id}" accept="image/jpeg,image/png,image/webp">
 <small id="${id}_license">All reference photographs must be labeled as examples; bakery-owned gallery photos are from prior bakes. Upload your own photograph to replace a reference.</small>
 <div class="preset-preview" id="${id}_preview"></div>`;
 else if(f.type==='datetime'){const v=value?centralInputFromIso(value):'';raw=`<input id="${id}" type="datetime-local" value="${v}"${req}><small class="muted">Central Time (Nixa, Missouri); daylight saving time is handled automatically.</small>`;}
 else if(f.type==='number'||f.type==='money')raw=`<input id="${id}" type="number" step="${f.type==='money'?'0.01':f.key==='variety_count'?'1':'any'}"${f.key==='variety_count'?' min="0"':''} value="${value===''?'':(f.type==='money'?Number(value)/100:value)}"${req}>`;
 else raw=`<input id="${id}" type="${f.type==='date'?'date':'text'}" value="${e(value)}"${req}>`;
 return `<div class="field"><label for="${id}" ${mandatory&&['image','carousel_image'].includes(f.type)?'data-required-label="true"':''}>${e(f.label)}</label>${raw}</div>`;}
async function openEditor(record){const c=configs[selected];
 if(selected==='home_carousel_slides'&&!record){
  record={sort_order:(data.home_carousel_slides||[]).reduce((m,r)=>Math.max(m,Number(r.sort_order)||0),0)+10,
   primary_label:'Shop ready-to-sell',primary_href:'#ready',secondary_label:'Schedule a preorder',secondary_href:'#preorder',
   published:false,_unsaved:true};
 }
 editing=record;
 const tables=[...new Set(c.fields.filter(f=>f.type==='ref').map(f=>f.table))];if(['products','categories','subcategories','store_showcase_items','catalog_varieties'].includes(selected))tables.push('catalog_product_types');await Promise.all(tables.map(async t=>{refs[t]=await list(t,{limit:500}).catch(()=>[]);}));
 $('#editor-title').textContent=record&&!record._unsaved?'Edit '+c.label:'Add '+c.label;
 $('#editor-fields').innerHTML=c.fields.map(f=>fieldInput(f,record)).join('');
 if(selected==='store_showcase_items'){
  const date=$('#field_availability_date'),price=$('#field_price_cents'),kind=$('#field_price_kind');
  if(date&&(!record||record._unsaved)){
   date.required=true;
   const dateLabel=$('label[for="field_availability_date"]');
   if(dateLabel)dateLabel.textContent='Availability date * Required';
  }
  if(price&&kind)price.addEventListener('input',()=>{if(price.value!=='')kind.value='owner';});
 }
 const missingRequired=c.fields.filter(f=>f.type==='ref'&&!['subcategory_id','variety_id','product_id'].includes(f.key)&&!(refs[f.table]||[]).length&&!['categories','subcategories'].includes(f.table));
 if(missingRequired.length){
  const warning=document.createElement('p');
  warning.className='admin-reference-warning';
  warning.setAttribute('role','status');
  warning.textContent='This form cannot be saved yet: '+missingRequired.map(f=>f.label+' has no available records').join('; ')+'. Create the necessary records in the relevant Admin section first.';
  $('#editor-fields').prepend(warning);
  $('#record-form button[type="submit"]').disabled=true;
 }

  document.querySelectorAll('[data-photo-library-for]').forEach(select=>{
    const id=select.dataset.photoLibraryFor, input=document.getElementById(id);
    const preview=document.getElementById(id+'_preview'),credit=document.getElementById(id+'_license');
    const draw=()=>{
      const photo=photoByUrl(input.value);
      preview.innerHTML=photo?'<img loading="lazy" src="'+e(photo.url)+'" alt="'+e(photo.name)+'"><p class="small">'+
       e(photo.type==='bakery_original'?'Photo from our Past Bakes':'Licensed reference photo, not an actual bakery product')+
       ' · '+e(photo.license)+' · '+e(photo.credit)+'</p>':'';
    };
    select.onchange=()=>{
      const selectedPhoto=BUILTIN_PHOTO_PRESETS[Number(select.value)];
      if(select.value===''||!selectedPhoto)return;
      input.value=selectedPhoto.url;
      credit.textContent='Source: '+selectedPhoto.source+' · '+selectedPhoto.credit+' · '+selectedPhoto.license;
      draw();
    };
    draw();
  });



 if(selected==='products'){
  const mode=$('#field_mode'),unit=$('#field_unit'),slot=mode?.closest('.field');
  if(slot){
   const block=document.createElement('fieldset');
   block.className='admin-ready-inventory';
   block.id='new-ready-batch';
   block.innerHTML='<legend>Add Ready-to-Sell inventory</legend>'+
    '<p class="small">Enter the number of sellable packages available for pickup. A single, half-dozen, or dozen counts as ONE package. For additional stock later, use Ready-to-Sell Inventory.</p>'+
    '<div class="field"><label for="new-batch-quantity">Packages available to sell</label><input type="number" id="new-batch-quantity" min="0" max="100000" step="1" value="0" required></div>'+
    '<div class="field"><label for="new-batch-baked">Prepared / harvested date</label><input type="date" id="new-batch-baked" value="'+currentDate()+'"></div>'+
    '<div class="field"><label for="new-batch-best-before">Last eligible pickup date</label><input type="date" id="new-batch-best-before" value="'+currentDate()+'"></div>'+
    '<p class="small" id="new-ready-unit-note"></p>';
   slot.insertAdjacentElement('afterend',block);
   const sync=()=>{
    block.hidden=!['ready','both'].includes(mode?.value);
    const count=$('#new-batch-quantity');
    block.querySelector('#new-ready-unit-note').textContent='Each package contains '+sellingUnitLabel(unit?.value||'each')+'. Price is for one package.';
    const needsDates=!block.hidden&&Number(count?.value)>0;
    block.querySelector('#new-batch-baked').required=needsDates;
    block.querySelector('#new-batch-best-before').required=needsDates;
   };
   mode?.addEventListener('change',sync);unit?.addEventListener('change',sync);
   block.querySelector('#new-batch-quantity').addEventListener('input',sync);
   sync();
  }
 }
 if(selected==='products'){
  const form=$('#editor-fields');
  const dep=$('#field_department'),category=$('#field_category_id'),
   sub=$('#field_subcategory_id'),variety=$('#field_variety_id');
  const searchPanel=document.createElement('div');
  searchPanel.className='admin-taxonomy-search';
  searchPanel.innerHTML='<label for="product-taxonomy-search">Search department / category / variety</label>'+
   '<input type="search" id="product-taxonomy-search" placeholder="Search banana, cookies, bread, vegetables…" autocomplete="off" aria-controls="product-taxonomy-results">'+
   '<div id="product-taxonomy-results" role="listbox" aria-label="Matching catalog paths"></div>'+
   '<p class="small muted">Select a path to fill the dropdowns. A variety is a classification, not an active product.</p>';
  form.prepend(searchPanel);
  const paths=()=>taxonomyPaths(refs.categories||[],refs.subcategories||[],refs.catalog_varieties||[]);
  const updateHierarchy=(level='department')=>{
   if(level==='department'){
    for(const opt of [...category.options]){if(!opt.value)continue;
     const obj=refs.categories.find(c=>c.id===opt.value);
     opt.hidden=!obj||departmentForCategory(obj)!==dep.value;opt.disabled=opt.hidden;
    }
    if(category.selectedOptions[0]?.disabled)category.value='';
   }
   if(sub){for(const opt of [...sub.options]){if(!opt.value)continue;
     const found=refs.subcategories.find(x=>x.id===opt.value);
     opt.hidden=!found||found.category_id!==category.value;opt.disabled=opt.hidden;
    }
    if(sub.selectedOptions[0]?.disabled)sub.value='';
   }
   if(variety){for(const opt of [...variety.options]){if(!opt.value)continue;
     const found=refs.catalog_varieties.find(x=>x.id===opt.value);
     opt.hidden=!found||found.category_id!==category.value||String(found.subcategory_id||'')!==String(sub?.value||'');
     opt.disabled=opt.hidden;
    }
    if(variety.selectedOptions[0]?.disabled)variety.value='';
   }
   const item=refs.categories.find(c=>c.id===category.value);
   const suggested=productTypeForCategory(item);
   const kind=$('#field_product_type');
   if(kind&&suggested&&suggested!=='unclassified'&&suggested!==null)kind.value=suggested;
  };
  dep?.addEventListener('change',()=>{category.value='';if(sub)sub.value='';if(variety)variety.value='';updateHierarchy('department');});
  category?.addEventListener('change',()=>{if(sub)sub.value='';if(variety)variety.value='';updateHierarchy('category');});
  sub?.addEventListener('change',()=>{if(variety)variety.value='';updateHierarchy('subcategory');});
  variety?.addEventListener('change',()=>{
   const found=(refs.catalog_varieties||[]).find(v=>v.id===variety.value);
   if(found&&!$('#field_name')?.value?.trim())$('#field_name').value=found.name;
  });
  const search=$('#product-taxonomy-search'),results=$('#product-taxonomy-results');
  const showMatches=()=>{
   const query=search.value.trim();results.innerHTML='';
   if(!query)return;
   for(const path of searchTaxonomyPaths(paths(),query,20)){
    const button=document.createElement('button');
    button.type='button';button.className='admin-taxonomy-result';button.setAttribute('role','option');
    button.textContent=path.path;
    button.onclick=()=>{
     dep.value=path.department;category.value=path.categoryId;
     updateHierarchy('department');
     if(sub)sub.value=path.subcategoryId||'';
     updateHierarchy('subcategory');
     if(variety)variety.value=path.id;
     if(!$('#field_name')?.value?.trim())$('#field_name').value=path.name;
     search.value=path.path;results.innerHTML='';
    };
    results.append(button);
   }
   if(!results.children.length)results.textContent='No matching paths. Add the category or variety in Admin first.';
  };
  search?.addEventListener('input',showMatches);
  if(record?.category_id){const c=refs.categories.find(c=>c.id===record.category_id);dep.value=departmentForCategory(c);}
  updateHierarchy('department');
 }
 if(selected==='store_showcase_items'){
  const dept=$('#field_department'),cat=$('#field_category_id'),sub=$('#field_subcategory_id'),variety=$('#field_variety_id'),linked=$('#field_product_id');
  const refresh=(stage='department')=>{
   if(linked){for(const option of linked.options){if(!option.value)continue;
    const p=refs.products?.find(x=>x.id===option.value);
    option.disabled=!p||p.category_id!==cat?.value||p.department!==dept?.value;
    option.hidden=option.disabled;
   }if(linked.selectedOptions[0]?.disabled)linked.value='';}

   if(stage==='department'&&cat){
    for(const opt of cat.options){if(!opt.value)continue;
     const item=refs.categories?.find(x=>x.id===opt.value);
     opt.disabled=!item||departmentForCategory(item)!==dept.value;opt.hidden=opt.disabled;
    }
    if(cat.selectedOptions[0]?.disabled)cat.value='';
   }
   if(sub){for(const opt of sub.options){if(!opt.value)continue;
     const item=refs.subcategories?.find(x=>x.id===opt.value);
     opt.disabled=!item||item.category_id!==cat?.value;opt.hidden=opt.disabled;
    }if(sub.selectedOptions[0]?.disabled)sub.value='';}
   if(variety){for(const opt of variety.options){if(!opt.value)continue;
    const item=refs.catalog_varieties?.find(x=>x.id===opt.value);
    opt.disabled=!item||item.category_id!==cat?.value||String(item.subcategory_id||'')!==String(sub?.value||'');opt.hidden=opt.disabled;
   }if(variety.selectedOptions[0]?.disabled)variety.value='';}
  };
  dept?.addEventListener('change',()=>{cat.value='';if(sub)sub.value='';if(variety)variety.value='';refresh();});
  cat?.addEventListener('change',()=>{if(sub)sub.value='';if(variety)variety.value='';refresh('category');});
  sub?.addEventListener('change',()=>{if(variety)variety.value='';refresh('subcategory');});
  if(record?.category_id){
   const parent=refs.categories?.find(x=>x.id===record.category_id);
   if(parent&&dept)dept.value=departmentForCategory(parent);
  }
  refresh();
 }
 if(selected==='catalog_varieties'){
  const cat=$('#field_category_id'),sub=$('#field_subcategory_id');
  const filter=()=>{
   if(!sub)return;
   [...sub.options].forEach(o=>{
    if(!o.value)return;
    const ref=refs.subcategories?.find(x=>x.id===o.value);
    o.hidden=!ref||ref.category_id!==cat.value;o.disabled=o.hidden;
   });
   if(sub.selectedOptions[0]?.disabled)sub.value='';
  };
  cat?.addEventListener('change',()=>{if(sub)sub.value='';filter();});filter();
 }

 // Add new catalog options without leaving or losing the unsaved product.
 if(['products','store_showcase_items','subcategories','catalog_varieties','categories'].includes(selected)){
  const selectors=[...$('#editor-fields').querySelectorAll('select')].filter(el=>
   ['field_category_id','field_subcategory_id','field_product_type'].includes(el.id)&&
   [...el.options].some(opt=>opt.value==='__create__'));
  for(const select of selectors){
   const table=select.id==='field_category_id'?'categories':select.id==='field_subcategory_id'?'subcategories':'catalog_product_types';
   const label=table==='categories'?'Category':table==='subcategories'?'Subcategory':'Product Type';
   const panel=document.createElement('div');panel.className='admin-inline-create';panel.hidden=true;
   const productTypes=(refs.catalog_product_types||[]).filter(t=>t.active!==false);
   panel.innerHTML='<label>New '+label+' name<input type="text" class="admin-inline-name" maxlength="100" autocomplete="off" placeholder="Enter name"></label>'+
    (table==='categories'?'<label>Product type<select class="admin-inline-type">'+productTypes.map(t=>'<option value="'+e(t.code)+'">'+e(t.name)+'</option>').join('')+'</select></label>':'')+
    '<div class="actions"><button type="button" class="button admin-inline-save">Save '+label+'</button><button type="button" class="button secondary admin-inline-cancel">Cancel</button></div>'+
    '<p class="small" role="status" aria-live="polite"></p>';
   select.closest('.field').append(panel);
   const nameInput=panel.querySelector('.admin-inline-name'),save=panel.querySelector('.admin-inline-save'),
    status=panel.querySelector('[role="status"]');let previous=select.value;
   select.addEventListener('change',()=>{
    if(select.value==='__create__'){
     if(table==='categories'){
      const typeControl=panel.querySelector('.admin-inline-type');
      const choices=(refs.catalog_product_types||[]).filter(t=>t.active!==false);
      typeControl.innerHTML=choices.map(t=>'<option value="'+e(t.code)+'">'+e(t.name)+'</option>').join('');
      const current=$('#field_product_type')?.value;
      if(choices.some(t=>t.code===current))typeControl.value=current;
     }
     panel.hidden=false;nameInput.value='';status.textContent='';nameInput.focus();
    }
    else {previous=select.value;panel.hidden=true;}
   });
   panel.querySelector('.admin-inline-cancel').onclick=()=>{
    select.value=previous;panel.hidden=true;select.dispatchEvent(new Event('change',{bubbles:true}));
   };
   nameInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();save.click();}});
   save.onclick=async()=>{
    const name=nameInput.value.trim().replace(/\s+/g,' ');
    const slug=name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    if(name.length<2||name.length>100||slug.length<2){status.textContent='Enter a name of at least two letters or numbers.';return;}
    let payload;
    if(table==='categories'){
     const department=$('#field_department')?.value||'bakery',product_type=panel.querySelector('.admin-inline-type')?.value;
     if(!STORE_DEPARTMENTS.includes(department)||!product_type){status.textContent='Select a department and product type.';return;}
     payload={name,slug,department,product_type,sort_order:100,active:true};
    }else if(table==='subcategories'){
     const category_id=$('#field_category_id')?.value;
     if(!category_id||category_id==='__create__'){status.textContent='Choose a parent category first.';return;}
     payload={name,slug,category_id,sort_order:100,active:true};
    }else payload={name,code:slug,active:true};
    const duplicate=(refs[table]||[]).find(row=>
     (table==='catalog_product_types'?row.code:row.slug)===slug&&
     (table!=='subcategories'||row.category_id===payload.category_id));
    if(duplicate){status.textContent='Already exists. Choose the existing '+label.toLowerCase()+'.';return;}
    save.disabled=true;status.textContent='Saving…';
    try{
     const created=await add(table,payload);
     if(!created)throw Error('No saved '+label.toLowerCase()+' was returned.');
     refs[table]=[...(refs[table]||[]),created];
     const option=document.createElement('option');
     option.value=table==='catalog_product_types'?created.code:created.id;
     option.textContent=table==='categories'?departmentLabel(departmentForCategory(created))+' → '+created.name:created.name;
     select.insertBefore(option,select.querySelector('option[value="__create__"]'));
     select.value=option.value;panel.hidden=true;select.dispatchEvent(new Event('change',{bubbles:true}));
    }catch(error){status.textContent=error.message||'Unable to save.';ctx.showError(error);}
    finally{save.disabled=false;}
   };
  }
 }
 if(selected==='orders'&&record){
  const details=record.guest_contact_address||record.delivery_address||{};
  const output='<div class="box"><h3>Pickup / Delivery Details</h3>'+
   '<p><strong>Order:</strong> '+e(record.id)+'</p>'+
   '<p><strong>Customer:</strong> '+e(record.customer_name||'—')+'</p>'+
   '<p><strong>Email:</strong> '+e(record.email||'Not supplied (text contact)')+'</p>'+
   '<p><strong>Text-only phone:</strong> '+e(record.phone||'Not supplied')+'</p>'+
   '<p><strong>Contact method:</strong> '+e(record.contact_channel||'email')+'</p>'+
   '<p><strong>Address:</strong> '+e([details.street,details.city,details.state,details.zip].filter(Boolean).join(', ')||'No address recorded')+'</p>'+
   '<p><strong>Fulfillment:</strong> '+e(record.fulfillment_method)+' · '+e(record.fulfillment_date)+' · '+e(record.fulfillment_window)+'</p>'+
   '<p><strong>Payment:</strong> '+e(record.payment_method||'stripe')+' · '+e(record.payment_status)+
   ' · Balance due '+money(record.balance_due_cents||0)+'</p>'+
   '<p><strong>Total:</strong> '+money(record.total_cents||0)+'</p>'+
   '<div id="order-item-details">Loading purchased items…</div></div>';
  $('#editor-fields').insertAdjacentHTML('afterbegin',output);
  list('order_items',{order_id:'eq.'+record.id}).then(items=>{
   const holder=$('#order-item-details');
   if(holder)holder.innerHTML='<h4>Order Items</h4>'+(items.map(i=>
    '<p>'+e(i.product_name)+' × '+e(i.quantity)+' · '+money(i.unit_price_cents)+'</p>').join('')||'<p>No order lines.</p>');
  }).catch(()=>{const holder=$('#order-item-details');if(holder)holder.textContent='Unable to load order items.';});
 }


 if(selected==='products'){
  const selectedGroups=Array.isArray(record?.major_allergens)?record.major_allergens:[];
  const controls=MAJOR_ALLERGENS.map(name=>
    '<label class="allergen-choice"><input type="checkbox" class="major-allergen" value="'+e(name)+'"'+
    (selectedGroups.includes(name)?' checked':'')+'> '+e(name)+'</label>').join('');
  $('#editor-fields').insertAdjacentHTML('beforeend',
    '<fieldset class="allergen-panel"><legend>Major allergen review — all nine FDA groups</legend>'+
    '<p class="small">Suggestions come from the entered name and ingredient words; they are NOT a verified recipe analysis. '+
    'Inspect every ingredient, topping, crust, filling, purchased mix, and supplier label. '+
    'Uncheck only allergens you have confirmed are absent as ingredients. Cross-contact may still occur.</p>'+
    '<button class="button secondary" type="button" id="suggest-major-allergens">Suggest from entered ingredients</button>'+
    '<div id="major-allergen-choices">'+controls+'</div>'+
    '<p class="small muted">Tree nuts, fish, and shellfish must be identified by their specific types in the ingredient description where used.</p>'+
    '<label class="allergen-confirm"><input type="checkbox" id="allergen-reviewed"'+
    (record?.allergen_reviewed?' checked':'')+'> I checked the actual recipe and packaging. The selected allergens accurately represent this product.</label>'+
    '<p class="small muted">A product cannot be published until ingredients and the allergen review are completed. These controls do not certify that food is allergen-free.</p></fieldset>');
  const choices=[...document.querySelectorAll('.major-allergen')],verified=$('#allergen-reviewed');
  const productPublication=$('#field_published');
  const syncReview=()=>{if(verified)verified.required=productPublication?.checked===true&&$('#field_product_type')?.value==='food';};
  productPublication?.addEventListener('change',syncReview);
  $('#field_product_type')?.addEventListener('change',syncReview);
  syncReview();
  let manuallyChanged=Boolean(record);
  const suggest=()=>{
    const groups=suggestMajorAllergens({name:$('#field_name')?.value,ingredients:$('#field_ingredients')?.value});
    choices.forEach(box=>{box.checked=groups.includes(box.value);});
    verified.checked=false;
  };
  $('#suggest-major-allergens').onclick=()=>{suggest();manuallyChanged=true;};
  choices.forEach(box=>box.onchange=()=>{manuallyChanged=true;verified.checked=false;});
  for(const id of ['#field_name','#field_ingredients']){
    const field=$(id);if(field)field.addEventListener('input',()=>{
      if(!manuallyChanged)suggest();
      verified.checked=false;
    });
  }
 }

 // Bakery dietary declarations and Showcase major-allergen classification are separately verified.
 if(['products','store_showcase_items'].includes(selected)){
  const isShowcase=selected==='store_showcase_items';
  const bakery=()=>$('#field_department')?.value==='bakery'&&
   (isShowcase||$('#field_product_type')?.value==='food');
  const current=Array.isArray(record?.dietary_claims)?record.dietary_claims:[];
  const dietary=document.createElement('fieldset');
  dietary.className='dietary-claim-panel';
  dietary.innerHTML='<legend>Bakery dietary claims (optional)</legend>'+
   '<p class="small">Select only claims verified against the complete recipe, ingredients, suppliers, and cross-contact. '+
   'Gluten-free is a regulated claim (FDA 21 CFR 101.91, including unavoidable gluten below 20 ppm). Do not claim certification without certification.</p>'+
   '<div class="dietary-claim-choices">'+DIETARY_CLAIMS.map(([code,label])=>
    '<label class="allergen-choice"><input type="checkbox" class="dietary-claim" value="'+e(code)+'"'+
    (current.includes(code)?' checked':'')+'> '+e(label)+'</label>').join('')+'</div>'+
   '<label class="allergen-confirm"><input type="checkbox" id="dietary-reviewed"'+
   (record?.dietary_claims_reviewed?' checked':'')+
   '> I verified every selected claim against this specific product, recipe, and preparation environment.</label>';
  $('#editor-fields').append(dietary);
  const checked=[...dietary.querySelectorAll('.dietary-claim')],approval=dietary.querySelector('#dietary-reviewed');
  const sync=()=>{dietary.hidden=!bakery();};
  $('#field_department')?.addEventListener('change',sync);
  $('#field_product_type')?.addEventListener('change',sync);sync();
  checked.forEach(box=>box.addEventListener('change',()=>{approval.checked=false;}));
  for(const id of ['#field_name','#field_ingredients']){
   $(id)?.addEventListener('input',()=>{approval.checked=false;});
  }
  if(isShowcase){
   const original=Array.isArray(record?.major_allergens)?record.major_allergens:[];
   const panel=document.createElement('fieldset');
   panel.className='allergen-panel showcase-allergen-panel';
   panel.innerHTML='<legend>Showcase allergens — nine major FDA groups</legend>'+
    '<p class="small">Check confirmed allergens from the complete ingredient list and supplier labels. '+
    'An unchecked allergen is not a promise that cross-contact cannot occur.</p>'+
    '<div class="showcase-allergen-choices">'+MAJOR_ALLERGENS.map(name=>
     '<label class="allergen-choice"><input type="checkbox" class="showcase-allergen" value="'+e(name)+'"'+
     (original.includes(name)?' checked':'')+'> '+e(name)+'</label>').join('')+'</div>'+
    '<button type="button" class="button secondary" id="suggest-showcase-allergens">Suggest from ingredients</button>'+
    '<label class="allergen-confirm"><input type="checkbox" id="showcase-allergens-reviewed"'+
    (record?.allergen_reviewed?' checked':'')+
    '> I reviewed the complete recipe or supplied ingredient details for these allergens.</label>';
   $('#editor-fields').append(panel);
   const reviews=panel.querySelector('#showcase-allergens-reviewed');
   const choices=[...panel.querySelectorAll('.showcase-allergen')];
   $('#suggest-showcase-allergens').onclick=()=>{
    const groups=suggestMajorAllergens({name:$('#field_name')?.value,ingredients:$('#field_ingredients')?.value});
    choices.forEach(box=>{box.checked=groups.includes(box.value);});reviews.checked=false;
   };
   choices.forEach(box=>box.addEventListener('change',()=>{reviews.checked=false;}));
   $('#field_name')?.addEventListener('input',()=>{reviews.checked=false;});
   $('#field_ingredients')?.addEventListener('input',()=>{reviews.checked=false;});
   const show=()=>{panel.hidden=$('#field_department')?.value!=='bakery';};
   $('#field_department')?.addEventListener('change',show);show();
  }
 }
 if(selected==='products'){
  const typeSelect=$('#field_product_type');
  const category=$('#field_category_id');
  const panel=$('#editor-fields .allergen-panel');
  const ingredients=$('#field_ingredients')?.closest('.field');
  const publication=$('#field_published');
  const note=document.createElement('p');
  note.className='admin-product-type-note';
  note.setAttribute('role','status');
  typeSelect.closest('.field').append(note);
  const updateTypeControls=(categoryChanged=false)=>{
   const cat=refs.categories?.find(c=>c.id===category.value);
   const categoryType=productTypeForCategory(cat);
   if(categoryChanged&&categoryType&&categoryType!=='unclassified')typeSelect.value=categoryType;
   const isFood=typeSelect.value==='food';
   if(panel)panel.hidden=!isFood;
   if(ingredients)ingredients.hidden=!isFood;
   const ingredientControl=$('#field_ingredients');if(ingredientControl)ingredientControl.required=isFood&&publication?.checked===true;
   if(publication){
    if(!isFood)publication.checked=false;
    publication.disabled=!isFood;
   }
   note.textContent=categoryType==='unclassified'
    ?'This category has not been classified. Product publication is blocked.'
    :nonfoodHoldMessage(typeSelect.value)||
      'Food products require a complete ingredient list and confirmed major-allergen review before publication.';
  };
  publication?.addEventListener('change',()=>updateTypeControls(false));
  category?.addEventListener('change',()=>updateTypeControls(true));
  typeSelect?.addEventListener('change',()=>updateTypeControls());
  updateTypeControls(!record);
 }

 const dialog=$('#editor');dialog.showModal();$('#close-editor').onclick=()=>dialog.close();
 $('#record-form').onsubmit=async event=>{event.preventDefault();try{const body={};for(const f of c.fields){if(selected==='customer_profiles'&&f.key==='username')continue;const el=$('#field_'+f.key);if(!el&&['subcategory_id','variety_id','product_id'].includes(f.key)){body[f.key]=null;continue;}let v=f.type==='bool'?el.checked:el.value;
 if(f.type==='image'){const inp=document.querySelector('[data-image-for="field_'+f.key+'"]');if(inp?.files?.[0]){const photo=await upload(selected==='past_bakes'?'past-bakes':'product-photos',inp.files[0]);v=photo.url;} }
 if(f.type==='carousel_image'){const inp=document.querySelector('[data-carousel-photo-for="field_'+f.key+'"]');if(inp?.files?.[0]){const uploaded=await upload('carousel-photos',inp.files[0]);v=uploaded.url;}if(!v)throw Error('Upload a real photograph before saving this slide.');}
 if(v==='__create__')throw Error('Save or cancel the new '+f.label+' before saving this record.');
 if(selected==='categories'&&f.key==='product_type'&&!v){
  if(!record||record._unsaved)throw Error('Choose a product type for the new category.');
  v=null;
 }
 if(f.type==='money')v=v===''?null:Math.round(Number(v)*100);
 if(f.type==='number')v=v===''?null:Number(v);
 if(f.key==='variety_count'&&v!==null&&(!Number.isInteger(v)||v<0))throw Error('Number of varieties must be a whole number of zero or more.');
 if(f.type==='csv'||f.type==='uuids')v=v.split(',').map(x=>x.trim()).filter(Boolean);
 if(f.type==='datetime')v=v?isoFromCentralInput(v):null;
 if(['max_discount_cents','max_uses'].includes(f.key)&&v==='')v=null;
 if(f.type==='ref'&&!v){
  if(!['subcategory_id','variety_id','product_id'].includes(f.key))throw Error('Select '+f.label+' before saving.');
  v=null;
 }
 if(f.key==='code'&&!v)v=null;
 if(selected==='store_showcase_items'&&f.key==='price_unit'&&!v)v=null;
 if(f.type==='date'&&v==='')v=null;
 if(f.key==='published'&&selected==='products'&&v===true&&$('#field_product_type')?.value==='food'&&!$('#field_ingredients')?.value?.trim())throw Error('Add the actual ingredient list before publishing this product.');
 body[f.key]=v;

 }
 if(selected==='store_showcase_items'&&body.product_id){
  const linkedProduct=refs.products?.find(p=>p.id===body.product_id);
  if(!linkedProduct||linkedProduct.department!==body.department||linkedProduct.category_id!==body.category_id)
   throw Error('Choose a linked sale product in the same department and category.');
 }
 if(['products','store_showcase_items'].includes(selected)){
  const bakery=body.department==='bakery'&&(selected==='store_showcase_items'||body.product_type==='food');
  const chosen=bakery?DIETARY_CLAIMS.filter(([code])=>
   [...document.querySelectorAll('.dietary-claim')].some(input=>input.value===code&&input.checked)).map(([code])=>code):[];
  const reviewed=bakery&&$('#dietary-reviewed')?.checked===true;
  if(chosen.length&&!reviewed)throw Error('Review and approve the dietary claims before saving them.');
  body.dietary_claims=chosen;body.dietary_claims_reviewed=reviewed;
  if(selected==='store_showcase_items'){
   const checked=bakery?MAJOR_ALLERGENS.filter(name=>
    [...document.querySelectorAll('.showcase-allergen')].some(input=>input.value===name&&input.checked)):[];
   const allergenReviewed=bakery&&$('#showcase-allergens-reviewed')?.checked===true;
   if(checked.length&&!allergenReviewed)throw Error('Confirm the selected Showcase allergens before saving.');
   body.major_allergens=checked;body.allergen_reviewed=allergenReviewed;
   if(allergenReviewed)body.allergens=publicAllergenStatement(checked);
   // Unreviewed free-text allergen details remain visibly unverified on customer cards.
  }
 }
 if(selected==='store_showcase_items'&&(!record||record._unsaved)&&!body.availability_date)
  throw Error('Select an availability date for this item.');
 if(selected==='home_carousel_slides'){
  if(!body.title?.trim())throw Error('Enter a headline for this slide.');
  if(!body.image_alt?.trim())throw Error('Describe the slide photograph for screen-reader users.');
  if(body.starts_at&&body.ends_at&&new Date(body.ends_at)<=new Date(body.starts_at))throw Error('The ending date must follow the starting date.');
  if(body.published&&!body.image_url)throw Error('Upload a photograph before publishing this slide.');
 }
 if(selected==='checkout_settings'&&body.pay_at_pickup_enabled&&
 (!body.pay_at_pickup_tax_reviewed||body.pay_at_pickup_tax_rate_bps===null))
 throw Error('Pay at Pickup is not yet available with automatic tax handling. Stripe Tax calculates Stripe payments only; cash collection needs its own verified tax calculation.');
 if(selected==='products'){
  const cat=refs.categories?.find(c=>c.id===body.category_id);
  const expected=productTypeForCategory(cat);
  if(expected==='unclassified')throw Error('Choose a classified product category before saving.');
  if(body.department!==departmentForCategory(cat))throw Error('Product department must match its category.');
  if(expected!==null&&body.product_type!==expected)throw Error('The product type must match its category.');
  if(body.product_type!=='food'){
   if(body.published)throw Error(nonfoodHoldMessage(body.product_type));
   body.published=false;body.featured=false;
   body.ingredients=null;body.allergens=null;body.major_allergens=[];body.allergen_reviewed=false;
  }else{
   const groups=MAJOR_ALLERGENS.filter(name=>[...document.querySelectorAll('.major-allergen')].some(input=>input.value===name&&input.checked));
   const reviewed=$('#allergen-reviewed')?.checked===true;
   body.major_allergens=groups;
   body.allergens=publicAllergenStatement(groups);
   body.allergen_reviewed=reviewed;
   if(body.published && !reviewed)throw Error('Review and confirm all nine major allergen groups before publishing.');
   if(body.published && !String(body.ingredients||'').trim())throw Error('Enter a complete ingredient list before publishing.');
  }
 }
 let batchToCreate=null;
 if(selected==='products'){
  const quantity=Number($('#new-batch-quantity')?.value||0);
  if(!Number.isInteger(quantity)||quantity<0||quantity>100000)throw Error('Enter a whole number of available packages between 0 and 100,000.');
  if(quantity>0){
   if(!['ready','both'].includes(body.mode))throw Error('Ready-to-Sell inventory requires Ready or Both selling method.');
   const baked_on=$('#new-batch-baked')?.value,best_before=$('#new-batch-best-before')?.value,today=currentDate();
   if(!baked_on||!best_before||baked_on>today||best_before<today||best_before<baked_on)
    throw Error('Enter a prepared date on or before today, and a last eligible pickup date on or after today.');
   batchToCreate={quantity_available:quantity,baked_on,best_before,batch_label:'Product editor · '+sellingUnitLabel(body.unit)};
  }
 }
 const key=c.key||'id';let saved=null;
 if(c.single){saved=await update(c.table||selected,1,body);}
 else if(record&&!record._unsaved){
  if(Array.isArray(key))throw Error('Editing records with two-part keys requires deleting/recreating from SQL Editor.');
  saved=await update(selected,record[key],body,key);
 }else saved=await add(selected,body);
 // A new stock batch is a separate inventory record. A failure must not duplicate the saved product.
 let batchError=null;
 if(selected==='products'&&batchToCreate){
  try{
   if(!saved?.id)throw Error('Saved product identifier is unavailable.');
   await add('stock_batches',{...batchToCreate,product_id:saved.id,disabled:false,clearance_approved:false});
  }catch(error){batchError=error.message||'Inventory creation failed';}
 }
 // Save succeeds in Supabase first. Stripe TEST errors never cause a duplicate product.
 let syncError=null;
 if(selected==='products'){
  try{
   if(!saved?.id)throw Error('Saved product identifier was unavailable.');
   const synced=await productStripeRequest('POST',saved.id);
   if(synced.status!=='synced')syncError='Product changed during sync. Use Sync Stripe TEST to retry.';
  }catch(error){syncError=error.message;}
 }
 dialog.close();await ctx.load();await renderPanel();
 if(syncError)ctx.showError('Product saved in Supabase and available to Cloudflare. Stripe TEST sync needs attention: '+syncError);
 if(batchError)ctx.showError('Product saved, but the Ready-to-Sell inventory batch was not added. Open Ready-to-Sell Inventory to add it: '+batchError);
 }catch(x){ctx.showError(x);}};
}
async function reply(message){const text=prompt('Write your response. It will be saved to the secure account inbox. Email delivery is not enabled by this action:');if(!text)return;try{if(!message.customer_id)throw Error('Guest email replies require a configured email provider; do not mark as replied yet.');await add('messages',{customer_id:message.customer_id,customer_email:message.customer_email,order_id:message.order_id,kind:'reply',subject:'Re: '+message.subject,body:text,parent_id:message.id,is_staff_reply:true,status:'replied'});await update('messages',message.id,{status:'replied'});await renderPanel();}catch(x){ctx.showError(x);}}
async function reviewPhotos(review){try{const items=await list('review_photos',{review_id:'eq.'+review.id});const urls=[];for(const p of items)urls.push(await signedImage('review-photos',p.storage_path));const win=window.open('','_blank','noopener,noreferrer');if(win){win.document.write('<!doctype html><title>Review photos</title><body style="font-family:sans-serif">'+urls.map(u=>u?`<img alt="Customer review upload" style="max-width:90vw;max-height:65vh" src="${e(u)}">`:'').join('<hr>')+'</body>');win.document.close();}else alert('Allow popups to view review photos.');}catch(x){ctx.showError(x);}}
async function notices(){const notes=await list('notifications',{order:'created_at.desc',limit:150});$('#admin-main').innerHTML=`<div class="box"><h2>Alerts & Notifications</h2><p class="muted">Owner/admin notifications are created for paid orders, customer requests and reviews. Customer inbox notices are delivered when order status changes.</p>${notes.map(n=>`<article class="lineitem"><div><strong>${e(n.title)}</strong><p>${e(n.body)}</p></div><small>${fmt(n.created_at)}</small></article>`).join('')||'<p class="admin-empty-state">No alerts have been recorded yet. New orders, messages, and reviews will appear here when a notification is generated.</p>'}</div>`;}
async function dashboard(){const [orders,notes,reviews,messages,expenses]=await Promise.all(['orders','notifications','reviews','messages','expenses'].map(t=>list(t,{limit:1000}).catch(()=>[])));
 const paid=orders.filter(o=>o.payment_status==='paid');const sales=paid.reduce((s,o)=>s+o.total_cents-o.tax_cents,0);
 const costs=expenses.reduce((s,x)=>s+x.amount_cents,0);
 $('#admin-main').innerHTML=`<div class="box"><h2>Bakery Overview</h2><p class="muted">Recorded figures only; not a certified accounting statement. Taxes, refunds, cost allocations and labor require review.</p><div class="stats"><div class="stat">Paid orders<strong>${paid.length}</strong></div><div class="stat">Sales excluding tax<strong>${money(sales)}</strong></div><div class="stat">Recorded expenses<strong>${money(costs)}</strong></div><div class="stat">Unadjusted difference<strong>${money(sales-costs)}</strong></div></div><hr><h3>Attention needed</h3><p><button class="button secondary" id="release-pending">Release expired checkout reservations</button></p><p>Paid orders awaiting confirmation: <strong>${paid.filter(o=>o.status==='new').length}</strong></p><p>Customer messages not closed: <strong>${messages.filter(m=>!['replied','closed'].includes(m.status)&&!m.is_staff_reply).length}</strong></p><p>Reviews awaiting approval: <strong>${reviews.filter(r=>!r.approved).length}</strong></p><p>Unread notices in database: <strong>${notes.filter(n=>!n.read_at).length}</strong></p><p><a href="#admin">Use the Admin navigation to open the required section.</a></p></div>`;const button=$('#release-pending');if(button)button.onclick=async()=>{if(!confirm('Release checkout reservations that have passed their 30-minute expiry? Do not run while webhook delivery is failing.'))return;try{const token=JSON.parse(sessionStorage.getItem('mb_session')||'{}').access_token;const r=await fetch('/api/reconcile',{method:'POST',headers:{Authorization:'Bearer '+token}});const data=await r.json();if(!r.ok)throw Error(data.error);alert('Released '+data.released+' expired reservations.');await dashboard();}catch(x){ctx.showError(x);}};}
const getPeriod=()=>{const from=$('#range-from')?.value||'';const to=$('#range-to')?.value||'9999-12-31';return {from,to};};
async function reports(){const [orders,items,expenses,products,categories]=await Promise.all(['orders','order_items','expenses','products','categories'].map(t=>list(t,{limit:5000}).catch(()=>[])));
 const today=new Date().toISOString().slice(0,10);
 $('#admin-main').innerHTML=`<div class="box"><h2>Sales & Cost Reports</h2><p class="muted">Filter by date. Revenue is recorded paid sales excluding sales tax; net result is an estimate before unrecorded costs and inventory allocation.</p><div class="filters"><label>From<input type="date" id="range-from"></label><label>To<input type="date" id="range-to" value="${today}"></label><button class="button secondary" id="refresh-report">Apply filters</button><button class="button secondary" id="export-csv">Export CSV</button></div><div id="report-output"></div></div>`;
 const compute=()=>{const {from,to}=getPeriod();const selectedOrders=orders.filter(o=>o.payment_status==='paid'&&o.created_at.slice(0,10)>=from&&o.created_at.slice(0,10)<=to);
 const ids=new Set(selectedOrders.map(x=>x.id));const sold=items.filter(x=>ids.has(x.order_id));const spent=expenses.filter(x=>x.purchased_on>=from&&x.purchased_on<=to);
 const revenue=selectedOrders.reduce((s,o)=>s+o.total_cents-o.tax_cents,0), cost=spent.reduce((s,x)=>s+x.amount_cents,0);
 const agg=new Map();for(const i of sold){const p=products.find(x=>x.id===i.product_id);const k=p?.name||i.product_name;const x=agg.get(k)||{qty:0,gross:0};x.qty+=i.quantity;x.gross+=i.quantity*i.unit_price_cents;agg.set(k,x);}
 $('#report-output').innerHTML=`<div class="stats"><div class="stat">Paid orders<strong>${selectedOrders.length}</strong></div><div class="stat">Sales ex. tax<strong>${money(revenue)}</strong></div><div class="stat">Recorded costs<strong>${money(cost)}</strong></div><div class="stat">Difference<strong>${money(revenue-cost)}</strong></div></div><h3>Best-selling products</h3><div class="table-wrap"><table><thead><tr><th>Product</th><th>Units</th><th>Gross line revenue before discounts</th></tr></thead><tbody>${[...agg].sort((a,b)=>b[1].qty-a[1].qty).map(([name,x])=>`<tr><td>${e(name)}</td><td>${x.qty}</td><td>${money(x.gross)}</td></tr>`).join('')}</tbody></table></div><p class="tiny muted">Gross line revenues are before coupon allocation, delivery, refunds and tax. Profit is not final until expenses are properly allocated.</p>`;
 return selectedOrders;};let chosen=compute();$('#refresh-report').onclick=()=>{chosen=compute();};$('#export-csv').onclick=()=>{const lines=['order_id,date,payment_status,subtotal_cents,discount_cents,delivery_cents,tax_cents,total_cents',...chosen.map(o=>[o.id,o.created_at.slice(0,10),o.payment_status,o.subtotal_cents,o.discount_cents,o.delivery_cents,o.tax_cents,o.total_cents].join(','))];saveCsv('momma-bee-farmstand-and-bakery-orders.csv',lines.join('\r\n'));};}
function saveCsv(name,content){const file=new Blob([content],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function shopping(){const [orders,items,recipes,lines,ingredients,products]=await Promise.all(['orders','order_items','recipes','recipe_ingredients','ingredients','products'].map(t=>list(t,{limit:5000}).catch(()=>[])));
 const dates=[...new Set(orders.filter(o=>o.payment_status==='paid'&&o.status!=='cancelled').map(o=>o.fulfillment_date))].sort();$('#admin-main').innerHTML=`<div class="box"><h2>Shopping List Generator</h2><p class="muted">Calculates ingredient needs from paid orders and owner-maintained recipe yields. Missing recipes will be listed explicitly. Never treat estimates as verified inventory.</p><div class="field"><label>Fulfillment date<select id="shop-date">${dates.map(d=>`<option value="${e(d)}">${fmt(d)}</option>`).join('')}</select></label></div><button id="calc-shopping" class="button secondary">Generate list</button> <button id="download-shopping" class="button ghost">Download CSV</button><div id="shopping-output"></div></div>`;let csv='';const calc=()=>{const day=$('#shop-date').value;const orderIds=new Set(orders.filter(o=>o.payment_status==='paid'&&o.status!=='cancelled'&&o.fulfillment_date===day).map(o=>o.id));const chosen=items.filter(i=>orderIds.has(i.order_id)&&i.mode==='preorder');const totals=new Map(),missing=[];
 for(const itm of chosen){const recipe=recipes.find(r=>r.product_id===itm.product_id);if(!recipe){missing.push((products.find(p=>p.id===itm.product_id)?.name||itm.product_name)+' × '+itm.quantity);continue;}for(const line of lines.filter(l=>l.recipe_id===recipe.id)){const ing=ingredients.find(i=>i.id===line.ingredient_id);if(!ing){missing.push('Missing ingredient reference in '+itm.product_name);continue;}const cur=totals.get(ing.id)||{name:ing.name,unit:ing.unit,onHand:Number(ing.quantity_on_hand),required:0};cur.required+=Number(line.quantity)*itm.quantity/Number(recipe.yield_quantity);totals.set(ing.id,cur);}}
 const results=[...totals.values()].sort((a,b)=>a.name.localeCompare(b.name));csv='ingredient,unit,needed,on_hand,to_buy\r\n'+results.map(r=>[r.name.replaceAll(',',' '),r.unit,r.required.toFixed(2),r.onHand.toFixed(2),Math.max(0,r.required-r.onHand).toFixed(2)].join(',')).join('\r\n');
 $('#shopping-output').innerHTML=`<h3>Shopping quantities for ${e(day)}</h3><div class="table-wrap"><table><thead><tr><th>Ingredient</th><th>Required</th><th>On hand</th><th>To buy</th></tr></thead><tbody>${results.map(r=>`<tr><td>${e(r.name)}</td><td>${r.required.toFixed(2)} ${e(r.unit)}</td><td>${r.onHand.toFixed(2)}</td><td><strong>${Math.max(0,r.required-r.onHand).toFixed(2)} ${e(r.unit)}</strong></td></tr>`).join('')}</tbody></table></div>${missing.length?`<div class="notice error"><strong>Missing recipe coverage:</strong><ul>${missing.map(x=>`<li>${e(x)}</li>`).join('')}</ul></div>`:''}<p class="tiny">Stock on hand is informational; recipe planning does not automatically subtract completed sales or used supplies.</p>`;};$('#calc-shopping').onclick=calc;$('#download-shopping').onclick=()=>{if(!csv)calc();saveCsv('mamma-bees-shopping-list.csv',csv);};if(dates.length)calc();else $('#shopping-output').innerHTML='<p class="empty">There are no paid orders with upcoming baking requirements yet.</p>';}


async function sandboxHistory(){
 const main=$('#admin-main');
 main.innerHTML='<div class="box"><h2>Stripe Sandbox Test History</h2><p>Loading sandbox records…</p></div>';
 try{
  const r=await list('demo_checkout_tests',{select:'id,item_name,amount_cents,status,stripe_session_id,created_at',order:'created_at.desc',limit:50});
  main.innerHTML='<section class="box"><h2>Stripe Sandbox Test History</h2>'+
   '<p class="muted">TEST transactions only; no real revenue, customer orders, inventory or fulfillment is created.</p>'+
   '<div class="table-wrap"><table><thead><tr><th>Created</th><th>Test item</th><th>Amount</th><th>Status</th><th>Stripe session</th></tr></thead><tbody>'+
   r.map(x=>'<tr><td>'+e(fmt(x.created_at))+'</td><td>'+e(x.item_name)+'</td><td>'+money(x.amount_cents)+'</td><td>'+e(x.status)+'</td><td>'+e(x.stripe_session_id||'Pending')+'</td></tr>').join('')+
   '</tbody></table></div>'+(r.length?'':'<p>No sandbox test transactions yet.</p>')+'</section>';
 }catch(err){ctx.showError(err);}
}
