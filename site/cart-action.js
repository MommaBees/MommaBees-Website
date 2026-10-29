// Compact storefront button state: Checkout only while the selected package count
// is exactly the quantity currently stored for this item and fulfillment method.
export function lineQuantity(cart,{mode,product_id,showcase_id,batch_id}){
 if(!Array.isArray(cart))return 0;
 return cart.filter(x=>mode==='showcase'?
  x.mode==='showcase'&&x.showcase_id===showcase_id:
  x.mode===mode&&x.product_id===product_id&&(x.batch_id||null)===(batch_id||null)
 ).reduce((n,x)=>n+(Number.isInteger(x.quantity)?x.quantity:0),0);
}
export function cartActionLabel(cart,selection,qty){
 return Number.isInteger(qty)&&qty>=1&&lineQuantity(cart,selection)===qty?'Checkout':'Add to Cart';
}
