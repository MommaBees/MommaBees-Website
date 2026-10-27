-- Mamma Bee's Bakery — Username or email login, secure identifier resolution
-- The API service key may resolve username -> user ID. Public visitors cannot query this mapping.
-- No email address is returned by this function.
begin;
create or replace function public.bakery_login_user_id(p_username text)
returns uuid language sql stable security invoker set search_path = ''
as $$
  select cp.id
  from public.customer_profiles cp
  where cp.username is not null
    and lower(cp.username) = lower(p_username)
    and cp.banned_at is null
  limit 1;
$$;
revoke all on function public.bakery_login_user_id(text) from public, anon, authenticated;
grant execute on function public.bakery_login_user_id(text) to service_role;
commit;
