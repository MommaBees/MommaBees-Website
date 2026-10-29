import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {acceptedOrderNote,LEGAL_VERSION} from '../functions/_lib/order-legal.js';
import {cookiePreferences,permitsOptionalCookies,COOKIE_PREFERENCES_VERSION} from '../site/cookie-consent.js';
import {LEGAL_POLICY_EXTENSIONS} from '../site/legal-policy-extensions.js';
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
 assert.match(note,/Policies accepted: 2026-10-29-v3 \| delivery/);
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

test('all policy pages include expanded business, delivery, premises and food-safety coverage',()=>{
 assert.match(read('site/legal-policies.js'),/export const LEGAL_VERSION='2026-10-29-v3'/);
 assert.match(read('site/legal-policies.js'),/legalPolicySections\(slug\)\.map/);
 assert.equal(LEGAL_VERSION,'2026-10-29-v3');
 const required={
  terms:['Our business and service boundaries','Missouri online-sale restrictions','No general release of negligence'],
  privacy:['Order and delivery records','Visitor and incident reports','Data access and delivery personnel'],
  cookies:['Session boundaries and stored choices','When optional technology is actually used'],
  pickup:['Appointments, location, and permission to enter','Parking, vehicle movement and accessible handoff','Incidents on the property'],
  delivery:['Coverage, lawful product eligibility and final quotation','Safe routes and customer-controlled hazards','Unattended delivery and proof of handoff','Temperature control and transit','Injury, collisions and property damage'],
  refunds:['When the bakery cannot legally or safely fulfill','Custom orders, deposits and nonrefundable terms','Damage, short quantities and substitutions'],
  property:['Limited invitation to customers','Farm animals and biosecurity','Incident response and preservation','No recreational access or assumption of complete risk'],
  food:['Missouri cottage-food qualification','Food requiring refrigeration or other controls','Required product labeling','In-state online and direct-to-consumer rules','Farmstand produce and other goods']
 };
 for(const [slug,headings] of Object.entries(required)){
  const sections=LEGAL_POLICY_EXTENSIONS[slug],actual=sections.map(([name])=>name);
  assert.ok(sections.length>=headings.length,slug+' should include all new protections');
  for(const heading of headings){
   assert.ok(actual.includes(heading),slug+' missing '+heading);
   assert.match(read('site/legal-policies.js'),/legalPolicySections\(slug\)\.map/);
  }
  assert.ok(read('site/legal-policies.js').includes('2026-10-29-v3'));
 }
 const food=LEGAL_POLICY_EXTENSIONS.food.map(x=>x.join(' ')).join(' ');
 assert.match(food,/196\.298/);
 assert.match(food,/potentially hazardous/);
 assert.match(food,/both the producing operation and the purchaser/);
 const delivery=LEGAL_POLICY_EXTENSIONS.delivery.map(x=>x.join(' ')).join(' ');
 assert.match(delivery,/dog bites/);
 assert.match(delivery,/unattended/);
 assert.match(delivery,/unsafe|hazard/);
 assert.doesNotMatch(delivery,/waives all liability|assume all risk/i);
});
test('updated checkout terms are stamped server-side using the same current version',()=>{
 assert.throws(()=>acceptedOrderNote({policy_acceptance:{accepted:true,version:'2026-10-27-v1',method:'delivery'}},'delivery'),/Review and accept/);
 const note=acceptedOrderNote({policy_acceptance:{accepted:true,version:LEGAL_VERSION,method:'pickup'}},'pickup');
 assert.match(note,/2026-10-29-v3/);
});
