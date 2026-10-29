// Shared backend terms acceptance validation and order-level audit stamp.
// Date/time is set on the server, never accepted from a browser timestamp.
export const LEGAL_VERSION='2026-10-29-v2';
export function acceptedOrderNote(body,method,maxLength=1000){
 const consent=body?.policy_acceptance;
 if(consent?.accepted!==true||consent.version!==LEGAL_VERSION||consent.method!==method||
    !['pickup','delivery'].includes(method)){
  const error=new Error('Review and accept the current Terms of Service, fulfillment policy and Refund & Cancellation Policy.');
  error.status=400;throw error;
 }
 const timestamp=new Date().toISOString();
 const stamp='[Policies accepted: '+LEGAL_VERSION+' | '+method+' | '+timestamp+' UTC server record]';
 const note=String(body?.note||'').trim();
 return (note.slice(0,Math.max(0,maxLength-stamp.length-2))+(note?'\n':'')+stamp).slice(0,maxLength);
}
