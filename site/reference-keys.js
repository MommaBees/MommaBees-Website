// Canonical primary-key mapping for Admin foreign-key selectors.
// Field names like category_id are *local* foreign keys, not columns on the referenced row.
// Most referenced records use UUID id; baking_days uses its date as the primary key.
const keys=Object.freeze({baking_days:'date'});
export function referenceKeyFor(table){
 return Object.hasOwn(keys,table)?keys[table]:'id';
}
