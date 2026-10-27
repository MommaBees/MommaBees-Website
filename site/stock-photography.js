// Mamma Bee's Bakery — local, optimized concept photos (generated specifically for shop layout).
// All files belong to this repo under /site/assets/demo; no external stock-photo dependency.
// These are *illustrations*, not photographs of actual offered/inventory items.
const ASSET_ROOT='/assets/demo/';
const imagery=Object.freeze({
 cookies:{file:'chocolate-chip-cookies.webp',label:'Chocolate chip cookies'},
 cakes:{file:'strawberry-cake.webp',label:'Strawberry crunch cake'},
 pies:{file:'apple-pie.webp',label:'Golden apple pie'},
 cheesecakes:{file:'caramel-pecan-cheesecake.webp',label:'Caramel pecan cheesecake'},
 pastries:{file:'cinnamon-rolls.webp',label:'Fresh cinnamon rolls'},
 brownies:{file:'brownie-box.webp',label:'Homestyle brownies'},
 breads:{file:'cinnamon-rolls.webp',label:'Sweet rolls'}
});
export const STOCK_PHOTOGRAPHY=imagery;
const keyFor=(category='')=>{
 const name=String(category).toLowerCase();
 if(name.includes('brownie')||name.includes('bar'))return 'brownies';
 if(name.includes('cheesecake'))return 'cheesecakes';
 if(name.includes('cookie'))return 'cookies';
 if(name.includes('cake'))return 'cakes';
 if(name.includes('pie'))return 'pies';
 if(name.includes('bread')||name.includes('loaf'))return 'breads';
 if(name.includes('pastr')||name.includes('roll')||name.includes('danish'))return 'pastries';
 return 'cookies';
};
export const stockPhotoFor=(category,variation='')=>{
 const key=keyFor(category);
 const entry=imagery[key];
 return {...entry,category:key,
   url:ASSET_ROOT+entry.file,thumb:ASSET_ROOT+entry.file,
   license:'Bakery-commissioned illustrative concept artwork',
   source:'local asset',disclosure:'Sample image — not an actual bakery product'
 };
};
export const sandboxProductPhoto=(product)=>{
 const key=({
  'Chocolate Chip Cookies':'cookies','Cinnamon Rolls':'pastries','Apple Pie':'pies',
  'Carrot Cake':'cakes','Classic Cheesecake':'cheesecakes','Brownie Box':'brownies'
 })[product.name]||keyFor(product.category);
 return stockPhotoFor(key);
};
export const DEMO_OFFER_TYPES=Object.freeze({
 'Chocolate Chip Cookies':'ready',
 'Cinnamon Rolls':'ready',
 'Brownie Box':'ready',
 'Apple Pie':'preorder',
 'Carrot Cake':'preorder',
 'Classic Cheesecake':'preorder'
});
export const demoMatchesView=(product,mode='all')=>{
 if(mode==='all')return true;
 return DEMO_OFFER_TYPES[product.name]===mode;
};
