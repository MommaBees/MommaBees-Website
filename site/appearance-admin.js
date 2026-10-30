// Admin-owned site appearance editor; changes only the approved site_settings columns.
import {config,list,update,upload,escapeHtml as e} from './api.js';
import {APPEARANCE_COLORS,FONT_FAMILIES,APPEARANCE_KEYS,colorContrast,applyAppearance,validHex} from './site-appearance.js';
const colorGroups=[
 ['Header', [['header_background_color','Background color'],['header_text_color','Text color']]],
 ['Footer', [['footer_background_color','Background color'],['footer_text_color','Text color']]],
 ['Category Button', [['category_button_bg_color','Category button background'],['category_button_text_color','Category button text']]],
 ['Selected Tab', [['tab_selected_bg_color','Selected tab background'],['tab_selected_text_color','Selected tab text']]],
 ['Unselected Tab', [['tab_unselected_bg_color','Unselected tab background'],['tab_unselected_text_color','Unselected tab text']]]
];
const fontOptions=['Default font',...FONT_FAMILIES];
const photoName=part=>part==='header'?'Header':'Footer';
export async function showAppearanceEditor({showError}){
 const root=document.querySelector('#admin-main');
 if(!root)return;
 root.innerHTML='<section class="box"><h2>Header, Footer &amp; Buttons</h2><p>Loading current design settings…</p></section>';
 try{
  const records=await list('site_settings',{id:'eq.1',limit:1});
  const settings=records[0];
  if(!settings)throw Error('Website settings could not be read');
  const colors=colorGroups.map(([title,fields])=>'<fieldset class="appearance-group"><legend>'+e(title)+'</legend>'+
   '<div class="appearance-color-pair">'+fields.map(([key,label])=>
   '<label>'+e(label)+'<input type="color" data-appearance-color="'+e(key)+'" value="'+e(validHex(settings[key])?settings[key]:APPEARANCE_COLORS[key])+'"></label>'
   ).join('')+'</div></fieldset>').join('');
  const fonts=['header','footer'].map(part=>
   '<label class="field">'+photoName(part)+' font family<select data-appearance-font="'+part+'">'+
   fontOptions.map((v,i)=>'<option value="'+e(i===0?'':v)+'"'+((settings[part+'_font_family']||'')===(i===0?'':v)?' selected':'')+'>'+e(v)+'</option>').join('')+
   '</select></label>').join('');
  const photos=['header','footer'].map(part=>
   '<div class="field"><label for="'+part+'-appearance-photo">'+photoName(part)+' background image (optional)</label>'+
   '<input id="'+part+'-appearance-photo" type="file" accept="image/jpeg,image/png,image/webp" data-appearance-photo="'+part+'">'+
   '<p class="small">JPG, PNG, or WebP, up to 5 MB. No background photo is required.</p>'+
   '<label><input type="checkbox" data-clear-appearance-photo="'+part+'"> Remove currently selected '+part+' image</label></div>').join('');
  root.innerHTML='<section class="box appearance-workbench"><h2>Header, Footer &amp; Buttons</h2>'+
   '<p>Adjust the text and background colors, background photographs, font families, and storefront tab colors. Settings remain unchanged until you save. Existing website appearance is the default.</p>'+
   '<form id="site-appearance-form"><div class="appearance-groups">'+colors+'</div>'+
   '<div class="appearance-settings-secondary"><fieldset><legend>Font families</legend>'+fonts+'</fieldset>'+
   '<fieldset><legend>Header and footer photography</legend>'+photos+'</fieldset></div>'+
   '<label class="field">Category card button text<input id="appearance-category-label" type="text" maxlength="48" value="'+e(settings.category_cta_label||'View Category')+'"></label>'+
   '<div class="appearance-preview"><h3>Preview</h3><div id="appearance-header-preview">Header and navigation text</div>'+
   '<div id="appearance-category-preview">Category: Browse Products</div>'+
   '<div id="appearance-tabs-preview"><span id="appearance-tab-selected">Selected tab</span><span id="appearance-tab-idle">Unselected tab</span></div>'+
   '<div id="appearance-footer-preview">Footer and policy links</div></div>'+
   '<p id="appearance-contrast" role="status" aria-live="polite"></p>'+
   '<div class="actions"><button type="submit" class="button" id="appearance-save">Save appearance</button>'+
   '<button type="button" class="button secondary" id="appearance-reset">Restore original design defaults</button></div>'+
   '<p id="appearance-status" role="status" aria-live="polite"></p></form></section>';
  const form=root.querySelector('#site-appearance-form');
  const getColor=key=>root.querySelector('[data-appearance-color="'+key+'"]').value;
  const evaluate=()=>{
   const pairs=[
    ['header','Header',getColor('header_background_color'),getColor('header_text_color')],
    ['footer','Footer',getColor('footer_background_color'),getColor('footer_text_color')],
    ['category','Category button',getColor('category_button_bg_color'),getColor('category_button_text_color')],
    ['selected','Selected tab',getColor('tab_selected_bg_color'),getColor('tab_selected_text_color')],
    ['idle','Unselected tab',getColor('tab_unselected_bg_color'),getColor('tab_unselected_text_color')]
   ];
   root.querySelector('#appearance-header-preview').style.cssText='background:'+pairs[0][2]+';color:'+pairs[0][3]+';';
   root.querySelector('#appearance-footer-preview').style.cssText='background:'+pairs[1][2]+';color:'+pairs[1][3]+';';
   root.querySelector('#appearance-category-preview').style.cssText='background:'+pairs[2][2]+';color:'+pairs[2][3]+';';
   root.querySelector('#appearance-tab-selected').style.cssText='background:'+pairs[3][2]+';color:'+pairs[3][3]+';';
   root.querySelector('#appearance-tab-idle').style.cssText='background:'+pairs[4][2]+';color:'+pairs[4][3]+';';
   const failures=pairs.filter(([,label,bg,fg])=>colorContrast(bg,fg)<4.5).map(([,label])=>label);
   root.querySelector('#appearance-contrast').textContent=failures.length?
    'Text contrast needs improvement for: '+failures.join(', ')+'. The colors must remain readable.':
    'All displayed text/background color pairs meet at least 4.5:1 contrast.';
   return failures;
  };
  root.querySelectorAll('[data-appearance-color]').forEach(input=>input.addEventListener('input',evaluate));
  evaluate();
  form.onsubmit=async event=>{
   event.preventDefault();
   if(evaluate().length){root.querySelector('#appearance-status').textContent='Improve the listed text contrasts before saving.';return;}
   const button=root.querySelector('#appearance-save');button.disabled=true;
   const payload={};
   for(const key of Object.keys(APPEARANCE_COLORS))payload[key]=getColor(key);
   for(const part of ['header','footer']){
    const chosen=root.querySelector('[data-appearance-font="'+part+'"]').value;
    if(chosen&&!FONT_FAMILIES.includes(chosen))throw Error('Unsupported font');
    payload[part+'_font_family']=chosen||null;
    payload[part+'_background_image_url']=settings[part+'_background_image_url']||null;
    if(root.querySelector('[data-clear-appearance-photo="'+part+'"]').checked)payload[part+'_background_image_url']=null;
   }
   const label=root.querySelector('#appearance-category-label').value.trim();
   if(label.length<1||label.length>48){button.disabled=false;root.querySelector('#appearance-status').textContent='Category button text must be 1 to 48 characters.';return;}
   payload.category_cta_label=label;
   try{
    for(const part of ['header','footer']){
     const file=root.querySelector('[data-appearance-photo="'+part+'"]').files?.[0];
     if(!file)continue;
     const result=await upload('bakery-backgrounds',file);
     if(!result?.url)throw Error('Storage did not return a photo URL');
     payload[part+'_background_image_url']=result.url;
    }
    await update('site_settings',1,payload);
    applyAppearance(payload,config.supabaseUrl);
    root.querySelector('#appearance-status').textContent='Saved. The header, footer and storefront buttons now use your selected appearance.';
   }catch(error){showError(error);}
   finally{button.disabled=false;}
  };
  root.querySelector('#appearance-reset').onclick=async()=>{
   if(!window.confirm('Restore the original header, footer, category and tab styling? The rest of the site stays unchanged.'))return;
   const values=Object.fromEntries(APPEARANCE_KEYS.map(key=>[key,null]));
   try{
    await update('site_settings',1,values);applyAppearance({},config.supabaseUrl);
    await showAppearanceEditor({showError});
   }catch(error){showError(error);}
  };
 }catch(error){root.innerHTML='<section class="box"><h2>Header, Footer &amp; Buttons</h2><p>Appearance settings are unavailable. Nothing was changed.</p></section>';showError(error);}
}
