// Asset contains ten original user-supplied harvest photographs; no stock images.
export const HARVEST_SPRITE_PATH='/assets/harvest-2027-sprite.webp';
const slugs=['broccoli','cauliflower','green-beans','jalapenos','mini-green-peppers','salad-cucumbers','spineless-okra','tomatoes','yellow-summer-squash','zucchini'];
export function harvestCrop(url){
 if(!url)return null;
 try{
  const p=new URL(url,'https://mommabees-website.pages.dev');
  if(p.pathname!==HARVEST_SPRITE_PATH||p.origin!=='https://mommabees-website.pages.dev')return null;
  const index=slugs.indexOf(p.hash.slice(1));
  if(index<0)return null;
  return {slug:slugs[index],x:(index%5)*25,y:index<5?0:100};
 }catch{return null}
}
export function harvestCropStyles(info){
 return '--harvest-x:'+info.x+'%;--harvest-y:'+info.y+'%';
}
