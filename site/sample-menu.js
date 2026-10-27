// Display-only menu inspiration. No product IDs, inventory, prices, carts or payment actions.
// Live inventory and staff-only Stripe sandbox records remain authoritative and separate.
export const SAMPLE_MENU=Object.freeze([
 {name:'Chocolate Chip Cookies',category:'Cookies',subcategory:'Chocolate Chip',
  description:'Golden edges, soft middles and plenty of chocolate chips.',mode:'ready'},
 {name:'Cinnamon Rolls',category:'Pastries',subcategory:'Cinnamon Rolls',
  description:'Tender cinnamon swirls, finished with a generous drizzle of icing.',mode:'ready'},
 {name:'Brownie Box',category:'Bars & Brownies',subcategory:'Brownies',
  description:'Rich chocolate brownies for sharing around the table.',mode:'ready'},
 {name:'Apple Pie',category:'Pies',subcategory:'Apple Pies',
  description:'A golden lattice crust over a warmly spiced apple filling.',mode:'preorder'},
 {name:'Carrot Cake',category:'Cakes',subcategory:'Carrot Cakes',
  description:'Spiced carrot cake with a homestyle finish.',mode:'preorder'},
 {name:'Classic Cheesecake',category:'Cheesecakes',subcategory:'Specialty Cheesecakes',
  description:'A creamy cheesecake idea for gatherings and special occasions.',mode:'preorder'}
]);
export function samplesFor(mode='all',categoryName=null){
 return SAMPLE_MENU.filter(x=>(mode==='all'||x.mode===mode)&&(!categoryName||x.category===categoryName));
}
