-- MBB-SEC-153. Atomic per-source checkout admission; only the server service role may access it.
create table if not exists private.mommabees_checkout_rate_gates(
 key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
 attempt_count integer not null check (attempt_count > 0),
 window_started_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
revoke all on private.mommabees_checkout_rate_gates from public,anon,authenticated;
grant select,insert,update,delete on private.mommabees_checkout_rate_gates to service_role;
create index if not exists mommabees_checkout_gate_gc on private.mommabees_checkout_rate_gates(updated_at);
create or replace function public.mommabees_checkout_admit(p_key_hash text,p_limit integer,p_window_seconds integer)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare gate private.mommabees_checkout_rate_gates%rowtype;
begin
 if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$'
  or p_limit not between 1 and 30 or p_window_seconds not between 60 and 3600
 then raise exception 'Invalid admission request';end if;
 insert into private.mommabees_checkout_rate_gates(key_hash,attempt_count,window_started_at,updated_at)
 values(p_key_hash,1,now(),now())
 on conflict(key_hash) do update set
 attempt_count=case when private.mommabees_checkout_rate_gates.window_started_at +
  make_interval(secs=>p_window_seconds) <= now() then 1 else
  private.mommabees_checkout_rate_gates.attempt_count+1 end,
 window_started_at=case when private.mommabees_checkout_rate_gates.window_started_at +
  make_interval(secs=>p_window_seconds) <= now() then now() else
  private.mommabees_checkout_rate_gates.window_started_at end,
 updated_at=now()
 returning * into gate;
 if random()<0.01 then
  delete from private.mommabees_checkout_rate_gates where updated_at<now()-interval '2 days';
 end if;
 return jsonb_build_object('allowed',gate.attempt_count<=p_limit,
  'attempts',gate.attempt_count,'retry_after',greatest(1,ceil(extract(epoch from
  (gate.window_started_at+make_interval(secs=>p_window_seconds)-now())))::int));
end
$$;
revoke all on function public.mommabees_checkout_admit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.mommabees_checkout_admit(text,integer,integer) to service_role;
