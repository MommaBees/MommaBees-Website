// Show actual owner-provided product photos on the existing home carousel.
import {harvestCrop} from './harvest-sprite.js';
import {showcaseEnabled} from './product-showcase-details.js';
export function catalogCarouselSlides({settings={},products=[],showcase=[],categories=[]}={}){
 const dept=new Map(categories.map(x=>[x.id,x.department]));
 const enabled=d=>settings['home_carousel_'+d+'_items']!==false;
 const make=(item,d,i)=>({
  id:'catalog-'+d+'-'+item.id,title:item.name,
  eyebrow:d==='bakery'?'Bakery':'Homestand',description:'',
  image_url:item.photo_url,image_alt:item.name,published:true,
  sort_order:1000+(d==='bakery'?0:100)+i*10,
  primary_label:'Shop '+(d==='bakery'?'Bakery':'Homestand'),primary_href:'#shop/'+d,
  secondary_label:'',secondary_href:''
 });
 const live=products.filter(x=>x.published===true&&x.photo_url)
  .map(x=>({...x,department:dept.get(x.category_id)||x.department}));
 return ['bakery','homestand'].flatMap(d=>{
  if(!enabled(d))return [];
  const found=new Set();
  return [...live,...(showcaseEnabled(settings)?showcase:[]).filter(x=>x.active!==false)].filter(x=>x.department===d&&x.photo_url&&!harvestCrop(x.photo_url))
   .filter(x=>{const k=x.variety_id||String(x.name).toLowerCase();if(found.has(k))return false;found.add(k);return true})
   .slice(0,3).map((x,i)=>make(x,d,i));
 });
}
