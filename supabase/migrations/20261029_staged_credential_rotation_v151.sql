-- MBB-SEC-151: atomic staging, verified promotion and rollback. No external charges.
create table if not exists private.mommabees_credential_rotations (
 id uuid primary key default gen_random_uuid(),
 credential_name text not null,
 credential_environment text not null,
 vault_secret_id uuid not null unique,
 actor_id uuid not null,
 state text not null default 'pending',
 dependency_results jsonb not null default '[]'::jsonb,
 prior_vault_secret_id uuid,
 created_at timestamptz not null default now(),
 verified_at timestamptz,
 activated_at timestamptz,
 updated_at timestamptz not null default now(),
 constraint mm_rotation_slot check (
 (credential_name in ('STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET') and credential_environment in ('test','live')) or
 (credential_name='TURNSTILE_SECRET_KEY' and credential_environment='shared')),
 constraint mm_rotation_state check(state in ('pending','activated','rolled_back','rejected','failed'))
);
create unique index if not exists mm_one_pending_slot
 on private.mommabees_credential_rotations(credential_name,credential_environment) where state='pending';
revoke all on private.mommabees_credential_rotations from public,anon,authenticated;
grant select,insert,update on private.mommabees_credential_rotations to service_role;

create or replace function public.mommabees_credential_stage(
 p_name text,p_environment text,p_secret text,p_actor uuid,p_dependencies jsonb default '[]'::jsonb
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_id uuid; v_vault uuid;
begin
 if not ((p_name in ('STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET') and p_environment in ('test','live')) or
 (p_name='TURNSTILE_SECRET_KEY' and p_environment='shared'))
 then raise exception 'Unsupported slot';end if;
 if p_actor is null or length(p_secret)<8 or length(p_secret)>8192 then raise exception 'Invalid staged secret';end if;
 -- A pending rotation must be resolved before replacing it: preserve the audit trail.
 if exists(select 1 from private.mommabees_credential_rotations where credential_name=p_name and credential_environment=p_environment and state='pending')
 then raise exception 'Resolve the existing pending rotation first';end if;
 v_id=gen_random_uuid();
 v_vault=vault.create_secret(p_secret,'mommabees_pending_'||replace(v_id::text,'-',''),'Pending MommaBees credential; never client readable');
 insert into private.mommabees_credential_rotations
 (id,credential_name,credential_environment,vault_secret_id,actor_id,dependency_results)
 values(v_id,p_name,p_environment,v_vault,p_actor,coalesce(p_dependencies,'[]'::jsonb));
 return jsonb_build_object('id',v_id,'state','pending');
end;
$$;
revoke all on function public.mommabees_credential_stage(text,text,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.mommabees_credential_stage(text,text,text,uuid,jsonb) to service_role;

create or replace function public.mommabees_credential_pending(p_name text,p_environment text)
returns jsonb language sql security definer set search_path='' stable
as $$
 select jsonb_build_object('id',r.id,'secret',ds.decrypted_secret,'name',r.credential_name,'environment',r.credential_environment)
 from private.mommabees_credential_rotations r
 join vault.decrypted_secrets ds on ds.id=r.vault_secret_id
 where r.credential_name=p_name and r.credential_environment=p_environment and r.state='pending'
 order by r.created_at desc limit 1
$$;
revoke all on function public.mommabees_credential_pending(text,text) from public,anon,authenticated;
grant execute on function public.mommabees_credential_pending(text,text) to service_role;

create or replace function public.mommabees_credential_promote(p_rotation uuid,p_dependencies jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare r private.mommabees_credential_rotations%rowtype; v_prior uuid;
begin
 select * into r from private.mommabees_credential_rotations where id=p_rotation for update;
 if not found or r.state<>'pending' then raise exception 'Pending rotation not found';end if;
 select vault_secret_id into v_prior from private.mommabees_runtime_credentials
 where credential_name=r.credential_name and credential_environment=r.credential_environment for update;
 insert into private.mommabees_runtime_credentials(credential_name,credential_environment,vault_secret_id,changed_by,changed_at)
 values(r.credential_name,r.credential_environment,r.vault_secret_id,r.actor_id,now())
 on conflict(credential_name,credential_environment) do update set
 vault_secret_id=excluded.vault_secret_id,changed_by=excluded.changed_by,changed_at=excluded.changed_at;
 update private.mommabees_credential_rotations
 set state='activated', prior_vault_secret_id=v_prior,verified_at=now(),activated_at=now(),updated_at=now(),
 dependency_results=coalesce(p_dependencies,'[]'::jsonb) where id=p_rotation;
 return jsonb_build_object('id',r.id,'state','activated','name',r.credential_name,'environment',r.credential_environment);
end;
$$;
revoke all on function public.mommabees_credential_promote(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.mommabees_credential_promote(uuid,jsonb) to service_role;

create or replace function public.mommabees_credential_revert(p_rotation uuid,p_reason text default 'post-activation verification failed')
returns jsonb language plpgsql security definer set search_path=''
as $$
declare r private.mommabees_credential_rotations%rowtype;
begin
 select * into r from private.mommabees_credential_rotations where id=p_rotation for update;
 if not found or r.state<>'activated' then raise exception 'Activated rotation not found';end if;
 if not exists (select 1 from private.mommabees_runtime_credentials where
 credential_name=r.credential_name and credential_environment=r.credential_environment and vault_secret_id=r.vault_secret_id)
 then raise exception 'Rotation has been superseded';end if;
 if r.prior_vault_secret_id is null then
 delete from private.mommabees_runtime_credentials where credential_name=r.credential_name and credential_environment=r.credential_environment;
 else
 update private.mommabees_runtime_credentials set vault_secret_id=r.prior_vault_secret_id,changed_at=now()
 where credential_name=r.credential_name and credential_environment=r.credential_environment;
 end if;
 update private.mommabees_credential_rotations set state='rolled_back',updated_at=now(),
 dependency_results=dependency_results||jsonb_build_array(jsonb_build_object('dependency','rollback','result','rolled_back','reason',left(p_reason,160)))
 where id=p_rotation;
 return jsonb_build_object('id',r.id,'state','rolled_back');
end;
$$;
revoke all on function public.mommabees_credential_revert(uuid,text) from public,anon,authenticated;
grant execute on function public.mommabees_credential_revert(uuid,text) to service_role;

create or replace function public.mommabees_credential_reject(p_rotation uuid,p_state text default 'rejected')
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_state text;
begin
 if p_state not in ('rejected','failed') then raise exception 'Invalid rejection status';end if;
 update private.mommabees_credential_rotations set state=p_state,updated_at=now()
 where id=p_rotation and state='pending' returning state into v_state;
 if v_state is null then raise exception 'Pending rotation not found';end if;
 return jsonb_build_object('id',p_rotation,'state',v_state);
end;
$$;
revoke all on function public.mommabees_credential_reject(uuid,text) from public,anon,authenticated;
grant execute on function public.mommabees_credential_reject(uuid,text) to service_role;

create or replace function public.mommabees_credential_history()
returns jsonb language sql security definer set search_path='' stable as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',r.id,'name',r.credential_name,'environment',r.credential_environment,'state',r.state,
 'created_at',r.created_at,'verified_at',r.verified_at,'activated_at',r.activated_at,
 'updated_at',r.updated_at,'dependencies',r.dependency_results) order by r.created_at desc),'[]'::jsonb)
 from (select * from private.mommabees_credential_rotations order by created_at desc limit 60) r
$$;
revoke all on function public.mommabees_credential_history() from public,anon,authenticated;
grant execute on function public.mommabees_credential_history() to service_role;
