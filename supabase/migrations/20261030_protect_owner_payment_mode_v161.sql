-- MommaBee v1.61: prevent authenticated Data API clients from bypassing the Owner-only payment API.
-- Protected server API uses the MommaBees service_role credential; no direct client may enable sales.
create or replace function public.mommabees_protect_payment_mode()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, public
as $$
begin
  if (tg_op = 'UPDATE' and
     (new.stripe_payment_mode is distinct from old.stripe_payment_mode or
      new.checkout_enabled is distinct from old.checkout_enabled))
     or (tg_op = 'INSERT' and
      (new.stripe_payment_mode = 'live' or new.checkout_enabled is true)) then
    if current_user not in ('service_role','postgres') then
      raise exception 'Stripe payment mode and customer checkout require the verified Owner server endpoint'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists mommabees_protect_payment_mode_trigger on public.site_settings;
create trigger mommabees_protect_payment_mode_trigger
  before insert or update of stripe_payment_mode, checkout_enabled on public.site_settings
  for each row execute function public.mommabees_protect_payment_mode();
comment on function public.mommabees_protect_payment_mode() is
 'Prevents staff client RLS UPDATE/INSERT policies from bypassing server-verified Owner-only TEST/LIVE checkout control.';
