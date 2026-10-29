-- MBB-SEC-152: Owner controls optional automatic activation.
-- Default OFF. Manual credential entry, verification and promotion remain available.
create table if not exists private.mommabees_credential_rotation_controls (
 singleton boolean primary key default true check(singleton),
 automatic_activation_enabled boolean not null default false,
 updated_at timestamptz not null default now(),
 updated_by uuid
);
revoke all on private.mommabees_credential_rotation_controls from public,anon,authenticated;
grant select,insert,update on private.mommabees_credential_rotation_controls to service_role;
insert into private.mommabees_credential_rotation_controls(singleton,automatic_activation_enabled)
values(true,false) on conflict(singleton) do nothing;
create or replace function public.mommabees_rotation_control(
 p_enabled boolean default null,p_actor uuid default null
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_enabled boolean;v_at timestamptz;
begin
 if p_enabled is not null then
  if p_actor is null then raise exception 'Actor required';end if;
  update private.mommabees_credential_rotation_controls
  set automatic_activation_enabled=p_enabled,updated_at=now(),updated_by=p_actor
  where singleton=true;
 end if;
 select automatic_activation_enabled,updated_at into v_enabled,v_at
 from private.mommabees_credential_rotation_controls where singleton=true;
 return jsonb_build_object('enabled',coalesce(v_enabled,false),'updated_at',v_at);
end;
$$;
revoke all on function public.mommabees_rotation_control(boolean,uuid) from public,anon,authenticated;
grant execute on function public.mommabees_rotation_control(boolean,uuid) to service_role;
alter table private.mommabees_credential_rotations
 add column if not exists proof_verified_at timestamptz;
create or replace function public.mommabees_credential_mark_proven(
 p_rotation uuid
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare r private.mommabees_credential_rotations%rowtype;
begin
 update private.mommabees_credential_rotations
 set proof_verified_at=coalesce(proof_verified_at,now()),updated_at=now(),
 dependency_results=(select coalesce(jsonb_agg(case
  when d->>'name' in ('stripe_signed_delivery','website_webhook') then jsonb_set(d,'{state}','"verified"'::jsonb)
  else d end),'[]'::jsonb)
  from jsonb_array_elements(dependency_results) d)
 where id=p_rotation and state='pending'
 returning * into r;
 if not found then raise exception 'Pending credential not found';end if;
 return jsonb_build_object('id',r.id,'state',r.state,'proof_verified',true);
end;
$$;
revoke all on function public.mommabees_credential_mark_proven(uuid) from public,anon,authenticated;
grant execute on function public.mommabees_credential_mark_proven(uuid) to service_role;
create or replace function public.mommabees_credential_pending(p_name text,p_environment text)
returns jsonb language sql security definer set search_path='' stable
as $$
 select jsonb_build_object('id',r.id,'secret',ds.decrypted_secret,'name',r.credential_name,
 'environment',r.credential_environment,'proof_verified',r.proof_verified_at is not null)
 from private.mommabees_credential_rotations r
 join vault.decrypted_secrets ds on ds.id=r.vault_secret_id
 where r.credential_name=p_name and r.credential_environment=p_environment and r.state='pending'
 order by r.created_at desc limit 1
$$;
revoke all on function public.mommabees_credential_pending(text,text) from public,anon,authenticated;
grant execute on function public.mommabees_credential_pending(text,text) to service_role;
create or replace function public.mommabees_credential_history()
returns jsonb language sql security definer set search_path='' stable as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',r.id,'name',r.credential_name,'environment',r.credential_environment,'state',r.state,
 'created_at',r.created_at,'verified_at',r.verified_at,'activated_at',r.activated_at,
 'updated_at',r.updated_at,'proof_verified',r.proof_verified_at is not null,
 'dependencies',r.dependency_results) order by r.created_at desc),'[]'::jsonb)
 from (select * from private.mommabees_credential_rotations order by created_at desc limit 60) r
$$;
revoke all on function public.mommabees_credential_history() from public,anon,authenticated;
grant execute on function public.mommabees_credential_history() to service_role;
