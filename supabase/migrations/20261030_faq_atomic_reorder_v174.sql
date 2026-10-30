-- Atomic reorder of managed FAQ records. Callable exclusively from server service role.
create or replace function public.mommabees_reorder_faqs(p_ids uuid[])
returns integer language plpgsql security invoker set search_path=''
as $$
declare
 total integer;
 idx integer;
begin
 if p_ids is null or array_length(p_ids,1) is null or array_length(p_ids,1)>250
 then raise exception 'Invalid FAQ order'; end if;
 if (select count(distinct x) from unnest(p_ids) as x) <> array_length(p_ids,1)
 then raise exception 'Duplicate FAQ identifiers'; end if;
 select count(*) into total from public.faq_entries;
 if total <> array_length(p_ids,1) then
   raise exception 'FAQ list changed; refresh before sorting';
 end if;
 for idx in 1..array_length(p_ids,1) loop
  update public.faq_entries set sort_order=idx*10, updated_at=now() where id=p_ids[idx];
  if not found then raise exception 'Unrecognized FAQ'; end if;
 end loop;
 return total;
end;
$$;
revoke all on function public.mommabees_reorder_faqs(uuid[]) from public,anon,authenticated;
grant execute on function public.mommabees_reorder_faqs(uuid[]) to service_role;