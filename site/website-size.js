// Sitewide layout sizing is independent from the homepage carousel size.
export const WEBSITE_SIZE_OPTIONS=Object.freeze(['extra-small','small','medium','large']);
export const DEFAULT_WEBSITE_SIZE='medium';
export function normalizeWebsiteSize(size){
 return WEBSITE_SIZE_OPTIONS.includes(size)?size:DEFAULT_WEBSITE_SIZE;
}
export function applyWebsiteSize(size,target=document.body){
 const normalized=normalizeWebsiteSize(size);
 target.dataset.websiteSize=normalized;
 return normalized;
}
