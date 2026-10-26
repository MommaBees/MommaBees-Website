-- Require private message-photo metadata to refer to the customer's own message folder.
drop policy if exists "message photo owner add" on public.message_photos;
create policy "message photo owner add" on public.message_photos for insert to authenticated
 with check (
  exists(select 1 from public.messages m where m.id=message_id and m.customer_id=(select auth.uid()))
  and split_part(storage_path,'/',1)=(select auth.uid())::text
  and split_part(storage_path,'/',2)=message_id::text
  and split_part(storage_path,'/',3) <> ''
 );
