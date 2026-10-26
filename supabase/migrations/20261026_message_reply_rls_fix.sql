-- Fix recursive message RLS. Preserve owner-only access and validate reply parentage in a trigger.
drop policy if exists "customers send messages" on public.messages;
create policy "customers send messages" on public.messages for insert to authenticated
 with check(customer_id=(select auth.uid()) and is_staff_reply=false);
create or replace function private.validate_message_parent() returns trigger
language plpgsql set search_path='' as $$
declare root public.messages%rowtype;
begin
 if new.parent_id is null then return new; end if;
 select * into root from public.messages where id=new.parent_id;
 if not found or root.parent_id is not null or root.customer_id is distinct from new.customer_id then
   raise exception 'Reply is not linked to an authorized customer conversation';
 end if;
 return new;
end $$;
drop trigger if exists validate_message_parent on public.messages;
create trigger validate_message_parent before insert on public.messages for each row execute function private.validate_message_parent();
