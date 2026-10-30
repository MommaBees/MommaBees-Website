// Momma's Overview Hub: readable, dependency-free SVG charts from actual bakery records.
// No synthetic sales and no changes to any transactional data.
import {list,money,escapeHtml as e,currentSession} from './api.js';

const SERIES_COLORS=['#946038','#bd8457','#6e8675','#8a7471','#c9a260','#627780','#a17055'];
const SOURCE_TABLES=['orders','order_items','expenses','products','stock_batches','baking_days','messages','reviews','notifications','promotions','customer_profiles','site_settings'];
const NUMBER_FORMAT=new Intl.NumberFormat('en-US');
const MONTH_FORMAT=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',month:'short',year:'numeric'});
const DATE_PARTS=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'});
const asNumber=value=>Number.isFinite(Number(value))?Number(value):0;
const sum=(rows,fn)=>rows.reduce((total,row)=>total+asNumber(fn(row)),0);
const safeCount=number=>NUMBER_FORMAT.format(number);
const centerDate=stamp=>{
 const date=new Date(stamp);
 if(!Number.isFinite(date.valueOf()))return '';
 const p=Object.fromEntries(DATE_PARTS.formatToParts(date).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return p.year+'-'+p.month+'-'+p.day;
};
const sourceRows=(data,key)=>Array.isArray(data[key])?data[key]:[];
const available=(errors,...tables)=>tables.every(key=>!errors.includes(key));
const numberMarkup=(number,ok=true)=>ok?safeCount(number):'Unavailable';
const amountMarkup=(cents,ok=true)=>ok?money(cents):'Unavailable';
const periodCutoff=(period,now)=>{
 if(period==='all')return 0;
 return now.getTime()-Number(period)*86400000;
};
const inPeriod=(record,key,cutoff)=>{
 if(!cutoff)return true;
 const value=record[key];
 if(!value)return false;
 const time=new Date(key==='purchased_on'&&String(value).length===10?value+'T12:00:00Z':value).getTime();
 return Number.isFinite(time)&&time>=cutoff;
};
function metric(label,value,annotation){
 return '<div class="hub-metric"><span class="hub-metric-label">'+e(label)+'</span><strong>'+value+'</strong>'+
  (annotation?'<small>'+e(annotation)+'</small>':'')+'</div>';
}
function simpleDateLabel(key){
 const d=new Date(key+'-15T12:00:00Z');
 return MONTH_FORMAT.format(d);
}
export function revenueSeries(orders,now=new Date()){
 const p=Object.fromEntries(DATE_PARTS.formatToParts(now).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 const keys=Array.from({length:6},(_,i)=>{
  const d=new Date(Date.UTC(Number(p.year),Number(p.month)-1-5+i,15,12));
  return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0');
 });
 const amounts=new Map(keys.map(k=>[k,0]));
 for(const order of orders){
  if(order.payment_status!=='paid')continue;
  const month=centerDate(order.created_at).slice(0,7);
  if(amounts.has(month))amounts.set(month,amounts.get(month)+asNumber(order.total_cents)-asNumber(order.tax_cents));
 }
 return keys.map(key=>({label:simpleDateLabel(key),value:amounts.get(key)}));
}
export function hubDataModel(data,errors=[],period='30',now=new Date()){
 const cutoff=periodCutoff(period,now);
 const orders=sourceRows(data,'orders').filter(x=>inPeriod(x,'created_at',cutoff));
 const paid=orders.filter(o=>o.payment_status==='paid');
 const expenses=sourceRows(data,'expenses').filter(x=>inPeriod(x,'purchased_on',cutoff));
 const sales=sum(paid,o=>asNumber(o.total_cents)-asNumber(o.tax_cents));
 const costs=sum(expenses,x=>x.amount_cents);
 const paidIds=new Set(paid.map(x=>x.id));
 const paidItems=sourceRows(data,'order_items').filter(i=>paidIds.has(i.order_id));
 const products=sourceRows(data,'products');
 const productMap=new Map(products.map(p=>[p.id,p]));
 const departmentRevenue=new Map();
 const top=new Map();
 for(const item of paidItems){
  const product=productMap.get(item.product_id);
  const category=product?.department==='bakery'?'Bakery':product?.department==='homestand'?'Homestand':'Other / unclassified';
  const gross=asNumber(item.quantity)*asNumber(item.unit_price_cents);
  departmentRevenue.set(category,(departmentRevenue.get(category)||0)+gross);
  const name=String(product?.name||item.product_name||'Unnamed product');
  const prev=top.get(name)||{name,quantity:0,gross:0};
  prev.quantity+=asNumber(item.quantity);
  prev.gross+=gross;top.set(name,prev);
 }
 const expenseMix=new Map();
 for(const x of expenses){
  const category=String(x.category||'Other');
  expenseMix.set(category,(expenseMix.get(category)||0)+asNumber(x.amount_cents));
 }
 const orderStates=['new','confirmed','baking','ready','completed','cancelled'].map(status=>({
  label:status.charAt(0).toUpperCase()+status.slice(1),value:orders.filter(x=>x.status===status).length
 }));
 const alerts={
  pending:sourceRows(data,'orders').filter(o=>o.payment_status==='paid'&&o.status==='new').length,
  messages:sourceRows(data,'messages').filter(x=>!['replied','closed'].includes(x.status)&&!x.is_staff_reply).length,
  reviews:sourceRows(data,'reviews').filter(x=>x.approved!==true).length,
  notices:sourceRows(data,'notifications').filter(x=>!x.read_at).length
 };
 const today=centerDate(now),nowMs=now.getTime();
 const batches=sourceRows(data,'stock_batches').filter(x=>x.disabled===false&&asNumber(x.quantity_available)>0&&(!x.best_before||x.best_before>=today));
 const days=sourceRows(data,'baking_days').filter(x=>x.enabled===true&&new Date(x.cutoff_at).getTime()>nowMs);
 return {
  period,orders,paid,paidItems,sales,costs,average:paid.length?Math.round(sales/paid.length):0,
  units:sum(paidItems,x=>x.quantity),
  published:products.filter(x=>x.published===true).length,
  customers:sourceRows(data,'customer_profiles').length,
  readyBatches:batches.length,
  readyPackages:sum(batches,x=>x.quantity_available),
  upcomingDates:days.length,
  activePromotions:sourceRows(data,'promotions').filter(x=>x.published===true).length,
  checkoutEnabled:sourceRows(data,'site_settings')[0]?.checkout_enabled===true,
  alerts,
  departmentMix:[...departmentRevenue].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value),
  expenseMix:[...expenseMix].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value),
  topProducts:[...top.values()].sort((a,b)=>b.quantity-a.quantity||b.gross-a.gross).slice(0,5),
  states:orderStates,revenueTrend:revenueSeries(sourceRows(data,'orders'),now),
  errors,
  capped:SOURCE_TABLES.filter(k=>sourceRows(data,k).length>=5000)
 };
}
function revenueBars(rows,ok){
 if(!ok)return '<div class="hub-empty">Revenue records could not be loaded.</div>';
 if(!rows.some(x=>x.value!==0))return '<div class="hub-empty">No paid sales recorded in the last six calendar months.</div>';
 const width=660,height=260,left=64,right=18,top=23,bottom=46,area=height-top-bottom;
 const max=Math.max(1,...rows.map(x=>Math.max(0,x.value)));
 const usable=width-left-right,step=usable/rows.length,barWidth=Math.min(64,step*.56);
 let svg='<svg class="hub-revenue-chart" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Recorded paid sales excluding tax over the last six calendar months">';
 for(let i=0;i<=4;i++){
  const y=top+area*i/4;
  svg+='<line x1="'+left+'" y1="'+y+'" x2="'+(width-right)+'" y2="'+y+'" class="hub-chart-grid"/>';
  svg+='<text x="'+(left-9)+'" y="'+(y+4)+'" text-anchor="end" class="hub-axis-value">'+e(money(Math.round(max*(1-i/4))))+'</text>';
 }
 rows.forEach((r,i)=>{
  const x=left+i*step+(step-barWidth)/2;
  const h=Math.max(0,r.value/max*area);
  const y=top+area-h;
  svg+='<rect class="hub-bar" x="'+x.toFixed(2)+'" y="'+y.toFixed(2)+'" width="'+barWidth.toFixed(2)+'" height="'+h.toFixed(2)+'" rx="4">'+
   '<title>'+e(r.label+': '+money(r.value))+'</title></rect>';
  svg+='<text class="hub-axis-label" x="'+(left+i*step+step/2).toFixed(2)+'" y="'+(height-17)+'" text-anchor="middle">'+e(r.label)+'</text>';
 });
 return svg+'</svg>';
}
function pieChart(rows,format,description,ok){
 if(!ok)return '<div class="hub-empty">This data is temporarily unavailable.</div>';
 const selected=rows.filter(x=>x.value>0);
 const total=sum(selected,x=>x.value);
 if(total<=0)return '<div class="hub-empty">No recorded data for this chart in the selected period.</div>';
 const cx=92,cy=92,r=72;
 let current=-Math.PI/2,paths='';
 selected.forEach((entry,i)=>{
  const part=entry.value/total,angle=2*Math.PI*part,next=current+angle;
  const color=SERIES_COLORS[i%SERIES_COLORS.length];
  if(part>=.999999){
   paths+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+color+'"><title>'+e(entry.label+': '+format(entry.value))+'</title></circle>';
  }else{
   const x1=cx+r*Math.cos(current),y1=cy+r*Math.sin(current);
   const x2=cx+r*Math.cos(next),y2=cy+r*Math.sin(next);
   paths+='<path fill="'+color+'" d="M '+cx+' '+cy+' L '+x1.toFixed(3)+' '+y1.toFixed(3)+' A '+r+' '+r+' 0 '+(part>.5?1:0)+' 1 '+x2.toFixed(3)+' '+y2.toFixed(3)+' Z"><title>'+e(entry.label+': '+format(entry.value))+'</title></path>';
  }current=next;
 });
 const legend=selected.map((entry,i)=>{
  const pct=(entry.value*100/total).toFixed(1)+'%';
  return '<li><span class="hub-key" style="background:'+SERIES_COLORS[i%SERIES_COLORS.length]+'"></span>'+
   '<span class="hub-legend-name">'+e(entry.label)+'</span><strong>'+e(format(entry.value))+'</strong><small>'+e(pct)+'</small></li>';
 }).join('');
 return '<div class="hub-pie-layout"><svg class="hub-pie-svg" viewBox="0 0 184 184" role="img" aria-label="'+e(description)+'">'+paths+'</svg><ul class="hub-chart-legend">'+legend+'</ul></div>';
}
function stageBars(rows,ok){
 if(!ok)return '<div class="hub-empty">Orders could not be loaded.</div>';
 if(!rows.some(x=>x.value))return '<div class="hub-empty">No orders recorded for the selected period.</div>';
 const max=Math.max(1,...rows.map(x=>x.value));
 return '<div class="hub-stages">'+rows.map(row=>
  '<div class="hub-stage"><span>'+e(row.label)+'</span>'+
  '<div class="hub-stage-track"><div class="hub-stage-fill" style="width:'+(row.value/max*100).toFixed(1)+'%"></div></div>'+
  '<strong>'+safeCount(row.value)+'</strong></div>'
 ).join('')+'</div>';
}
const heading=(title,description)=>'<div class="hub-panel-heading"><h3>'+e(title)+'</h3><p>'+e(description)+'</p></div>';
function attentionLine(label,value,moduleName,ok){
 return '<button type="button" class="hub-queue" data-hub-module="'+e(moduleName)+'"><span>'+e(label)+'</span>'+
  '<strong>'+numberMarkup(value,ok)+'</strong></button>';
}
function paint(root,data,errors,period,showError){
 const m=hubDataModel(data,errors,period);
 const orderOK=available(errors,'orders');
 const expenseOK=available(errors,'expenses');
 const itemsOK=available(errors,'orders','order_items');
 const productsOK=available(errors,'products');
 const allSalesOK=available(errors,'orders','order_items','products');
 const periodLabels={30:'Last 30 days',90:'Last 90 days',365:'Last 365 days',all:'All loaded records'};
 root.innerHTML='<section class="hub-wrap"><div class="hub-heading"><div><p class="hub-eyebrow">Business intelligence · Farmstand & Bakery</p>'+
  '<h2>Momma’s Overview Hub</h2><p>Operational activity and recorded financial figures. All amounts are drawn from actual website records.</p></div>'+
  '<div class="hub-heading-actions"><label for="hub-period">Reporting period</label><select id="hub-period">'+
  Object.entries(periodLabels).map(([key,label])=>'<option value="'+key+'"'+(key===period?' selected':'')+'>'+e(label)+'</option>').join('')+
  '</select><button type="button" class="button secondary" id="hub-refresh">Refresh data</button></div></div>'+
  (errors.length?'<p class="hub-warning" role="status">Some records are unavailable: '+e(errors.join(', '))+'. Unavailable totals are not shown as zero.</p>':'')+
  (m.capped.length?'<p class="hub-warning" role="status">At least one data source reached the 5,000-record display limit ('+e(m.capped.join(', '))+'). Totals may be incomplete; use formal reports for reconciliation.</p>':'')+
  '<div class="hub-metrics">'+
  metric('Paid orders',numberMarkup(m.paid.length,orderOK),periodLabels[period])+
  metric('Sales excluding tax',amountMarkup(m.sales,orderOK),'Recorded paid orders; refunds not netted')+
  metric('Recorded expenses',amountMarkup(m.costs,expenseOK),'Entries within reporting period')+
  metric('Unadjusted difference',amountMarkup(m.sales-m.costs,orderOK&&expenseOK),'Not net profit or final cost of goods')+
  metric('Average paid order',amountMarkup(m.average,orderOK),'Sales excluding tax ÷ paid orders')+
  metric('Packages sold',numberMarkup(m.units,itemsOK),'Paid-order line quantities')+
  metric('Published products',numberMarkup(m.published,productsOK),'Current catalog')+
  metric('Customer accounts',numberMarkup(m.customers,available(errors,'customer_profiles')),'Registered profiles')+'</div>'+
  '<div class="hub-chart-grid-layout">'+
  '<article class="hub-panel hub-wide">'+heading('Revenue trend · six months','Paid-order totals excluding recorded tax; refunds not netted. This trend covers six calendar months regardless of the reporting-period filter.')+revenueBars(m.revenueTrend,orderOK)+'</article>'+
  '<article class="hub-panel">'+heading('Sales by department','Gross product-line amounts before coupons, delivery and refunds; for paid orders in the selected period.')+
  pieChart(m.departmentMix,money,'Gross line sales by department',allSalesOK)+'</article>'+
  '<article class="hub-panel">'+heading('Recorded expense mix','Expense ledger entries by category in the selected period.')+
  pieChart(m.expenseMix,money,'Recorded expense categories',expenseOK)+'</article>'+
  '<article class="hub-panel hub-wide">'+heading('Order fulfillment pipeline','Recorded order counts by current fulfillment status in the selected period.')+stageBars(m.states,orderOK)+'</article></div>'+
  '<div class="hub-operations">'+
  '<article class="hub-panel">'+heading('Attention needed','Select a row to open the corresponding Admin module.')+
  '<div class="hub-queues">'+
  attentionLine('Paid orders awaiting confirmation',m.alerts.pending,'orders',orderOK)+
  attentionLine('Customer messages still open',m.alerts.messages,'messages',available(errors,'messages'))+
  attentionLine('Reviews awaiting approval',m.alerts.reviews,'reviews',available(errors,'reviews'))+
  attentionLine('Unread notices',m.alerts.notices,'notifications',available(errors,'notifications'))+'</div>'+
  '<button class="button secondary hub-release" type="button" id="release-pending">Release expired checkout reservations</button></article>'+
  '<article class="hub-panel">'+heading('Store and production','Current catalog, inventory and scheduling activity.')+
  '<div class="hub-operations-list">'+
  '<div><span>Website checkout setting</span><strong>'+ (available(errors,'site_settings')?(m.checkoutEnabled?'ON':'OFF'):'Unavailable')+'</strong></div>'+
  '<div><span>Eligible ready-stock batches</span><strong>'+numberMarkup(m.readyBatches,available(errors,'stock_batches'))+'</strong></div>'+
  '<div><span>Available packages in eligible batches</span><strong>'+numberMarkup(m.readyPackages,available(errors,'stock_batches'))+'</strong></div>'+
  '<div><span>Upcoming enabled fulfillment dates</span><strong>'+numberMarkup(m.upcomingDates,available(errors,'baking_days'))+'</strong></div>'+
  '<div><span>Published promotions</span><strong>'+numberMarkup(m.activePromotions,available(errors,'promotions'))+'</strong></div></div>'+
  '<p class="hub-quicklinks"><button type="button" data-hub-module="products">Products</button>'+
  '<button type="button" data-hub-module="baking_days">Calendar</button>'+
  '<button type="button" data-hub-module="stock_batches">Inventory</button>'+
  '<button type="button" data-hub-module="reports">Financial reports</button></p></article>'+
  '</div><article class="hub-panel hub-top-products">'+heading('Best-selling products','Packages in paid orders, ranked by quantity. Gross line amounts are before coupons and refunds.')+
  (!allSalesOK?'<p class="hub-empty">Product sales records are not available.</p>':
   !m.topProducts.length?'<p class="hub-empty">No product sales have been recorded for the selected period.</p>':
  '<div class="table-wrap"><table><thead><tr><th>Product</th><th>Packages</th><th>Gross line sales</th></tr></thead><tbody>'+
  m.topProducts.map(item=>'<tr><td>'+e(item.name)+'</td><td>'+safeCount(item.quantity)+'</td><td>'+money(item.gross)+'</td></tr>').join('')+
  '</tbody></table></div>')+'</article>'+
  '<p class="hub-disclaimer">Management overview only. Payment refunds, processor fees, labor, ingredients, delivery costs, inventory allocations and tax remittances may be incomplete. Figures are not certified revenue, profit or a tax statement. Checkout status here reflects the website database switch, not independent Stripe LIVE authorization.</p></section>';
 root.querySelector('#hub-period').onchange=event=>paint(root,data,errors,event.target.value,showError);
 root.querySelector('#hub-refresh').onclick=()=>renderOverviewHub({showError});
 root.querySelectorAll('[data-hub-module]').forEach(button=>button.onclick=()=>{
  const moduleId=button.dataset.hubModule;
  const nav=document.querySelector('.admin-nav-link[data-panel="'+moduleId+'"]');
  if(nav)nav.click();
 });
 const release=root.querySelector('#release-pending');
 release.onclick=async()=>{
  if(!window.confirm('Release checkout reservations that have passed their 30-minute expiry? Do not run while webhook delivery is failing.'))return;
  try{
   const token=currentSession()?.access_token;
   if(!token)throw Error('Owner/Admin session has expired.');
   const result=await fetch('/api/reconcile',{method:'POST',headers:{Authorization:'Bearer '+token}});
   const payload=await result.json().catch(()=>({}));
   if(!result.ok)throw Error(payload.error||'Release was not completed.');
   window.alert('Released '+safeCount(asNumber(payload.released))+' expired reservations.');
   await renderOverviewHub({showError});
  }catch(error){showError(error);}
 };
}
// Read up to five stable pages; do not silently mistake a provider's 1,000-row page cap for complete history.
async function readOverviewTable(table){
 const limit=table==='site_settings'?1:1000;
 const max=table==='site_settings'?1:5000;
 const rows=[];
 for(let offset=0;offset<max;offset+=limit){
  const result=await list(table,{limit,offset,order:table==='baking_days'?'date.asc':'id.asc'});
  if(!Array.isArray(result))throw Error('Incomplete '+table+' response');
  rows.push(...result);
  if(result.length<limit)break;
 }
 return rows;
}
export async function renderOverviewHub({showError}){
 const root=document.querySelector('#admin-main');
 if(!root)return;
 root.innerHTML='<section class="hub-wrap"><h2>Momma’s Overview Hub</h2><p>Loading current business records…</p></section>';
 const result=await Promise.allSettled(SOURCE_TABLES.map(table=>readOverviewTable(table)));
 const data={},errors=[];
 result.forEach((entry,i)=>{
  const key=SOURCE_TABLES[i];
  if(entry.status==='fulfilled'&&Array.isArray(entry.value))data[key]=entry.value;
  else{errors.push(key);data[key]=[];}
 });
 paint(root,data,errors,'30',showError);
}
