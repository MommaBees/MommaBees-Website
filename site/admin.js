import {currentUser,list,add,update,remove,rpc,upload,signedImage,money,escapeHtml as e,fmt,pretty} from './api.js';
import {MAJOR_ALLERGENS,suggestMajorAllergens,publicAllergenStatement} from './allergens.js';
import {pastBakeName} from './past-bakes.js';
import {BUILTIN_PHOTO_PRESETS,photoByUrl} from './photo-library.js';
let selected='dashboard', data={},editing=null, refs={},ctx=null;
const $=s=>document.querySelector(s);
const cols=(...x)=>x;
const field=(key,label,type='text',extra={})=>({key,label,type,...extra});
const configs={
 categories:{label:'Categories',fields:cols(field('name','Category name'),field('slug','URL slug (example: cookies)'),field('description','Description','textarea'),field('photo_url','Category image','image'),field('sort_order','Display order','number'),field('active','Active','bool'))},
 products:{label:'Products',fields:cols(field('category_id','Category','ref',{table:'categories'}),field('subcategory_id','Subcategory','ref',{table:'subcategories'}),field('name','Product name'),field('slug','Unique URL slug'),field('description','Description','textarea'),field('price_cents','Price in dollars','money'),field('unit','Sold by','select',{options:['each','dozen','tray','box','slice']}),field('mode','Selling method','select',{options:['ready','preorder','both']}),field('lead_days','Preorder lead days','number'),field('ingredients','Ingredients','textarea'),field('storage_notes','Storage and shelf-life notes','textarea'),field('photo_url','Main photo','image'),field('published','Published','bool'),field('featured','Featured','bool'))},
 subcategories:{label:'Subcategories & Varieties',fields:cols(field('category_id','Parent category','ref',{table:'categories'}),field('name','Subcategory name'),field('slug','Subcategory slug'),field('description','Description','textarea'),field('photo_url','Subcategory image','image'),field('sort_order','Display order','number'),field('active','Active','bool'))},
 past_bakes:{label:'Past Bakes Gallery',fields:cols(field('title','Gallery photo title'),field('description','Optional photo description','textarea'),field('image_url','Past bake photograph','image'),field('sort_order','Display order','number'),field('published','Display in gallery','bool'))},
 demo_catalog_items:{label:'Sandbox Test Products',fields:cols(field('name','Test product name'),field('category','Category','select',{options:['Cookies','Cakes','Pies','Cheesecakes','Pastries']}),field('description','Test description','textarea'),field('price_cents','Example price (dollars)','money'),field('unit','Unit','select',{options:['each','dozen','box','tray','slice']}),field('sort_order','Display order','number'),field('enabled','Enable this sample','bool'))},
 product_photos:{label:'Product Gallery Photos',fields:cols(field('product_id','Product','ref',{table:'products'}),field('url','Photo upload','image'),field('alt_text','Image description'),field('sort_order','Display order','number'))},
 stock_batches:{label:'Ready-to-Sell Inventory',fields:cols(field('product_id','Product','ref',{table:'products'}),field('batch_label','Batch label'),field('baked_on','Baked on','date'),field('best_before','Last eligible fulfillment date','date'),field('quantity_available','Quantity available','number'),field('clearance_approved','Owner approved clearance','bool'),field('clearance_note','Clearance inspection / source order','textarea'),field('disabled','Remove batch from sale','bool'))},
 baking_days:{label:'Baking & Fulfillment Calendar',key:'date',fields:cols(field('date','Baking / fulfillment date','date'),field('cutoff_at','Order cutoff (local browser time)','datetime'),field('capacity_total','Total preorder units','number'),field('pickup_enabled','Pickup available','bool'),field('delivery_enabled','Delivery available','bool'),field('pickup_windows','Pickup time windows (comma-separated)','csv'),field('day_type','Day type','select',{options:['baking','fair']}),field('event_label','Fair/event name (optional)'),field('pay_at_pickup_available','Allow Pay at Pickup on this date','bool'),field('delivery_windows','Delivery time windows (comma-separated)','csv'),field('notes','Internal notes','textarea'),field('enabled','Enabled','bool'))},
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
 site_settings:{label:'Website Appearance & Settings',single:true,fields:cols(field('brand_subtitle','Header subtitle'),field('placeholder_empty_shop','Show empty-shop message','bool'),field('placeholder_empty_gallery','Show empty-gallery message','bool'),field('placeholder_missing_image','Show missing-photo placeholder','bool'),field('placeholder_featured','Show empty-featured message','bool'),field('demo_store_enabled','Show test products to Owner/Admin ONLY','bool'),field('home_heading','Homepage headline'),field('home_intro','Homepage introduction','textarea'),field('hero_url','Homepage background photo','image'),field('header_url','Header image','image'),field('email','Contact email'),field('phone','Contact phone'),field('pickup_instructions','Pickup instructions','textarea'),field('delivery_zips','Allowed delivery ZIP codes (comma-separated)','csv'),field('delivery_fee_cents','Local delivery fee (dollars)','money'),field('pickup_enabled','Offer pickup','bool'),field('delivery_enabled','Offer local delivery','bool'),field('checkout_enabled','ENABLE LIVE CHECKOUT AFTER TESTING','bool'),field('pay_at_pickup_enabled','Offer Pay at Pickup (separate from Stripe)','bool'),field('pay_at_pickup_tax_reviewed','Pay-at-pickup tax configuration (staff-only; do not enable until supported)','bool'),field('pay_at_pickup_tax_rate_bps','Pay-at-pickup fallback tax rate (restricted legacy setting)','number'),field('special_date_requests_enabled','Offer off-schedule special date inquiries','bool'),field('special_date_convenience_fee_cents','Proposed off-day convenience fee (dollars; subject to approval)','money'),field('food_notice','Food/allergen disclosure','textarea'),field('terms','Cancellation, return and store terms','textarea'))}
};
const groups=[['Operations',['dashboard','demo_checkout_tests','orders','stock_batches','baking_days','product_day_limits','shopping','messages','reviews','notifications']],['Catalog',['products','categories','subcategories','demo_catalog_items','past_bakes','product_photos','recipes','recipe_ingredients','ingredients']],['Marketing',['promotions','promotion_recipients','announcements','announcement_recipients']],['Design',['website_background','site_settings']],['Business',['expenses','reports','users','customer_profiles']]];
const titleFor=(table,row)=>row?.name||row?.title||row?.email||row?.description||row?.date||row?.product_name||row?.full_name||row?.subject||String(row?.id||row?.product_id||'').slice(0,8);
const short=(value)=>{if(value===null||value===undefined)return '—';if(typeof value==='boolean')return value?'Yes':'No';if(typeof value==='object')return JSON.stringify(value).slice(0,90);return String(value).slice(0,105);};
const formatCell=(key,val)=>key.endsWith('_cents')?money(val):key==='created_at'?fmt(val):short(val);
function authShell(){const visibleGroups=ctx.role==='moderator'?[['Moderation',['messages','reviews']]]:groups;const sections=visibleGroups.map(([g,tables])=>`<div class="tiny muted" style="padding:9px 12px">${e(g.toUpperCase())}</div>${tables.map(id=>`<button class="${id===selected?'active':''}" data-panel="${id}">${e(id==='website_background'?'Website Background':id==='users'?'Accounts & Roles':configs[id]?.label||pretty(id))}</button>`).join('')}`).join('');
 ctx.layout(`<section class="section"><div class="eyebrow">Private owner workspace</div><h1>Bakery Admin Center</h1><p class="muted">Orders, inventory, production, customer communications, finances, and shop content.</p><div class="admin-layout"><aside class="admin-side" aria-label="Admin management sections">${sections}</aside><div id="admin-main"><div class="box">Loading…</div></div></div></section>`);
 document.querySelectorAll('[data-panel]').forEach(el=>el.onclick=()=>{selected=el.dataset.panel;authShell();renderPanel();});
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
async function renderPanel(){try{if(selected==='demo_checkout_tests')return sandboxHistory();if(ctx.role==='moderator'&&!['messages','reviews'].includes(selected))throw Error('Moderator permissions are limited to messages and reviews');if(selected==='website_background'){const mod=await import('./background-admin.js');return mod.showBackgroundEditor(ctx);}if(selected==='users'){const mod=await import('./user-management.js');return mod.userManagement({showError:ctx.showError});}if(selected==='reviews'&&ctx.role==='moderator'){const mod=await import('./moderation.js');return mod.moderatorReviews({showError:ctx.showError});}if(selected==='messages'){const mod=await import('./message-center.js');return mod.renderMessages({container:'#admin-main',isAdmin:true,showError:ctx.showError});}if(selected==='dashboard')return dashboard();if(selected==='shopping')return shopping();if(selected==='reports')return reports();if(selected==='notifications')return notices();await loadTable(selected);listPanel();}catch(err){ctx.showError(err);}}
async function loadTable(t){data[t]=await list(t,selected==='orders'?{order:'created_at.desc',limit:250}:selected==='messages'||selected==='reviews'?{order:'created_at.desc',limit:250}:{limit:500});}
function listPanel(){const c=configs[selected],rows=data[selected]||[],key=c.key||'id';const visible=selected==='orders'?['customer_name','fulfillment_date','fulfillment_window','payment_status','balance_due_cents']:selected==='customer_profiles'?['account_code',...c.fields.map(f=>f.key)]:c.fields.map(f=>f.key);$('#admin-main').innerHTML=`<div class="box"><div class="section-head"><div><h2>${e(c.label)}</h2><p class="muted">${rows.length} record(s)${rows.length===500?' (showing first 500)':''}</p>${selected==='baking_days'?'<button class="button secondary" id="create-fair">Set Up 4-Day Bake Fair</button>':''}</div>${!c.readMostly?`<button class="button" id="new-record">${c.single?'Edit settings':'Add new'}</button>`:''}</div>${selected==='past_bakes'?"<div class=\"box\" style=\"margin:12px 0\"><h3>Bulk Upload Past Baking Photos</h3><p class=\"small muted\">Select the original bakery photographs together. They appear in the Past Bakes Gallery only, without prices or purchase links. Titles can be edited afterward.</p><label>Photographs (JPG/PNG/WebP, max 5 MB each)<input type=\"file\" id=\"past-bakes-files\" accept=\"image/jpeg,image/png,image/webp\" multiple></label><button type=\"button\" class=\"button secondary\" id=\"past-bakes-bulk\">Upload selected gallery photographs</button><div id=\"past-bakes-status\" aria-live=\"polite\"></div></div>":''}<div class="table-wrap"><table><thead><tr>${visible.slice(0,5).map(f=>`<th>${e(pretty(f))}</th>`).join('')}<th>Actions</th></tr></thead><tbody>${rows.map((r,i)=>`<tr>${visible.slice(0,5).map(f=>`<td>${e(formatCell(f,r[f]))}</td>`).join('')}<td><button class="button secondary" data-edit="${i}">${c.readMostly?'Review':'Edit'}</button>${!c.readMostly&&!c.single?`<button class="button ghost" data-delete="${i}">Archive/Delete</button>`:''}${selected==='promotions'?`<button class="button ghost" data-deliver="${i}">Send in-app offer</button>`:''}${selected==='messages'?`<button class="button ghost" data-reply="${i}">Reply</button>`:''}${selected==='reviews'?`<button class="button ghost" data-reviewpics="${i}">Photos</button>`:''}${selected==='orders'&&r.payment_method==='pay_at_pickup'&&r.payment_status==='awaiting_pickup'?`<button class="button secondary" data-collect-pickup="${i}">Record Pickup Payment</button>`:''}${selected==='orders'&&r.payment_method==='pay_at_pickup'&&r.payment_status==='awaiting_pickup'?`<button class="button ghost" data-cancel-pickup="${i}">Cancel Unpaid Pickup</button>`:''}</td></tr>`).join('')}</tbody></table></div><p class="tiny muted">Destructive actions require confirmation. Deletes may be rejected when a record is referenced by an order; unpublish instead.</p></div><dialog id="editor"><form id="record-form"><h2 id="editor-title">Edit record</h2><div id="editor-fields"></div><div class="actions"><button class="button" type="submit">Save changes</button><button class="button secondary" type="button" id="close-editor">Cancel</button></div></form></dialog>`;


 if(selected==='baking_days'){
  const button=$('#create-fair');
  if(button)button.onclick=async()=>{
   const start=prompt('First fair date (YYYY-MM-DD):');
   if(start===null)return;
   if(!/^\d{4}-\d{2}-\d{2}$/.test(start)){ctx.showError('Enter the first date as YYYY-MM-DD');return;}
   const label=prompt('Fair or event name:','Mamma Bee’s Bake Fair');
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
 document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{const r=rows[Number(b.dataset.delete)];if(!confirm(`Delete this ${c.label} record? This cannot be undone. Records connected to orders may not be deletable.`))return;try{if(Array.isArray(key)){ctx.showError('Composite-key deletion requires manual SQL review; use the individual Admin forms or SQL Editor.');return;}await remove(selected,r[key],key);await ctx.load();await renderPanel();}catch(x){ctx.showError(x);}});
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
function fieldInput(f,r){if(f.key==='subcategory_id'&&!refs.subcategories?.length)return '';const val=r?.[f.key], id='field_'+f.key;let raw='';const value=val??'';
 if(f.type==='bool')raw=`<label><input id="${id}" type="checkbox" ${value?'checked':''}> Enabled / Yes</label>`;
 else if(selected==='customer_profiles'&&f.key==='username')raw=`<input id="${id}" value="${e(value)}" readonly aria-readonly="true"><small>Username changes are managed under Accounts & Roles.</small>`;
 else if(f.type==='textarea')raw=`<textarea id="${id}" rows="4">${e(value)}</textarea>`;
 else if(f.type==='select')raw=`<select id="${id}">${f.options.map(x=>`<option value="${e(x)}" ${value===x?'selected':''}>${e(pretty(x))}</option>`).join('')}</select>`;
 else if(f.type==='ref'){const options=(refs[f.table]||[]).map(x=>`<option value="${e(String(x[f.key||'id']))}" ${value===x[f.key||'id']?'selected':''}>${e(titleFor(f.table,x))} (${e(String(x[f.key||'id']).slice(0,8))})</option>`).join('');raw=`<select id="${id}"><option value="">Choose…</option>${options}</select>`;}
 else if(f.type==='csv'||f.type==='uuids')raw=`<input id="${id}" value="${e(Array.isArray(value)?value.join(', '):value)}">`;
 else if(f.type==='image')raw=`<input id="${id}" value="${e(value)}" placeholder="Select a real photograph or upload your own" readonly>
 <label>Choose from verified, real photographs<select data-photo-library-for="${id}">
 <option value="">Keep current picture / choose below</option>
 ${BUILTIN_PHOTO_PRESETS.map((x,i)=>`<option value="${i}">${e(x.cat)} — ${e(x.name)}</option>`).join('')}
 </select></label>
 <input type="file" data-image-for="${id}" accept="image/jpeg,image/png,image/webp">
 <small id="${id}_license">All reference photographs must be labeled as examples; bakery-owned gallery photos are from prior bakes. Upload your own photograph to replace a reference.</small>
 <div class="preset-preview" id="${id}_preview"></div>`;
 else if(f.type==='datetime'){const v=value?new Date(value).toISOString().slice(0,16):'';raw=`<input id="${id}" type="datetime-local" value="${v}">`;}
 else if(f.type==='number'||f.type==='money')raw=`<input id="${id}" type="number" step="${f.type==='money'?'0.01':'any'}" value="${value===''?'':(f.type==='money'?Number(value)/100:value)}">`;
 else raw=`<input id="${id}" type="${f.type==='date'?'date':'text'}" value="${e(value)}">`;
 return `<div class="field"><label for="${id}">${e(f.label)}</label>${raw}</div>`;}
async function openEditor(record){const c=configs[selected];editing=record;
 const tables=[...new Set(c.fields.filter(f=>f.type==='ref').map(f=>f.table))];await Promise.all(tables.map(async t=>{refs[t]=await list(t,{limit:500}).catch(()=>[]);}));
 $('#editor-title').textContent=record?'Edit '+c.label:'Add '+c.label;
 $('#editor-fields').innerHTML=c.fields.map(f=>fieldInput(f,record)).join('');

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


 if(selected==='products' && refs.subcategories?.length){
  const category=$('#field_category_id'),subcat=$('#field_subcategory_id');
  if(category&&subcat){
    const filter=()=>{
      [...subcat.options].forEach(o=>{
       if(!o.value)return;
       const match=refs.subcategories.find(x=>x.id===o.value);
       o.hidden=!match||match.category_id!==category.value;
       o.disabled=o.hidden;
      });
      if(subcat.selectedOptions[0]?.disabled)subcat.value='';
    };
    category.addEventListener('change',filter);filter();
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

 const dialog=$('#editor');dialog.showModal();$('#close-editor').onclick=()=>dialog.close();
 $('#record-form').onsubmit=async event=>{event.preventDefault();try{const body={};for(const f of c.fields){if(selected==='customer_profiles'&&f.key==='username')continue;const el=$('#field_'+f.key);if(!el&&f.key==='subcategory_id')continue;let v=f.type==='bool'?el.checked:el.value;
 if(f.type==='image'){const inp=document.querySelector('[data-image-for="field_'+f.key+'"]');if(inp?.files?.[0]){const photo=await upload(selected==='past_bakes'?'past-bakes':'product-photos',inp.files[0]);v=photo.url;} }
 if(f.type==='money')v=v===''?null:Math.round(Number(v)*100);
 if(f.type==='number')v=v===''?null:Number(v);
 if(f.type==='csv'||f.type==='uuids')v=v.split(',').map(x=>x.trim()).filter(Boolean);
 if(f.type==='datetime')v=v?new Date(v).toISOString():null;
 if(['max_discount_cents','max_uses'].includes(f.key)&&v==='')v=null;
 if(f.type==='ref'&&!v)v=null;
 if(f.key==='code'&&!v)v=null;
 if(f.key==='published'&&selected==='products'&&v===true&&!$('#field_ingredients')?.value?.trim())throw Error('Add the actual ingredient list before publishing this product.');
 body[f.key]=v;

 }
 if(selected==='site_settings'&&body.pay_at_pickup_enabled&&
 (!body.pay_at_pickup_tax_reviewed||body.pay_at_pickup_tax_rate_bps===null))
 throw Error('Pay at Pickup is not yet available with automatic tax handling. Stripe Tax calculates Stripe payments only; cash collection needs its own verified tax calculation.');
 if(selected==='products'){
  const groups=MAJOR_ALLERGENS.filter(name=>[...document.querySelectorAll('.major-allergen')].some(input=>input.value===name&&input.checked));
  const reviewed=$('#allergen-reviewed')?.checked===true;
  body.major_allergens=groups;
  body.allergens=publicAllergenStatement(groups);
  body.allergen_reviewed=reviewed;
  if(body.published && !reviewed)throw Error('Review and confirm all nine major allergen groups before publishing.');
  if(body.published && !String(body.ingredients||'').trim())throw Error('Enter a complete ingredient list before publishing.');
 }
 const key=c.key||'id';if(c.single){await update(selected,1,body);}else if(record){if(Array.isArray(key))throw Error('Editing records with two-part keys requires deleting/recreating from SQL Editor.');await update(selected,record[key],body,key);}else await add(selected,body);
 dialog.close();await ctx.load();await renderPanel();}catch(x){ctx.showError(x);}};
}
async function reply(message){const text=prompt('Write your response. It will be saved to the secure account inbox. Email delivery is not enabled by this action:');if(!text)return;try{if(!message.customer_id)throw Error('Guest email replies require a configured email provider; do not mark as replied yet.');await add('messages',{customer_id:message.customer_id,customer_email:message.customer_email,order_id:message.order_id,kind:'reply',subject:'Re: '+message.subject,body:text,parent_id:message.id,is_staff_reply:true,status:'replied'});await update('messages',message.id,{status:'replied'});await renderPanel();}catch(x){ctx.showError(x);}}
async function reviewPhotos(review){try{const items=await list('review_photos',{review_id:'eq.'+review.id});const urls=[];for(const p of items)urls.push(await signedImage('review-photos',p.storage_path));const win=window.open('','_blank','noopener,noreferrer');if(win){win.document.write('<!doctype html><title>Review photos</title><body style="font-family:sans-serif">'+urls.map(u=>u?`<img alt="Customer review upload" style="max-width:90vw;max-height:65vh" src="${e(u)}">`:'').join('<hr>')+'</body>');win.document.close();}else alert('Allow popups to view review photos.');}catch(x){ctx.showError(x);}}
async function notices(){const notes=await list('notifications',{order:'created_at.desc',limit:150});$('#admin-main').innerHTML=`<div class="box"><h2>Alerts & Notifications</h2><p class="muted">Owner/admin notifications are created for paid orders, customer requests and reviews. Customer inbox notices are delivered when order status changes.</p>${notes.map(n=>`<article class="lineitem"><div><strong>${e(n.title)}</strong><p>${e(n.body)}</p></div><small>${fmt(n.created_at)}</small></article>`).join('')||'<p>No notifications currently available.</p>'}</div>`;}
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
 return selectedOrders;};let chosen=compute();$('#refresh-report').onclick=()=>{chosen=compute();};$('#export-csv').onclick=()=>{const lines=['order_id,date,payment_status,subtotal_cents,discount_cents,delivery_cents,tax_cents,total_cents',...chosen.map(o=>[o.id,o.created_at.slice(0,10),o.payment_status,o.subtotal_cents,o.discount_cents,o.delivery_cents,o.tax_cents,o.total_cents].join(','))];saveCsv('mamma-bees-orders.csv',lines.join('\r\n'));};}
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
