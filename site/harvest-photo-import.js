// 2027 Homestand harvest photo naming: no watermarked third-party artwork.
export const HARVEST_PHOTO_SLUGS=Object.freeze([
 'broccoli','cauliflower','green-beans','jalapenos','mini-green-peppers',
 'salad-cucumbers','spineless-okra','tomatoes','yellow-summer-squash','zucchini'
]);
export function harvestSlugFromFile(filename){
 const normalized=String(filename||'').toLowerCase()
  .replace(/\.(jpe?g|png|webp)$/i,'').replace(/-card$/,'')
  .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
 if(normalized==='cherry-tomatoes')return null; // watermark licensing review
 return HARVEST_PHOTO_SLUGS.includes(normalized)?normalized:null;
}
export function harvestUploadMatches(files,items){
 const bySlug=new Map((items||[]).filter(x=>x.department==='homestand').map(x=>[x.slug,x]));
 const matched=[],skipped=[],seen=new Set();
 for(const file of files){
  const slug=harvestSlugFromFile(file.name);
  const match=slug&&bySlug.get(slug);
  if(!match||seen.has(slug)){skipped.push(file.name);continue;}
  seen.add(slug);matched.push({file,slug,item:match});
 }
 return {matched,skipped};
}
