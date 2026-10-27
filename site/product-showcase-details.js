// Shared product-showcase presentation rules. No source inventory/checkout mutation.
export const SHOWCASE_PRICE_UNITS=Object.freeze(['each','dozen','box','tray','bag','bunch','basket','pint','quart','pound','loaf','slice']);
export const showcaseEnabled=settings=>settings?.product_showcase_enabled!==false;
export const showcaseDescription=item=>String(item?.description||'').trim();
export function showcasePrice(item){
 const amount=Number(item?.price_cents);
 if(item?.price_cents===null||item?.price_cents===undefined||!Number.isInteger(amount)||amount<=0)return null;
 const unit=SHOWCASE_PRICE_UNITS.includes(item?.price_unit)?item.price_unit:null;
 return '$'+(amount/100).toFixed(2)+(unit?' / '+unit:'');
}
export const showcaseOrigin=item=>item?.department==='homestand'
 ?'Homegrown in Nixa, Missouri without chemical sprays.'
 :'Homemade in Nixa, Missouri.';
export const showcaseAvailability=item=>String(item?.availability_note||'').trim()||
 (item?.department==='homestand'?'Seasonal harvest. Please confirm current availability.':'Please confirm preparation dates and availability.');
export function showcaseFields(item){
 return [
  ['Price',showcasePrice(item)],
  ['Availability',showcaseAvailability(item)],
  ['Ingredients',item?.department==='bakery'?item?.ingredients:null],
  ['Allergens',item?.department==='bakery'?item?.allergens:null],
  ['Storage & handling',item?.storage_notes],
  ['Pickup & delivery',item?.fulfillment_note]
 ].filter(([,v])=>typeof v==='string'&&v.trim().length>0);
}
