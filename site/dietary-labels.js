// Owner-verified bakery dietary declarations. Never infer a claim from a recipe or photograph.
// "Gluten-free" must meet FDA 21 CFR 101.91, including any unavoidable gluten being <20 ppm.
export const DIETARY_CLAIMS=Object.freeze([
 ['gluten-free','Gluten-free'],
 ['dairy-free','Dairy-free'],
 ['egg-free','Egg-free'],
 ['peanut-free','Peanut-free'],
 ['tree-nut-free','Tree-nut-free'],
 ['soy-free','Soy-free'],
 ['sesame-free','Sesame-free'],
 ['vegan','Vegan'],
 ['vegetarian','Vegetarian']
]);
export const approvedDietaryClaims=(record)=>{
 if(record?.dietary_claims_reviewed!==true)return [];
 const active=Array.isArray(record.dietary_claims)?record.dietary_claims:[];
 return DIETARY_CLAIMS.filter(([key])=>active.includes(key)).map(([,label])=>label);
};
export const knownAllergenStatement=(record)=>{
 if(record?.allergen_reviewed===true&&Array.isArray(record.major_allergens)&&record.major_allergens.length)
  return 'Contains: '+record.major_allergens.join(', ')+'.';
 const statement=String(record?.allergens||'').trim();
 return statement||'Allergen information not yet provided. Ask Momma Bee before ordering.';
};
