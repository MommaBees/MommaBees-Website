// Owner-approved store showcase choices. Display only; checkout requires real products.
export const SHOWCASE_DEPARTMENTS=Object.freeze(['bakery','homestand']);
export const SHOWCASE_ICONS=Object.freeze({
 'banana-creme-pie':'🥧',
 'cinnamon-swirl-bread':'🍞',
 'dream-cookie-drommar':'🍪',
 'ginger-bread':'🍪',
 'green-beans':'🫛',
 'blackberries':'🫐'
});
export function showcaseItemsFor(items,department,categoryId=null,subcategoryId=null,limit=20){
 if(!SHOWCASE_DEPARTMENTS.includes(department))return [];
 return (Array.isArray(items)?items:[]).filter(item=>item.active!==false&&item.department===department&&
  (!categoryId||item.category_id===categoryId)&&(!subcategoryId||item.subcategory_id===subcategoryId))
  .sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0)||
    String(a.name||'').localeCompare(String(b.name||'')))
  .slice(0,Math.max(0,Math.min(limit,40)));
}
export const showcaseIcon=item=>SHOWCASE_ICONS[item.slug]||({bakery:'🥧',homestand:'🌿'}[item.department]||'');
