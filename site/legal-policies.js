// MommaBees customer-facing legal notice registry. Version 1 owner-directed drafting baseline.
// These notices describe operational rules; they do not waive nonwaivable statutory rights.
import {escapeHtml as escape} from './api.js';
import {LEGAL_POLICY_EXTENSIONS} from './legal-policy-extensions.js';
export const LEGAL_VERSION='2026-10-29-v2';
export const LEGAL_UPDATED='October 29, 2026';
export const LEGAL_PAGES=Object.freeze([
 ['terms','Terms of Service'],
 ['privacy','Privacy Policy'],
 ['cookies','Cookie & Tracking Policy'],
 ['pickup','Customer Pickup Policy'],
 ['delivery','Local Delivery Policy'],
 ['refunds','Refunds & Cancellations'],
 ['property','Property, Visitor & Animal Safety'],
 ['food','Food Safety & Allergens']
]);
const link=(slug,label)=>'<a href="#legal/'+slug+'">'+escape(label)+'</a>';
const contact=()=>'<a href="#contact">contact the bakery</a>';
const sections={
 terms:()=>[
  ['Our agreement','These terms apply to browsing this website, creating an account, communicating with the bakery, and placing orders. The bakery operates under the MommaBee Bakery & Farmstand brand in Missouri. Customers should review the product listing, total charges, fulfillment arrangements, and related policies before ordering. If an order is not accepted or payment is not confirmed, no completed sale should be assumed.'],
  ['Orders and payments','Availability, prices, product descriptions, pickup or delivery windows, taxes, and applicable fees are shown as configured during checkout and remain subject to accurate confirmation. Submitting a special-order inquiry does not reserve a date or create an accepted order. Payment is processed through the checkout options actually offered. Do not send payment-card details through messages.'],
  ['Accounts and communications','Provide accurate account and order information, protect account credentials, and use the site lawfully. Operational communications about orders and security may be necessary for fulfillment; optional marketing requires the applicable permission and provides an opt-out mechanism.'],
  ['Product and fulfillment terms','Product-specific ingredients and allergen information, preparation requirements, pickup/delivery terms, and refund terms are part of the transaction information. The bakery may decline unsafe or unavailable requests and will provide the legally required remedy for any unfulfilled or improperly fulfilled paid order.'],
  ['Visitors and conduct','Customers must follow designated access, parking, and animal-safety directions. These rules are intended to reduce hazards; they do not substitute for reasonable care or waive liability that law does not permit us to disclaim.'],
  ['Site content and third parties','Original site text, photos, and brand materials may be protected by intellectual-property law. Third-party payment, verification, hosting, and authentication services may be subject to their own terms and privacy practices.'],
  ['Liability and legal rights','To the extent permitted by applicable law, neither party is responsible for losses that are too remote or not legally attributable to its acts or omissions. Nothing in these terms releases liability for personal injury, negligence, unsafe food, fraud, or other conduct where a waiver would be invalid, or limits nonwaivable consumer rights. Any enforceable limitation or dispute provision must be applied under governing law.'],
  ['Changes and questions','Policies may be amended prospectively. The policy version applicable when an order is accepted governs that transaction unless a lawful later agreement states otherwise. For questions, '+contact()+'.']
 ],
 privacy:()=>[
  ['Information we collect','Depending on your interactions, we may receive your name, username, email, telephone number, delivery and billing addresses, account identifiers, products ordered, order history, messages, product reviews, uploaded photos, and requested order details. Technical information may include device/browser data, IP address, security events, and session records. We should not need your full payment-card number in our own site records.'],
  ['How information is used','We use information to provide accounts, verify identity, respond to requests, process orders and refunds, fulfill pickup/delivery, keep transaction records, detect fraud, improve accessibility and reliability, and satisfy legal duties. Optional marketing is separate from necessary transactional communications.'],
  ['Service providers and disclosures','The site uses Cloudflare for hosting/security services, Supabase for database and authentication functionality, and Stripe for supported payment services. Service providers may handle data necessary to perform those functions. We may also disclose information to authorized delivery personnel, professional advisers, insurers, or authorities where reasonably necessary or legally required. Provider roles and live integrations must be rechecked when services change.'],
  ['Data storage and retention','Records are retained for legitimate operational, accounting, safety, legal, and dispute needs and should then be deleted or de-identified where appropriate. Authentication data, records of customer agreements, and legally required transaction records may have different retention periods. No fixed deletion deadline is promised here.'],
  ['Choices and requests','You may update available account details and marketing preferences through your account, or '+contact()+' to request access, correction, or deletion. Requests may be subject to identity verification, applicable law, and necessary record retention.'],
  ['Cookies and tracking','Please see our '+link('cookies','Cookie & Tracking Policy')+' for necessary session technology, browser storage, optional preferences, and how to change them.'],
  ['Children','This general-audience storefront is not directed to children under 13. Adults should submit purchase and delivery information for their households. Contact us if you believe a child submitted personal information without appropriate permission.'],
  ['Security and updates','We use operational safeguards appropriate to an online store but cannot guarantee that any internet system is risk-free. We may update this notice as our actual practices and applicable legal requirements change. For privacy inquiries, '+contact()+'.']
 ],
 cookies:()=>[
  ['What cookies and browser storage do','Cookies and related browser storage may keep you signed in, retain your cart during a visit, support human-verification and security controls, and remember your preferences. Some storage is maintained by your browser; some cookies or technical records may come from service providers.'],
  ['Strictly necessary','Essential functionality may include authentication/session tokens, security checks, order/cart state, and the consent preference itself. These are not disabled by the optional-choice controls because the site may not function properly without them.'],
  ['Optional analytics','If analytics tools are enabled in the future, they may measure site usage and performance. Optional analytics must be activated only after the visitor chooses that category where consent is required. No optional analytics script is installed by the cookie-preference module alone.'],
  ['Optional marketing','If advertising pixels or behavioral marketing technologies are installed in the future, they must respect the marketing preference and applicable law. Choosing not to enable optional marketing does not prevent ordinary order communications.'],
  ['Third-party services','Payment processing, anti-bot verification, and hosting providers may use technology necessary for their services when you interact with them. Their use of cookies and other records can be subject to separate provider notices. Embedded scripts and hosting-level analytics should be reviewed whenever deployed.'],
  ['Your choices','Cookie Settings provides Necessary (always on), optional analytics, optional marketing, or both optional categories. Accept saves your selection across visits. Reject disables optional categories for the current browsing session. You can change this selection later. Your browser can also block or delete cookies and website storage, though that may sign you out or remove a cart.'],
  ['Policy changes','This notice should be reviewed if new analytics, advertising, third-party embeds, or consent laws become applicable. Please see our '+link('privacy','Privacy Policy')+' and '+contact()+' for questions.']
 ],
 pickup:()=>[
  ['Pickup eligibility','Pickup is offered only when enabled for a product, date, and confirmed time window. The order confirmation identifies the applicable pickup instructions and location; unconfirmed requests are not reservations.'],
  ['Customer access','Please use the designated parking, pedestrian, and handoff areas only. Homes, family areas, animals, storage rooms, equipment, kitchens, and other restricted property are not open to customers unless specifically authorized. Follow posted access restrictions and reasonable staff directions.'],
  ['Vehicles and children','Drive cautiously, watch for pedestrians, and supervise children and dependents. Never leave an unattended vehicle or block access. If a location appears unsafe, contact the bakery before approaching.'],
  ['Safe handoff','Bring the order reference and collect within the confirmed window. Staff may use a different safe handoff location or reschedule during severe weather or when an access hazard exists. Food should be transported and stored promptly according to product instructions.'],
  ['Missed pickup','If you cannot attend, '+contact()+' as soon as practical. Perishable orders cannot always be held, remade, or resold safely. Whether a refund or alternate collection is available depends on the product, timing, circumstances, and '+link('refunds','Refunds & Cancellations')+'.'],
  ['Injury or property damage','Report an incident promptly, obtain emergency help if necessary, and preserve the relevant facts and photographs when safe. Responsibility for injury or damage is determined under applicable law; signage or this policy does not remove duties imposed by law. See '+link('property','Property, Visitor & Animal Safety')+'.']
 ],
 delivery:()=>[
  ['Availability and charges','Local delivery is offered only in eligible service areas and available date/time windows. The applicable delivery charge and address must be confirmed before payment. Quoted times are delivery windows, not an unconditional guarantee of an exact arrival.'],
  ['Correct address and access','Provide an accurate address, reachable contact information, and practical delivery instructions. Keep gates, approaches, stairs, and walking surfaces reasonably clear and accessible. If an access route is hazardous, delivery personnel may pause the attempt and arrange a safer handoff.'],
  ['Animals and safety','Secure dogs and other animals before arrival and keep them away from the driver and handoff location. Staff do not need to enter homes, animal enclosures, or unsafe private areas. Customers must not direct drivers to perform unsafe tasks.'],
  ['Recipient and unattended delivery','A recipient or authorized handoff method should be available during the confirmed window. Unattended delivery is not available unless expressly offered and accepted for that product/order, and may be prohibited for temperature-sensitive foods. Do not assume food will be left outside.'],
  ['Failed delivery','If delivery cannot safely be completed because of an incorrect address, absent recipient, inaccessible location, uncontrolled animals, or weather, the bakery will contact you when practicable about a reasonable next step. Additional charges, refund eligibility, and rescheduling depend on the stated order terms and applicable law; no undisclosed automatic penalty is imposed.'],
  ['Damaged, wrong, or missing orders','Notify the bakery promptly with the order reference and a description of the issue. The bakery will investigate delivery records and provide the remedy required by law or the applicable refund policy. The presence of a delivery photograph does not conclusively establish the legal transfer of responsibility.'],
  ['Injury or property damage','If a driver or customer is injured or property is damaged, seek appropriate assistance and notify the bakery. Responsibility is determined under applicable law and insurance terms; this policy is not an automatic release or indemnity agreement.']
 ],
 refunds:()=>[
  ['Product-specific cancellation terms','Bakery items may be perishable or made to order. Any product-specific deadline, deposit treatment, customization approval, or cancellation charge must be disclosed before you commit to purchase. If no special condition was presented, the bakery will evaluate the request based on the order and applicable law rather than invent a retroactive deadline.'],
  ['Incorrect, unsafe, or unfulfilled products','Contact the bakery if your order is incorrect, defective, unsafe, damaged on arrival, or not provided as agreed. The bakery will investigate and offer the remedy required by applicable law, which may include replacement, correction, or refund.'],
  ['Customer-requested cancellations','Contact the bakery promptly with the order number. Availability of a refund, store credit, or rescheduling depends on whether production has begun, customization and perishability, the agreed order-specific terms, and applicable consumer protections.'],
  ['Missed pickup and failed delivery','See '+link('pickup','Customer Pickup Policy')+' and '+link('delivery','Local Delivery Policy')+'. We will consider product handling, circumstances, fault, documented communications, and applicable law before determining any charge or refund.'],
  ['Payment reversals','Approved online refunds ordinarily return through the original payment provider, subject to that provider’s processing time. Pay-at-pickup adjustments are handled according to the actual payment method. Do not publish an exact refund processing deadline without operational verification.'],
  ['How to request help','Use '+contact()+' and include the order reference, product, date, and relevant photographs if appropriate. Do not send payment-card numbers or sensitive medical records.']
 ],
 property:()=>[
  ['Customer areas only','Visits are limited to designated retail, parking, and pickup areas during confirmed service periods. Residential spaces, animal pens, fields, barns, storage areas, kitchens, tools, and equipment are private or restricted unless explicitly opened by staff.'],
  ['Potential outdoor hazards','Outdoor surroundings can include uneven ground, gravel, wet or icy surfaces, changes in elevation, tree limbs, merchandise displays, weather hazards, and moving vehicles. Follow signs and instructions, and report hazards rather than walking through them. We remain responsible for care required by applicable law.'],
  ['Animals','Do not feed, pet, approach, release, or enter an enclosure containing animals unless specifically supervised and authorized. Children must be supervised. The bakery may end access when an animal or other condition presents a hazard. Animal contact is not an included customer activity merely because the business has a farmstand identity.'],
  ['Respect for property','Do not enter locked or marked areas, tamper with signs/fencing/equipment, or damage other people’s property. Alleged damage will be documented and assessed under applicable law rather than automatically charged to a payment method.'],
  ['Weather and emergencies','Pickup or visitation may be temporarily suspended when unsafe conditions arise. Obey temporary closures and staff instructions. In an emergency, call local emergency services first.'],
  ['Not a waiver','This notice explains expected conduct and foreseeable hazards; it is not a liability release, does not automatically shift responsibility for injuries to visitors, and does not replace maintenance, safety, or insurance requirements.']
 ],
 food:()=>[
  ['Ingredients and allergens','Review product-specific information and ask questions before ordering. Major U.S. food allergens are milk, egg, fish, crustacean shellfish, tree nuts, peanuts, wheat, soy, and sesame. An allergen statement on this website does not replace legally required package labeling.'],
  ['Cross-contact','Shared equipment, utensils, storage, or preparation areas may create cross-contact risks unless a verified control process supports a specific claim. Do not assume any item is free of an allergen because it is not listed as an ingredient.'],
  ['Safe handling','Follow any product-specific refrigeration, storage, transportation, and use-by directions supplied with the order. The bakery should use safe production, packaging, temperature control, and appropriate disposal practices.'],
  ['Regulatory classification','Qualifying Missouri cottage-food products and other food products may have different permit, labeling, preparation, and delivery rules. The bakery must verify the rules that apply to each product and operating method before sale.'],
  ['Concerns and recalls','If you suspect contamination, mislabeling, or illness, do not consume the product. Seek medical assistance when appropriate and '+contact()+' promptly with the order details. A reported safety issue will be reviewed under the bakery’s food-safety and recall procedures.']
 ]
};
// Keep established customer terms and add detailed operational requirements before the closing section.
export const legalPolicySections=slug=>{
 const base=sections[slug]?.();
 if(!base)return [];
 const detail=LEGAL_POLICY_EXTENSIONS[slug]||[];
 return [...base.slice(0,-1),...detail,base[base.length-1]];
};
export function legalIndexPage(){
 return '<section class="section legal-page"><div class="eyebrow">MommaBees · Legal & Policies</div><h1>Legal & Customer Policies</h1><p>Review the rules governing website use, ordering, fulfillment, and visits to the farmstand.</p><div class="legal-grid">'+LEGAL_PAGES.map(([slug,title])=>'<a class="box legal-tile" href="#legal/'+slug+'"><strong>'+escape(title)+'</strong><span>Read policy</span></a>').join('')+'</div><p class="small">Policy revision '+escape(LEGAL_VERSION)+'. For questions, '+contact()+'.</p></section>';
}
export function legalPage(slug,settings={}){
 if(!sections[slug])return legalIndexPage();
 const title=LEGAL_PAGES.find(x=>x[0]===slug)[1];
 const email=String(settings.email||'').trim();
 const emailBlock=email?'<p class="small">Business contact: <a href="mailto:'+escape(email)+'">'+escape(email)+'</a></p>':'';
 return '<article class="section legal-page"><nav class="legal-back"><a href="#legal">All legal policies</a></nav><h1>'+escape(title)+'</h1>'+
 '<p class="small legal-revision">Last revised: '+escape(LEGAL_UPDATED)+' · Version '+escape(LEGAL_VERSION)+'</p>'+
 legalPolicySections(slug).map(([heading,body])=>'<section class="legal-section"><h2>'+escape(heading)+'</h2><p>'+body+'</p></section>').join('')+
 (slug==='cookies'?'<button type="button" class="button secondary" data-cookie-settings>Manage cookie preferences</button>':'')+
 emailBlock+'<p class="small legal-related">Related: '+LEGAL_PAGES.filter(x=>x[0]!==slug).map(x=>link(x[0],x[1])).join(' · ')+'</p></article>';
}
