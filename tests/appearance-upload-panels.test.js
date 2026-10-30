import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {safeAppearance,colorContrast,applyAppearance,APPEARANCE_COLORS} from '../site/site-appearance.js';
import {harvestUploadMatches} from '../site/harvest-photo-import.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Existing design colors remain defaults when new columns are unset',()=>{
 const settings=safeAppearance({},'https://mommabees.supabase.co');
 assert.equal(settings.footer_background_color,'#948D87');
 assert.equal(settings.tab_selected_bg_color,'#66432b');
 assert.equal(settings.header_font_family,'');
 assert.equal(settings.header_background_image_url,'');
 assert.deepEqual(Object.keys(APPEARANCE_COLORS).length,10);
});
test('Appearance accepts only validated colors fonts and first-party background uploads',()=>{
 const base='https://ryqcfojzdncrshinlpue.supabase.co';
 const trusted=base+'/storage/v1/object/public/bakery-backgrounds/11111111-1111-4111-8111-111111111111.jpg';
 const values=safeAppearance({header_text_color:'red; background:url(javascript:alert(1))',
  header_font_family:'system-ui; color:red',header_background_image_url:'https://other.example/banner.webp',
  footer_background_image_url:trusted},base);
 assert.equal(values.header_text_color,APPEARANCE_COLORS.header_text_color);
 assert.equal(values.header_font_family,'');
 assert.equal(values.header_background_image_url,'');
 assert.equal(values.footer_background_image_url,trusted);
});
test('Contrast calculations identify unreadable button/text combinations',()=>{
 assert.ok(colorContrast('#111111','#ffffff')>=4.5);
 assert.ok(colorContrast('#eeeeee','#ffffff')<4.5);
 assert.equal(colorContrast('red','#ffffff'),0);
});
test('CSS properties follow persisted values without mutating other site settings',()=>{
 const writes=new Map(),removed=new Set();
 const target={style:{setProperty:(k,v)=>writes.set(k,v),removeProperty:k=>removed.add(k)}};
 const settings=applyAppearance({footer_background_color:'#234567',tab_selected_text_color:'#ffffff'},'',target);
 assert.equal(settings.footer_background_color,'#234567');
 assert.equal(writes.get('--mb-footer-background-color'),'#234567');
 assert.ok(removed.has('--mb-header-font'));
});
test('Admin uploads are tabbed; broken raw ternary and mandatory rights checkbox are absent',()=>{
 const admin=read('site/admin.js'),nav=read('site/admin-navigation.js');
 const upload=read('site/bulk-photo-uploads.js');
 assert.ok(nav.includes('bulk_photo_uploads'));
 assert.ok(upload.includes('data-upload-panel="harvest"'));
 assert.ok(upload.includes('data-upload-panel="past"'));
 assert.ok(!admin.includes('selected===\'past_bakes\'?"'));
 assert.ok(!admin.includes('harvest-photo-rights'));
 assert.ok(!upload.includes('harvest-photo-rights'));
});
test('Shop banners and category controls retain their business routes',()=>{
 const app=read('site/app.js'),css=read('site/country-home-v2.css');
 assert.ok(app.includes("const description=mode==='ready'?'':"));
 assert.ok(app.includes('mb-category-button'));
 assert.ok(css.includes('--mb-tab-selected-text-color'));
 assert.ok(css.includes('--mb-category-button-text-color'));
 assert.ok(css.includes('minmax(178px,22%)'));
 assert.ok(read('site/checkout-form.js').includes('Pickup or delivery date'));
});
test('Harvest photos still match only approved Homestand showcase slugs',()=>{
 const input=[{name:'broccoli.webp'},{name:'cherry-tomatoes.jpg'},{name:'zucchini.png'}];
 const showcase=[{slug:'broccoli',id:'one',department:'homestand'},{slug:'zucchini',id:'two',department:'homestand'}];
 const matched=harvestUploadMatches(input,showcase);
 assert.equal(matched.matched.length,2);
 assert.equal(matched.skipped.length,1);
});
