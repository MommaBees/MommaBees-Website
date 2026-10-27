-- Owner-requested removal of named geographic text from public bakery terms.
-- Retain all eligibility, food-handling and location restrictions.
do $migration$
declare changed integer;
begin
 update public.site_settings
 set terms=replace(
  terms,
  'MISSOURI COTTAGE-FOOD SALES: For products sold as cottage foods online under Missouri RSMo §196.298, the producer and purchaser must both be located in Missouri. Food sold must be legally eligible, correctly labeled and prepared under the applicable rules. Products requiring special handling may not qualify under cottage-food provisions.',
  'COTTAGE-FOOD SALES ELIGIBILITY: Online orders are accepted only when the producer, purchaser, product, and fulfillment method satisfy applicable food-sale and location restrictions. The bakery must confirm these requirements before accepting an order. Food sold must be legally eligible, correctly labeled, and prepared under the applicable rules. Products requiring special handling may not qualify under cottage-food provisions.'
 ),updated_at=now()
 where id=1 and terms like '%MISSOURI COTTAGE-FOOD SALES:%';
 get diagnostics changed = row_count;
 if changed<>1 then raise exception 'Expected one site_settings row requiring terms replacement, found %',changed; end if;
end $migration$;
