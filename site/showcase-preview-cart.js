// Showcase carts are test-only: they never create real products, orders, or payment requests.
export const showcasePreviewLimit=item=>Math.max(0,Math.min(100000,Math.floor(Number(item?.preview_quantity??30)||0)));
export const previewInCart=(cart,id)=>cart.filter(x=>x.mode==='showcase'&&x.showcase_id===id).reduce((n,x)=>n+x.quantity,0);
export const previewRemaining=(item,cart)=>Math.max(0,showcasePreviewLimit(item)-previewInCart(cart,item.id));
export const validPreviewQty=(item,cart,quantity)=>Number.isInteger(quantity)&&quantity>=1&&quantity<=30&&quantity<=previewRemaining(item,cart);
export const isShowcaseCartLine=x=>x?.mode==='showcase';
export const cartHasShowcase=cart=>cart.some(isShowcaseCartLine);
