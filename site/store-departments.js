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
