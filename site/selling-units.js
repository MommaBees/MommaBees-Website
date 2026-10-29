// Customer-facing selling-unit labels. A cart quantity always counts packages, not individual pieces.
export const SELLING_UNITS=Object.freeze([
 ['single','Single (1 item)'],['half-dozen','Half-Dozen (6 items)'],['dozen','Dozen (12 items)'],
 ['each','Each (legacy single)'],['tray','Tray'],['box','Box'],['slice','Slice'],
 ['bag','Bag'],['bunch','Bunch'],['basket','Basket'],['pint','Pint'],
 ['quart','Quart'],['pound','Pound'],['loaf','Loaf']
]);
const names=Object.fromEntries(SELLING_UNITS);
export function sellingUnitLabel(unit){
 return unit==='each'?'Single':unit==='single'?'Single':unit==='half-dozen'?'Half-Dozen':unit==='dozen'?'Dozen':names[unit]||String(unit||'Each');
}
export function itemCountPerUnit(unit){return unit==='half-dozen'?6:unit==='dozen'?12:unit==='single'||unit==='each'?1:null;}
export function validCartQuantity(qty){return Number.isInteger(qty)&&qty>=1&&qty<=30;}
export function availablePackages(batch,alreadyInCart=0){return Math.max(0,Math.min(30,Number(batch?.quantity_available||0)-alreadyInCart));}
export function packageTotal(priceCents,quantity){return Number(priceCents||0)*Number(quantity||0);}
