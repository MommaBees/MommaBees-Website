// Product Showcase display helpers: dates are calendar dates, never browser-local timestamps.
export const MONTH_SHORT=Object.freeze(['Jan.','Feb.','Mar.','Apr.','May','Jun.','Jul.','Aug.','Sep.','Oct.','Nov.','Dec.']);
export function formatShowcaseDate(value){
 if(typeof value!=='string')return null;
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
 if(!match)return null;
 const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
 const date=new Date(Date.UTC(year,month-1,day));
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
 return MONTH_SHORT[month-1]+' '+day+', '+year;
}
export const marketAveragePrice=item=>item?.price_kind==='market_average';
