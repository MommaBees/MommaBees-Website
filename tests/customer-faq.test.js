import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {faqPage} from '../site/customer-faq.js';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('customer questions remain concise and separately linked from legal terms',()=>{
 const html=faqPage();
 assert.match(html,/<h1 id="faq-title">Questions & Policies<\/h1>/);
 assert.equal((html.match(/class="customer-faq-item"/g)||[]).length,11);
 for(const section of ['#legal/pickup','#legal/delivery','#legal/refunds','#legal/food','#legal/property','#legal/privacy','#legal/cookies','#legal']){
  assert.ok(html.includes(section),'FAQ does not link '+section);
 }
 assert.match(html,/not an accepted order or a capacity reservation/);
 assert.doesNotMatch(html,/SPECIAL-ORDER DATE REQUESTS AND FULFILLMENT/);
 assert.doesNotMatch(html,/site_settings|s\.terms/);
});
test('footer keeps two original shop link rows and separates policy directory',()=>{
 const app=source('site/app.js');
 const footer=app.slice(app.indexOf('<footer class="footer"'),app.indexOf('</footer>')+9);
 const nav=footer.slice(footer.indexOf('aria-label="Footer navigation"'),footer.indexOf('aria-label="Legal and customer policies"'));
 assert.equal((nav.match(/class="footer-nav-row"/g)||[]).length,2);
 assert.match(footer,/footer-legal-heading/);
 for(const name of ['Terms of Service','Privacy Policy','Cookie Policy','Pickup Policy','Delivery Policy','Refunds &amp; Cancellations','Cookie Settings']){
  assert.ok(footer.includes(name),'missing visible footer policy '+name);
 }
 assert.match(footer,/data-cookie-settings/);
 assert.match(source('site/legal.css'),/\.footer \.footer-legal-links/);
});
