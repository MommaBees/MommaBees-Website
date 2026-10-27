// Curated royalty-free Unsplash stock photography for CATEGORY ART and STAFF SANDBOX ONLY.
// These are illustrative images, not Mamma Bee's Bakery merchandise or proof of baking.
// License (commercial use): https://unsplash.com/license
// Sources are fixed Unsplash CDN photo identifiers, not random keyword services.
const base='https://images.unsplash.com/';
export const STOCK_PHOTOGRAPHY=Object.freeze({
 cookies:{id:'photo-1499636136210-6f4ee915583e',label:'Chocolate chip cookies'},
 cakes:{id:'photo-1578985545062-69928b1d9587',label:'Decorated chocolate cake'},
 pies:{id:'photo-1464305795204-6f5bbfc7fb81',label:'Rustic pie'},
 cheesecakes:{id:'photo-1524351199678-941a58a3df50',label:'Cheesecake slice'},
 pastries:{id:'photo-1509365465985-25d11c17e812',label:'Cinnamon pastries'},
 brownies:{id:'photo-1606313564200-e75d5e30476c',label:'Chocolate brownie'},
 breads:{id:'photo-1509440159596-0249088772ff',label:'Rustic artisan bread'},
});
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
 const entry=STOCK_PHOTOGRAPHY[key];
 return {...entry,category:key,
   url:base+entry.id+'?auto=format&fit=crop&w=960&q=82',
   thumb:base+entry.id+'?auto=format&fit=crop&w=540&q=78',
   license:'Unsplash License',source:'https://unsplash.com/license',
   disclosure:'Stock photo — example only'
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
 'Chocolate Chip Cookies':'both',
 'Cinnamon Rolls':'ready',
 'Apple Pie':'preorder',
 'Carrot Cake':'preorder',
 'Classic Cheesecake':'preorder',
 'Brownie Box':'ready'
});
export const demoMatchesView=(product,mode='all')=>{
 if(mode==='all')return true;
 const type=DEMO_OFFER_TYPES[product.name]||'preorder';
 return type==='both'||type===mode;
};
