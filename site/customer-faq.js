// Compact, customer-facing guidance. Binding legal terms live in legal-policies.js,
// not in site_settings.terms (a legacy administrative draft field).
const link=(slug,title)=>'<a href="#legal/'+slug+'">'+title+'</a>';
const faqs=Object.freeze([
 ['What is the difference between ready-to-sell and preorder items?',
  'Ready-to-sell items have already been prepared. Preorders are made for available future bakery dates. Availability and lead times are confirmed during ordering.'],
 ['When is an order confirmed?',
  'Choose an available fulfillment date and follow the checkout instructions. A special-order message, quote request, or unavailable-date inquiry is not an accepted order or a capacity reservation. Online payment status is confirmed separately.'],
 ['Where do I pick up an order?',
  'Follow the pickup location and time shown in your confirmed order instructions. Use designated customer access and parking areas only. Private residential, animal, storage, and production areas are not public pickup areas. See the '+link('pickup','Customer Pickup Policy')+'.'],
 ['Where does MommaBees deliver?',
  'Local delivery is offered only for the ZIP codes and time windows available at checkout. Applicable delivery charges are shown before you commit to pay. Please provide a correct address, a safe handoff location, and secure pets before arrival. See the '+link('delivery','Local Delivery Policy')+'.'],
 ['What happens if I miss pickup or delivery?',
  'Please '+ '<a href="#contact">contact MommaBees</a>'+' promptly. The available options depend on product safety, timing, and the circumstances. Perishable products may not be suitable to hold or redeliver. See '+link('refunds','Refunds & Cancellations')+'.'],
 ['Can I request a different date or custom order?',
  'Yes. Send a request through the contact page. We review production capacity, product suitability, lead time, price, and fulfillment before accepting a special order. Any proposed off-schedule fee must be disclosed and accepted before it is charged.'],
 ['Will my order look exactly like a photograph?',
  'Some product photos represent previous bakes or illustrative examples. Your order may vary. Only published products with confirmed availability can be purchased.'],
 ['How do I check ingredients, allergens, and storage instructions?',
  'Read the product details and labeling, and contact MommaBees about dietary concerns before ordering. Shared preparation spaces may present cross-contact risks. See '+link('food','Food Safety & Allergens')+'.'],
 ['Can customers visit animals or other parts of the property?',
  'Customers may use designated pickup and shopping areas only. Animal enclosures, residential spaces, and production or storage areas are restricted unless specifically authorized. See '+link('property','Property, Visitor & Animal Safety')+'.'],
 ['How can I cancel, request a refund, or report an incorrect order?',
  'Please contact us with your order reference and describe the issue. Whether a cancellation, correction, replacement, or refund is appropriate depends on the product, agreed order conditions, and applicable law. Read '+link('refunds','Refunds & Cancellations')+'.'],
 ['How does the website use personal information and cookies?',
  'See the '+link('privacy','Privacy Policy')+' and '+link('cookies','Cookie & Tracking Policy')+'. You may reopen optional cookie choices using Cookie Settings in the footer.']
]);
export function defaultFaqEntries(){return faqs.map(([question,answer],source_index)=>({source_index,question,answer}));}
export function faqPage(managed=null){
 const rows=Array.isArray(managed)?managed.map(row=>{
  const index=Number(row.source_index);
  return [row.question,row.answer===null&&Number.isInteger(index)&&faqs[index]?faqs[index][1]:
   String(row.answer||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])).replace(/\n/g,'<br>')];
 }):faqs;
 return '<section class="section customer-faq" aria-labelledby="faq-title">'+
  '<div class="customer-faq-heading"><h1 id="faq-title">Questions & Policies</h1><p>Find practical answers about ordering, pickup, delivery, and our farmstand.</p></div>'+
  '<div class="customer-faq-list">'+rows.map(([question,answer])=>
    '<details class="customer-faq-item"><summary>'+question+'</summary><div class="customer-faq-answer"><p>'+answer+'</p></div></details>').join('')+
  '</div><div class="customer-faq-legal"><div><h2>Complete legal and customer policies</h2><p>Read the full terms for orders, privacy, fulfillment, property access, and food safety.</p></div><a class="button secondary" href="#legal">View all policies</a></div>'+
 '</section>';
}
