// Shared Product Showcase display helpers — never authorize checkout.
import {formatShowcaseDate} from './showcase-date.js';
export const SHOWCASE_PRICE_UNITS=Object.freeze(['each','single','half-dozen','dozen','box','tray','bag','bunch','basket','pint','quart','pound','loaf','slice']);
export const showcaseEnabled=settings=>settings?.product_showcase_enabled!==false;
export const showcaseDescription=item=>String(item?.description||'').trim();
export function showcasePrice(item){
 const amount=Number(item?.price_cents);
 if(item?.price_cents===null||item?.price_cents===undefined||!Number.isInteger(amount)||amount<=0)return null;
 const unit=SHOWCASE_PRICE_UNITS.includes(item?.price_unit)?item.price_unit:null;
 return (item?.price_kind==='market_average'?'Avg. ':'')+'$'+(amount/100).toFixed(2)+(unit?' / '+unit:'');
}
export const showcaseOrigin=item=>item?.department==='homestand'
 ?'Homegrown in Nixa, Missouri without chemical sprays.'
 :'Homemade in Nixa, Missouri.';
export const showcaseAvailability=item=>formatShowcaseDate(item?.availability_date);
export function showcaseFields(item){
 const raw=Number(item?.variety_count);
 const varieties=item?.variety_count!==null&&item?.variety_count!==undefined&&Number.isInteger(raw)&&raw>=0?String(raw):null;
 return [
  ['Price',showcasePrice(item)],
  ['Availability',showcaseAvailability(item)],
  ['Selling unit',item?.price_unit||null],
  ['Number of varieties',varieties],
  ['Ingredients',item?.ingredients],
  ['Allergens',item?.allergens],
  ['Storage & handling',item?.storage_notes],
  ['Pickup & delivery',item?.fulfillment_note]
 ].filter(([,value])=>typeof value==='string'&&value.trim().length>0);
}
