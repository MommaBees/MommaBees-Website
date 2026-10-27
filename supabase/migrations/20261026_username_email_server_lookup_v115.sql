-- Mamma Bee's Bakery — MBB-AUTH-023 v1.15
-- Resolve a username to the registered Auth email entirely within a server-only RPC.
-- Does not alter passwords, sessions, roles, account IDs, or CAPTCHA settings.
begin;
create schema if not exists bakery_private;
revoke all on schema bakery_private from public, anon, authenticated;
grant usage on schema bakery_private to service_role;

create or replace function bakery_private.login_email_by_username(p_username text)
returns text
language sql stable security definer set search_path = ''
as $fn$
  select au.email
  from public.customer_profiles cp
  join auth.users au on au.id = cp.id
  where cp.username is not null
    and lower(cp.username) = lower(p_username)
    and cp.banned_at is null
    and au.email is not null
  limit 1;
$fn$;
revoke all on function bakery_private.login_email_by_username(text) from public, anon, authenticated;
grant execute on function bakery_private.login_email_by_username(text) to service_role;

create or replace function public.bakery_login_email(p_username text)
returns text
language sql stable security invoker set search_path = ''
as $fn$
  select bakery_private.login_email_by_username(p_username)
  where p_username ~ '^[A-Za-z0-9_]{3,30}$';
$fn$;
revoke all on function public.bakery_login_email(text) from public, anon, authenticated;
grant execute on function public.bakery_login_email(text) to service_role;
commit;
