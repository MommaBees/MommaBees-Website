// Nine FDA major food-allergen groups. Suggestions are NOT ingredient verification.
export const MAJOR_ALLERGENS=Object.freeze([
 'Milk','Eggs','Fish','Crustacean shellfish','Tree nuts','Peanuts','Wheat','Soybeans','Sesame'
]);
const patterns={
 Milk:/\b(milk|cream|butter|cheese|whey|casein|custard|yogurt|chocolate milk|buttermilk)\b/i,
 Eggs:/\b(egg|eggs|albumen|meringue|mayonnaise)\b/i,
 Fish:/\b(salmon|tuna|cod|anchov(?:y|ies)|fish)\b/i,
 'Crustacean shellfish':/\b(shrimp|crab|lobster|prawn|crayfish)\b/i,
 'Tree nuts':/\b(pecan|pecans|walnut|walnuts|almond|almonds|pistachio|pistachios|cashew|cashews|hazelnut|hazelnuts|macadamia|brazil nut)\b/i,
 Peanuts:/\b(peanut|peanuts|peanut butter|reese'?s)\b/i,
 Wheat:/\b(wheat|all.purpose flour|bread flour|cake flour|graham|semolina|durum)\b/i,
 Soybeans:/\b(soy|soybean|edamame|tofu|soy lecithin)\b/i,
 Sesame:/\b(sesame|tahini)\b/i
};
export function suggestMajorAllergens({name='',ingredients=''}={}){
 const text=String(ingredients||'')+' '+String(name||'');
 return MAJOR_ALLERGENS.filter(group=>patterns[group].test(text));
}
export function publicAllergenStatement(selected){
 if(!selected?.length)return 'No major allergens declared; contact the bakery about ingredients and possible cross-contact.';
 return 'Contains: '+MAJOR_ALLERGENS.filter(x=>selected.includes(x)).join(', ')+'.';
}
