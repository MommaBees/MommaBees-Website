import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {acceptedOrderNote,LEGAL_VERSION} from '../functions/_lib/order-legal.js';
import {cookiePreferences,permitsOptionalCookies,COOKIE_PREFERENCES_VERSION} from '../site/cookie-consent.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('the eight legal policies have public storefront routes and footer links',()=>{
 const app=read('site/app.js'),legal=read('site/legal-policies.js'),checkout=read('site/checkout-form.js');
 for(const slug of ['terms','privacy','cookies','pickup','delivery','refunds','property','food']){
  assert.match(legal,new RegExp("'"+slug+"'"));
  assert.ok(app.includes('#legal/'+slug),'missing footer link to '+slug);
 }
 assert.match(app,/if\(route==='legal'\)/);
 assert.match(app,/initCookiePreferences\(\)/);
 assert.match(checkout,/policy_acceptance/);
 assert.match(checkout,/checkout-fulfillment-policy/);
 assert.match(read('site/index.html'),/\/legal\.css/);
});
test('server rejects missing, stale, mismatched, or forged order-policy acceptance',()=>{
 assert.throws(()=>acceptedOrderNote({},'pickup'),/Review and accept/);
 assert.throws(()=>acceptedOrderNote({policy_acceptance:{accepted:true,version:'old',method:'pickup'}},'pickup'),/Review and accept/);
 assert.throws(()=>acceptedOrderNote({policy_acceptance:{accepted:true,version:LEGAL_VERSION,method:'delivery'}},'pickup'),/Review and accept/);
 assert.throws(()=>acceptedOrderNote({policy_acceptance:{accepted:'true',version:LEGAL_VERSION,method:'pickup'}},'pickup'),/Review and accept/);
 const note=acceptedOrderNote({note:'Delivery at front porch',policy_acceptance:{accepted:true,version:LEGAL_VERSION,method:'delivery'}},'delivery');
 assert.match(note,/Delivery at front porch/);
 assert.match(note,/Policies accepted: 2026-10-27-v1 \| delivery/);
 assert.match(note,/\d{4}-\d{2}-\d{2}T/);
 assert.ok(note.length<=1000);
});
test('server order handlers persist policy stamp in existing order note, without altering payment gates',()=>{
 assert.match(read('functions/api/checkout.js'),/p_note:acceptedOrderNote\(body,method\)/);
 assert.match(read('functions/api/pay-at-pickup.js'),/p_note:acceptedOrderNote\(data,'pickup'\)/);
 assert.match(read('functions/api/checkout.js'),/LIVE_PAYMENT_ALLOWED/);
 assert.match(read('functions/api/checkout.js'),/STRIPE_AUTOMATIC_TAX_ENABLED/);
});
test('optional cookie preferences default off and persist by choice/version',()=>{
 const values=new Map();
 globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 assert.deepEqual(cookiePreferences(),{necessary:true,analytics:false,marketing:false});
 assert.equal(permitsOptionalCookies('analytics'),false);
 assert.equal(permitsOptionalCookies('marketing'),false);
 values.set('mbee_cookie_consent_v1',JSON.stringify({version:COOKIE_PREFERENCES_VERSION,choices:{necessary:false,analytics:true,marketing:false}}));
 assert.deepEqual(cookiePreferences(),{necessary:true,analytics:true,marketing:false});
 assert.equal(permitsOptionalCookies('analytics'),true);
 assert.equal(permitsOptionalCookies('necessary'),false);
});
