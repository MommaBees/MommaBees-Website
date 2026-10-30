// Safe, limited appearance settings; no changes until Owner/Admin saves a setting.
import {verifiedBackgroundUrl} from './background.js';
export const FONT_FAMILIES=Object.freeze(['Trebuchet MS','Georgia','Arial','Verdana','Tahoma','Segoe UI']);
export const APPEARANCE_COLORS=Object.freeze({
 header_text_color:'#2e211d',header_background_color:'#fff9f0',
 footer_text_color:'#211b18',footer_background_color:'#948D87',
 category_button_bg_color:'#fff8ee',category_button_text_color:'#62452d',
 tab_selected_bg_color:'#66432b',tab_selected_text_color:'#ffffff',
 tab_unselected_bg_color:'#fff8ee',tab_unselected_text_color:'#62452d'
});
export const APPEARANCE_KEYS=Object.freeze([
 ...Object.keys(APPEARANCE_COLORS),'header_font_family','footer_font_family',
 'header_background_image_url','footer_background_image_url','category_cta_label'
]);
export const validHex=value=>typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value);
export function colorContrast(a,b){
 if(!validHex(a)||!validHex(b))return 0;
 const luminance=hex=>{
  const x=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);
  return x[0]*.2126+x[1]*.7152+x[2]*.0722;
 };
 const x=luminance(a),y=luminance(b);
 return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
export function safeAppearance(settings={},supabaseUrl=''){
 const result={};
 for(const [key,defaultValue] of Object.entries(APPEARANCE_COLORS)){
  result[key]=validHex(settings[key])?settings[key]:defaultValue;
 }
 for(const part of ['header','footer']){
  const font=settings[part+'_font_family'];
  result[part+'_font_family']=FONT_FAMILIES.includes(font)?font:'';
  result[part+'_background_image_url']=verifiedBackgroundUrl(settings[part+'_background_image_url'],supabaseUrl);
 }
 result.category_cta_label=typeof settings.category_cta_label==='string'&&settings.category_cta_label.length<=48?settings.category_cta_label.trim():'';
 return result;
}
export function applyAppearance(settings={},supabaseUrl='',element=document.documentElement){
 const values=safeAppearance(settings,supabaseUrl);
 for(const [key,color] of Object.entries(APPEARANCE_COLORS)){
  element.style.setProperty('--mb-'+key.replaceAll('_','-'),values[key]);
 }
 for(const part of ['header','footer']){
  const font=values[part+'_font_family'];
  if(font)element.style.setProperty('--mb-'+part+'-font',JSON.stringify(font)+',sans-serif');
  else element.style.removeProperty('--mb-'+part+'-font');
  const url=values[part+'_background_image_url'];
  element.style.setProperty('--mb-'+part+'-background-photo',url?'url('+JSON.stringify(url)+')':'none');
 }
 return values;
}
