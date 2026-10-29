-- MBB-ADMIN-150: Owner-managed, encrypted website runtime credentials.
-- Stored in Supabase Vault. Only trusted Cloudflare service-role calls may invoke these RPCs.
-- Infrastructure bootstrap credentials are intentionally excluded: never rotate the database
-- bootstrap key or Cloudflare control-plane token from the website itself.
create schema if not exists private;
create table if not exists private.mommabees_runtime_credentials (
 credential_name text not null,
 credential_environment text not null,
 vault_secret_id uuid not null unique,
 changed_by uuid not null,
 changed_at timestamptz not null default now(),
 primary key (credential_name,credential_environment),
 constraint mm_credential_allowed check (
  (credential_name='STRIPE_SECRET_KEY' and credential_environment in ('test','live')) or
  (credential_name='STRIPE_WEBHOOK_SECRET' and credential_environment in ('test','live')) or
  (credential_name='TURNSTILE_SECRET_KEY' and credential_environment='shared')
 )
);
revoke all on private.mommabees_runtime_credentials from public,anon,authenticated;
grant select,insert,update on private.mommabees_runtime_credentials to service_role;
create or replace function public.mommabees_credential_save(
 p_name text,p_environment text,p_secret text,p_actor uuid
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_id uuid; v_changed timestamptz; v_vault_name text;
begin
 if not (
  (p_name in ('STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET') and p_environment in ('test','live')) or
  (p_name='TURNSTILE_SECRET_KEY' and p_environment='shared')
 ) then raise exception 'Unsupported credential slot';end if;
 if p_actor is null or length(p_secret)<8 or length(p_secret)>8192
 then raise exception 'Invalid credential payload';end if;
 v_vault_name='mommabees_runtime__'||lower(p_environment)||'__'||lower(p_name);
 select vault_secret_id into v_id from private.mommabees_runtime_credentials
 where credential_name=p_name and credential_environment=p_environment for update;
 if v_id is null then
   v_id=vault.create_secret(p_secret,v_vault_name,'MommaBees runtime credential: access restricted to service-role RPC');
 else
   perform vault.update_secret(v_id,p_secret,v_vault_name,'MommaBees runtime credential: access restricted to service-role RPC');
 end if;
 insert into private.mommabees_runtime_credentials(credential_name,credential_environment,vault_secret_id,changed_by,changed_at)
 values(p_name,p_environment,v_id,p_actor,now())
 on conflict (credential_name,credential_environment) do update set
 vault_secret_id=excluded.vault_secret_id, changed_by=excluded.changed_by,changed_at=excluded.changed_at;
 select changed_at into v_changed from private.mommabees_runtime_credentials
 where credential_name=p_name and credential_environment=p_environment;
 return jsonb_build_object('stored',true,'name',p_name,'environment',p_environment,'changed_at',v_changed);
end;
$$;
revoke all on function public.mommabees_credential_save(text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.mommabees_credential_save(text,text,text,uuid) to service_role;

create or replace function public.mommabees_credential_read(
 p_name text,p_environment text
) returns text language sql security definer set search_path='' stable
as $$
 select ds.decrypted_secret
 from private.mommabees_runtime_credentials t
 join vault.decrypted_secrets ds on ds.id=t.vault_secret_id
 where t.credential_name=p_name and t.credential_environment=p_environment
 limit 1
$$;
revoke all on function public.mommabees_credential_read(text,text) from public,anon,authenticated;
grant execute on function public.mommabees_credential_read(text,text) to service_role;

create or replace function public.mommabees_credential_status()
returns jsonb language sql security definer set search_path='' stable
as $$
 select coalesce(jsonb_agg(jsonb_build_object('name',t.credential_name,
 'environment',t.credential_environment,'changed_at',t.changed_at,'configured',true)
 order by t.credential_name,t.credential_environment),'[]'::jsonb)
 from private.mommabees_runtime_credentials t;
$$;
revoke all on function public.mommabees_credential_status() from public,anon,authenticated;
grant execute on function public.mommabees_credential_status() to service_role;
