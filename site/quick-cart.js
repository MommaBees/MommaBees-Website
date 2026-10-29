// Shared quantity limits for compact storefront Add-to-Cart controls.
// This is only a client preview; reserve_checkout verifies everything again server-side.
export function availableReadyBatches(product,batches,days,cart,today,now=new Date()){
 const dateToday=String(today);
 return (batches||[]).filter(b=>b.product_id===product?.id&&!b.disabled&&b.baked_on<=dateToday&&
   Number(b.quantity_available)>0&&
   (days||[]).some(d=>d.enabled&&new Date(d.cutoff_at)>now&&d.date>=dateToday&&d.date<=b.best_before))
  .map(b=>({...b,remaining:Math.max(0,Number(b.quantity_available)-
   (cart||[]).filter(i=>i.mode==='ready'&&i.batch_id===b.id).reduce((n,i)=>n+Number(i.quantity||0),0))}))
  .filter(b=>b.remaining>0)
  .sort((a,b)=>String(a.best_before).localeCompare(String(b.best_before))||String(a.id).localeCompare(String(b.id)));
}
export function validQuickQty(qty,max){
 return Number.isInteger(qty)&&qty>=1&&qty<=30&&qty<=max;
}
export function publicShowcaseSaleProduct(showcase,products,categoryFor,available){
 if(!showcase?.product_id)return null;
 const found=(products||[]).find(p=>p.id===showcase.product_id);
 if(!found||found.published!==true||found.department!==showcase.department||
    found.category_id!==showcase.category_id||!available(found))return null;
 // Never allow a malformed cross-department link to expose another product's sale action.
 return found;
}
