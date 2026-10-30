-- MBB-ADMIN-067: server-only exact recipient resolution by username or verified email.
-- Restricted to service_role; the Pages endpoint separately verifies Owner/Admin role.
create or replace function public.mommabees_resolve_admin_recipient(p_lookup text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  needle text := lower(btrim(coalesce(p_lookup,'')));
  found jsonb;
begin
  if length(needle) < 3 or length(needle) > 254 then
    raise exception 'Provide a valid username or email address';
  end if;
  select jsonb_build_object(
    'id',p.id,'username',p.username,'email',u.email,
    'email_verified',u.email_confirmed_at is not null,
    'marketing_opt_in',coalesce(p.marketing_opt_in,false),
    'banned',p.banned_at is not null)
  into found
  from public.customer_profiles p
  join auth.users u on u.id=p.id
  where lower(coalesce(p.username,'')) = needle
     or lower(coalesce(u.email,'')) = needle
  limit 1;
  return coalesce(found,'{}'::jsonb);
end;
$$;
revoke all on function public.mommabees_resolve_admin_recipient(text)
  from PUBLIC, anon, authenticated;
grant execute on function public.mommabees_resolve_admin_recipient(text) to service_role;