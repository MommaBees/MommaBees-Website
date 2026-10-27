// Public-facing rustic country farmhouse background controls.
// Database RLS authorizes edits; these helpers defend the CSS sink from unsafe URLs.
export const BACKGROUND_OPTIONS=Object.freeze([
 {value:'prairie_doors',label:'Weathered Wooden Barn Doors'},
 {value:'barnwood',label:'Weathered Barnwood Planks'},
 {value:'linen',label:'Country Linen and Gingham'},
 {value:'solid',label:'Warm Country Cream'},
 {value:'photo',label:'My Uploaded Background Photo'}
]);
export const backgroundChoice=value=>
 BACKGROUND_OPTIONS.some(x=>x.value===value)?value:'prairie_doors';
export function verifiedBackgroundUrl(value,supabaseUrl){
 if(!value||!supabaseUrl)return '';
 try{
  const origin=new URL(supabaseUrl);
  const candidate=new URL(String(value));
  if(origin.protocol!=='https:'||candidate.origin!==origin.origin)return '';
  if(!/^\/storage\/v1\/object\/public\/bakery-backgrounds\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(candidate.pathname))return '';
  if(candidate.search||candidate.hash)return '';
  return candidate.href;
 }catch{return '';}
}
export function applyBakeryBackground(settings={},supabaseUrl='',target=document.body){
 const enabled=settings.background_enabled!==false;
 let choice=enabled?backgroundChoice(settings.background_style):'solid';
 const safe=verifiedBackgroundUrl(settings.background_image_url,supabaseUrl);
 if(choice==='photo'&&!safe)choice='prairie_doors';
 const pct=Number(settings.background_overlay_percent);
 const overlay=Math.max(30,Math.min(95,Number.isFinite(pct)?pct:76));
 const solid=/^#[0-9a-f]{6}$/i.test(settings.background_solid_color||'')
  ?settings.background_solid_color:'#f8efdf';
 const position=['center','top','bottom','left','right'].includes(settings.background_position)
  ?settings.background_position:'center';
 target.dataset.siteBackground=choice;
 target.style.setProperty('--bakery-bg-image',safe?'url('+JSON.stringify(safe)+')':'none');
 target.style.setProperty('--bakery-bg-overlay',String(overlay/100));
 target.style.setProperty('--bakery-bg-solid',solid);
 target.style.setProperty('--bakery-bg-position',position);
 return choice;
}
