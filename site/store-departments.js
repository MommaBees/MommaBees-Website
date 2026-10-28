// MBB-CATALOG-038: shared department and classification logic.
export const STORE_DEPARTMENTS=Object.freeze(['bakery','homestand']);
export function departmentForCategory(category){
 return STORE_DEPARTMENTS.includes(category?.department)?category.department:'bakery';
}
export function normalizeDepartment(department){
 return STORE_DEPARTMENTS.includes(department)?department:'bakery';
}
export const departmentLabel=value=>value==='homestand'?'Homestand':'Bakery';
export function effectiveDepartment(settings,department,category){
 if(settings?.split_store_enabled!==true)return null;
 return category?departmentForCategory(category):normalizeDepartment(department);
}
export function filterStoreProducts(products,settings,department,categories){
 if(settings?.split_store_enabled!==true)return products;
 const d=normalizeDepartment(department);
 return products.filter(p=>departmentForCategory(categories.find(c=>c.id===p.category_id))===d);
}
export function taxonomyPaths(categories,subcategories,varieties){
 const byCategory=new Map(categories.map(c=>[c.id,c]));
 const bySubcategory=new Map(subcategories.map(c=>[c.id,c]));
 return varieties.filter(v=>v.active!==false).flatMap(v=>{
  const category=byCategory.get(v.category_id),subcategory=v.subcategory_id?bySubcategory.get(v.subcategory_id):null;
  if(!category||(v.subcategory_id&&!subcategory))return [];
  const department=departmentForCategory(category);
  return [{id:v.id,department,categoryId:v.category_id,subcategoryId:v.subcategory_id||null,name:v.name,
   path:[departmentLabel(department),category.name,subcategory?.name,v.name].filter(Boolean).join(' → ')}];
 });
}
export function searchTaxonomyPaths(paths,query,limit=20){
 const needle=String(query||'').trim().toLocaleLowerCase();
 return (!needle?paths:paths.filter(p=>p.path.toLocaleLowerCase().includes(needle))).slice(0,limit);
}

/** Homepage and unscoped Shop All display flags; direct category and department URLs remain accessible. */
export function homepageVisibleDepartments(settings){
 if(settings?.split_store_enabled!==true)return [];
 return STORE_DEPARTMENTS.filter(department=>
  settings[department==='bakery'?'home_bakery_visible':'home_homestand_visible']!==false);
}
/** Null means unified store; [] means no department selected; explicit URLs are not blocked. */
export function shopVisibleDepartments(settings,requestedDepartment=null,category=null){
 if(settings?.split_store_enabled!==true)return null;
 if(category)return [departmentForCategory(category)];
 if(STORE_DEPARTMENTS.includes(requestedDepartment))return [requestedDepartment];
 return homepageVisibleDepartments(settings);
}
// Configured homepage card counts apply to both departments independently.
export const HOMEPAGE_GRID_DEFAULTS=Object.freeze({home_both_columns:3,home_both_rows:3,home_single_columns:5,home_single_rows:2});
export function normalizeHomepageGridNumber(value,fallback){
 const number=Number(value);
 return Number.isInteger(number)&&number>=1&&number<=6?number:fallback;
}
export function homepageGridSettings(settings={}){
 return Object.fromEntries(Object.entries(HOMEPAGE_GRID_DEFAULTS)
  .map(([key,fallback])=>[key,normalizeHomepageGridNumber(settings?.[key],fallback)]));
}
export function homepageGridLayout(settings={}){
 const visible=homepageVisibleDepartments(settings).length;
 if(!visible)return {mode:'none',columns:0,rows:0,limit:0};
 const grid=homepageGridSettings(settings);
 const columns=visible===1?grid.home_single_columns:grid.home_both_columns;
 const rows=visible===1?grid.home_single_rows:grid.home_both_rows;
 return {mode:visible===1?'single':'both',columns,rows,limit:columns*rows};
}
export function homepageStorefronts(settings,products,categories,limit=3){
 if(settings?.split_store_enabled!==true)return [];
 const count=Number.isInteger(limit)&&limit>0?Math.min(limit,36):3;
 const views=homepageVisibleDepartments(settings);
 return views.map(department=>{
  const items=filterStoreProducts(products,settings,department,categories)
   .slice().sort((a,b)=>Number(b.featured===true)-Number(a.featured===true)||
     String(a.name||'').localeCompare(String(b.name||''))||String(a.id||'').localeCompare(String(b.id||'')));
  return {department,label:departmentLabel(department),products:items.slice(0,count),total:items.length,
    href:'#shop/'+department};
 });
}
