-- Mamma Bee's Bakery / schema v0.1. Apply to a NEW, empty Supabase project with SQL Editor.
-- DO NOT apply to an existing production project without review/backups.
-- Every public table has RLS. No real customers or example products are inserted.
create extension if not exists pgcrypto;
create schema if not exists private;

create table public.staff_roles (user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','admin','staff')), created_at timestamptz not null default now());
create table public.customer_profiles (id uuid primary key references auth.users(id) on delete cascade,
 full_name text, phone text, marketing_opt_in boolean not null default false,
 created_at timestamptz not null default now());
create table public.categories (id uuid primary key default gen_random_uuid(), name text not null unique,
 slug text not null unique, description text, photo_url text, sort_order int not null default 0,
 active boolean not null default true, created_at timestamptz not null default now());
create table public.products (id uuid primary key default gen_random_uuid(), category_id uuid references public.categories(id),
 name text not null, slug text not null unique, description text not null default '',
 price_cents integer not null check(price_cents >= 0), unit text not null default 'each',
 mode text not null default 'preorder' check(mode in ('ready','preorder','both')),
 published boolean not null default false, featured boolean not null default false,
 ingredients text, allergens text, storage_notes text, lead_days int not null default 2 check (lead_days between 0 and 90),
 variants jsonb not null default '[]'::jsonb, photo_url text,
 created_at timestamptz not null default now());
create table public.product_photos (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
 url text not null, alt_text text, sort_order int not null default 0);
create table public.stock_batches (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id),
 batch_label text, baked_on date not null, best_before date not null, quantity_available int not null default 0 check(quantity_available >= 0),
 clearance_approved boolean not null default false, clearance_note text, disabled boolean not null default false,
 created_at timestamptz not null default now());
create table public.baking_days (date date primary key, enabled boolean not null default true,
 cutoff_at timestamptz not null, capacity_total int not null default 30 check(capacity_total >= 0),
 pickup_enabled boolean not null default true, delivery_enabled boolean not null default true,
 pickup_windows text[] not null default array['10:00–12:00'], delivery_windows text[] not null default array['12:00–14:00'],
 notes text, created_at timestamptz not null default now());
create table public.product_day_limits (product_id uuid not null references public.products(id) on delete cascade,
 baking_date date not null references public.baking_days(date) on delete cascade,
 max_quantity integer not null check(max_quantity >= 0), primary key(product_id,baking_date));
create table public.site_settings (id int primary key default 1 check(id=1),
 brand_subtitle text not null default 'Iowa Roots. Faith-Filled Heart. Baked with Love.',
 home_heading text not null default 'Made with care. Shared with joy.',
 home_intro text not null default 'Explore baked goods ready to enjoy or order ahead for an upcoming baking day.',
 hero_url text, header_url text, email text, phone text,
 pickup_instructions text, delivery_zips text[] not null default array[]::text[],
 delivery_fee_cents int not null default 0 check(delivery_fee_cents >= 0),
 delivery_enabled boolean not null default true, pickup_enabled boolean not null default true,
 checkout_enabled boolean not null default false, food_notice text,
 terms text, updated_at timestamptz not null default now());
insert into public.site_settings(id) values (1);
create table public.promotions (id uuid primary key default gen_random_uuid(), title text not null,
 code text unique, kind text not null default 'percent' check(kind in ('percent','fixed')),
 value int not null check(value > 0),
 scope text not null default 'all' check(scope in ('all','products','categories','batches')),
 scope_ids uuid[] not null default array[]::uuid[],
 audience text not null default 'all' check(audience in ('all','selected','returning')),
 starts_at timestamptz not null, ends_at timestamptz not null, max_uses integer check(max_uses > 0),
 uses integer not null default 0 check(uses >= 0), published boolean not null default false,
 max_discount_cents integer check(max_discount_cents > 0),
 min_subtotal_cents integer not null default 0 check(min_subtotal_cents >= 0),
 created_at timestamptz not null default now(), constraint valid_promo_period check(ends_at>starts_at),
 constraint percent_max check(kind<>'percent' or value<=100));
create table public.promotion_recipients(promotion_id uuid references public.promotions(id) on delete cascade,
 customer_id uuid references auth.users(id) on delete cascade, primary key(promotion_id,customer_id));
create table public.announcements (id uuid primary key default gen_random_uuid(), title text not null,
 body text not null, image_url text, link_url text, placement text not null default 'home' check(placement in ('home','shop','all')),
 audience text not null default 'all' check(audience in ('all','signed_in','selected')),
 priority text not null default 'normal' check(priority in ('normal','urgent')),
 starts_at timestamptz, ends_at timestamptz, published boolean not null default false,
 created_at timestamptz not null default now());
create table public.announcement_recipients(announcement_id uuid references public.announcements(id) on delete cascade,
 customer_id uuid references auth.users(id) on delete cascade, primary key(announcement_id,customer_id));
create table public.orders (id uuid primary key default gen_random_uuid(), customer_id uuid references auth.users(id) on delete set null,
 email text not null, customer_name text, phone text, fulfillment_method text not null check(fulfillment_method in ('pickup','delivery')),
 fulfillment_date date not null, fulfillment_window text not null, delivery_address jsonb,
 note text, status text not null default 'new' check(status in ('new','confirmed','baking','ready','completed','cancelled')),
 payment_status text not null default 'pending' check(payment_status in ('pending','paid','refunded','failed','expired')),
 subtotal_cents int not null default 0 check(subtotal_cents>=0), discount_cents int not null default 0 check(discount_cents>=0),
 delivery_cents int not null default 0 check(delivery_cents>=0), tax_cents int not null default 0 check(tax_cents>=0),
 total_cents int not null default 0 check(total_cents>=0),
 promotion_id uuid references public.promotions(id), checkout_session_id text unique,
 guest_token_hash text unique, reservation_expires_at timestamptz,
 reservation_released boolean not null default false, created_at timestamptz not null default now());
create index orders_fulfillment_idx on public.orders(fulfillment_date,status,payment_status);
create index orders_customer_idx on public.orders(customer_id);
create table public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 product_id uuid not null references public.products(id), batch_id uuid references public.stock_batches(id),
 product_name text not null, quantity int not null check(quantity>0),
 mode text not null check(mode in ('ready','preorder')), unit_price_cents int not null,
 item_discount_cents int not null default 0 check(item_discount_cents>=0),
 options jsonb not null default '{}'::jsonb);
create table public.order_events (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 actor_id uuid references auth.users(id), event text not null, detail text, created_at timestamptz not null default now());
create table public.messages (id uuid primary key default gen_random_uuid(), customer_id uuid references auth.users(id) on delete set null,
 customer_email text, order_id uuid references public.orders(id), kind text not null default 'message' check(kind in ('message','custom_order','question','reply')),
 subject text not null, body text not null, status text not null default 'new' check(status in ('new','in_progress','replied','closed')),
 parent_id uuid references public.messages(id), is_staff_reply boolean not null default false,
 created_at timestamptz not null default now());
create table public.reviews (id uuid primary key default gen_random_uuid(), customer_id uuid not null references auth.users(id) on delete cascade,
 product_id uuid not null references public.products(id), rating int not null check(rating between 1 and 5),
 body text not null, approved boolean not null default false, created_at timestamptz not null default now());
create table public.review_photos(id uuid primary key default gen_random_uuid(), review_id uuid not null references public.reviews(id) on delete cascade,
 storage_path text not null, created_at timestamptz not null default now());
create table public.notifications(id uuid primary key default gen_random_uuid(), customer_id uuid not null references auth.users(id) on delete cascade,
 kind text not null, title text not null, body text not null, read_at timestamptz,
 promotion_id uuid references public.promotions(id), created_at timestamptz not null default now());
create unique index notifications_promotion_unique on public.notifications(customer_id,promotion_id) where promotion_id is not null;
create table public.expenses (id uuid primary key default gen_random_uuid(), purchased_on date not null,
 description text not null, category text not null default 'other', amount_cents int not null check(amount_cents>=0), notes text);
create table public.ingredients (id uuid primary key default gen_random_uuid(), name text not null unique,
 unit text not null, package_size numeric not null default 1 check(package_size>0),
 package_cost_cents int not null default 0 check(package_cost_cents>=0), quantity_on_hand numeric not null default 0,
 updated_at timestamptz not null default now());
create table public.recipes(id uuid primary key default gen_random_uuid(), product_id uuid not null unique references public.products(id),
 yield_quantity numeric not null default 1 check(yield_quantity>0), instructions text);
create table public.recipe_ingredients (id uuid primary key default gen_random_uuid(), recipe_id uuid not null references public.recipes(id) on delete cascade,
 ingredient_id uuid not null references public.ingredients(id), quantity numeric not null check(quantity>0), unique(recipe_id,ingredient_id));

-- RLS everywhere: no guest access to order data, staff roles, customer data, or reviews awaiting moderation.
do $$ declare t text; begin
 foreach t in array array['staff_roles','customer_profiles','categories','products','product_photos','stock_batches','baking_days','product_day_limits','site_settings','promotions','promotion_recipients','announcements','announcement_recipients','orders','order_items','order_events','messages','reviews','review_photos','notifications','expenses','ingredients','recipes','recipe_ingredients'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
end $$;
create policy "staff see own role" on public.staff_roles for select to authenticated using(user_id=(select auth.uid()));
create policy "profiles own read" on public.customer_profiles for select to authenticated using(id=(select auth.uid()));
create policy "profiles own insert" on public.customer_profiles for insert to authenticated with check(id=(select auth.uid()));
create policy "profiles own update" on public.customer_profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy "customers see orders" on public.orders for select to authenticated using(customer_id=(select auth.uid()));
create policy "customers see order items" on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and o.customer_id=(select auth.uid())));
create policy "customers see order events" on public.order_events for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and o.customer_id=(select auth.uid())));
create policy "customers see messages" on public.messages for select to authenticated using(customer_id=(select auth.uid()));
create policy "customers send messages" on public.messages for insert to authenticated with check(customer_id=(select auth.uid()) and is_staff_reply=false and parent_id is null);
create policy "customers see notifications" on public.notifications for select to authenticated using(customer_id=(select auth.uid()));
create policy "customers mark notifications" on public.notifications for update to authenticated using(customer_id=(select auth.uid())) with check(customer_id=(select auth.uid()));
create policy "approved reviews public" on public.reviews for select to anon,authenticated using(approved);
create policy "own reviews read" on public.reviews for select to authenticated using(customer_id=(select auth.uid()));
create policy "own reviews create" on public.reviews for insert to authenticated with check(customer_id=(select auth.uid()) and approved=false);
create policy "review photos owner" on public.review_photos for select to authenticated using(exists(select 1 from public.reviews r where r.id=review_id and r.customer_id=(select auth.uid())));
create policy "review photos owner upload" on public.review_photos for insert to authenticated with check(exists(select 1 from public.reviews r where r.id=review_id and r.customer_id=(select auth.uid())) and
 (select count(*) from public.review_photos p where p.review_id=public.review_photos.review_id)<3);

-- Public catalog access. Separate explicit grants from policies.
create policy "public categories" on public.categories for select to anon,authenticated using(active);
create policy "public products" on public.products for select to anon,authenticated using(published);
create policy "public product photos" on public.product_photos for select to anon,authenticated using(exists(select 1 from public.products p where p.id=product_id and p.published));
create policy "public stock availability" on public.stock_batches for select to anon,authenticated using(not disabled and quantity_available>0 and best_before >= (now() at time zone 'America/Chicago')::date and exists(select 1 from public.products p where p.id=product_id and p.published));
create policy "public available calendar" on public.baking_days for select to anon,authenticated using(enabled);
create policy "public product day limits" on public.product_day_limits for select to anon,authenticated using(true);
create policy "public settings" on public.site_settings for select to anon,authenticated using(true);
create policy "public promotions" on public.promotions for select to anon,authenticated using(published and starts_at<=now() and ends_at>now() and audience='all');
create policy "public announcements" on public.announcements for select to anon,authenticated using(published and audience='all' and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()));
create policy "private promo for recipient" on public.promotions for select to authenticated using(published and starts_at<=now() and ends_at>now() and audience='selected' and exists(select 1 from public.promotion_recipients pr where pr.promotion_id=id and pr.customer_id=(select auth.uid())));
create policy "private announcements" on public.announcements for select to authenticated using(published and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()) and (audience='signed_in' or (audience='selected' and exists(select 1 from public.announcement_recipients a where a.announcement_id=id and a.customer_id=(select auth.uid())))));
create policy "own promotion recipients" on public.promotion_recipients for select to authenticated using(customer_id=(select auth.uid()));
create policy "own announcement recipients" on public.announcement_recipients for select to authenticated using(customer_id=(select auth.uid()));

-- Staff policies: role comes from server-managed staff_roles, never self-editable user metadata.
do $$ declare t text; begin
 foreach t in array array['categories','products','product_photos','stock_batches','baking_days','product_day_limits','site_settings','promotions','promotion_recipients','announcements','announcement_recipients','orders','order_items','order_events','messages','reviews','review_photos','notifications','expenses','ingredients','recipes','recipe_ingredients','customer_profiles'] loop
 execute format('create policy %I on public.%I for all to authenticated using (exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role in (''owner'',''admin''))) with check (exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role in (''owner'',''admin'')))', 'staff manage '||t,t);
 end loop;
end $$;
-- Detailed grants: RLS still decides which authenticated rows can be written.
grant select on public.categories,public.products,public.product_photos,public.stock_batches,public.baking_days,public.product_day_limits,public.site_settings,public.promotions,public.announcements,public.reviews to anon;
grant select on all tables in schema public to authenticated;
grant insert,update,delete on public.customer_profiles,public.categories,public.products,public.product_photos,public.stock_batches,public.baking_days,public.product_day_limits,public.site_settings,public.promotions,public.promotion_recipients,public.announcements,public.announcement_recipients,public.messages,public.reviews,public.review_photos,public.notifications,public.expenses,public.ingredients,public.recipes,public.recipe_ingredients to authenticated;
-- Neither customers nor staff may create paid orders or modify payment fields through browser REST.
grant update(status,note) on public.orders to authenticated;
-- Order items/events are created by trusted backend only; authenticated role has SELECT only.
-- Never grant browser roles DELETE/UPDATE on staff_roles; only SQL Editor / service role can appoint Admins.

-- Public product photos are appropriate only with owner's consent. Review photos remain PRIVATE and moderated.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('product-photos','product-photos',true,5242880,array['image/jpeg','image/png','image/webp']),
 ('review-photos','review-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
 on conflict (id) do nothing;
create policy "product images admin upload" on storage.objects for insert to authenticated with check(bucket_id='product-photos' and exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role in ('owner','admin')));
create policy "product images admin edit" on storage.objects for update to authenticated using(bucket_id='product-photos' and exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role in ('owner','admin')));
create policy "product images admin delete" on storage.objects for delete to authenticated using(bucket_id='product-photos' and exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role in ('owner','admin')));
create policy "review owner image upload" on storage.objects for insert to authenticated with check(bucket_id='review-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "review owner image select" on storage.objects for select to authenticated using(bucket_id='review-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "review admin image select" on storage.objects for select to authenticated using(bucket_id='review-photos' and exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role in ('owner','admin')));

-- Automatically create a profile. No admin rights are ever granted by sign-up.
create or replace function private.create_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.customer_profiles(id) values(new.id) on conflict do nothing; return new; end $$;
create trigger new_user_profile after insert on auth.users for each row execute function private.create_profile();

-- Prevent staff-facing updates from being used to forge paid orders by authenticated owners: payment fields are server-only.
-- Because staff can manage the order table via RLS, a DB trigger rejects client-initiated updates of financial/payment identity fields.
create or replace function private.protect_order_payment_fields() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user <> 'service_role' and new.status in ('confirmed','baking','ready','completed') and old.payment_status<>'paid' then raise exception 'Unpaid orders cannot advance to production'; end if;
 if current_user <> 'service_role' and new.status='cancelled' and old.status<>'cancelled' then raise exception 'Cancellation/refund workflow requires server approval'; end if;
 if current_user <> 'service_role' and (new.payment_status is distinct from old.payment_status or new.total_cents is distinct from old.total_cents or new.subtotal_cents is distinct from old.subtotal_cents or new.discount_cents is distinct from old.discount_cents or new.delivery_cents is distinct from old.delivery_cents or new.tax_cents is distinct from old.tax_cents or new.checkout_session_id is distinct from old.checkout_session_id or new.customer_id is distinct from old.customer_id or new.reservation_released is distinct from old.reservation_released) then
 raise exception 'Payment and customer ownership fields are server managed'; end if; return new; end $$;
create trigger block_payment_field_changes before update on public.orders for each row execute function private.protect_order_payment_fields();

-- The checkout RPCs below may be called ONLY by the secret server-side key.
-- Lock baking day and stock rows inside a single transaction: concurrent requests cannot oversell.
create or replace function public.reserve_checkout(
 p_items jsonb,p_date date,p_window text,p_method text,p_email text,p_name text,p_phone text,
 p_user_id uuid,p_address jsonb,p_note text,p_code text,p_guest_hash text)
returns jsonb language plpgsql set search_path='' as $$
declare d public.baking_days%rowtype; cfg public.site_settings%rowtype; r record; itm jsonb;
 v_id uuid; v_product public.products%rowtype; v_batch public.stock_batches%rowtype;
 v_mode text; v_qty int; v_batch_id uuid; v_total int:=0; v_discount int:=0; v_delivery int:=0;
 v_count int; v_promo public.promotions%rowtype; v_match boolean; v_item_ids uuid[]:=array[]::uuid[];
 v_zip text; v_today date:=(now() at time zone 'America/Chicago')::date;
begin
 if p_method not in ('pickup','delivery') or p_date < v_today or length(p_email)>254 or p_email !~ '^[^ @]+@[^ @]+\.[^ @]+$' or p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 40 then raise exception 'Invalid checkout'; end if;
 select * into cfg from public.site_settings where id=1;
 if not cfg.checkout_enabled then raise exception 'Checkout has not been enabled by the owner'; end if;
 if p_method='pickup' and not cfg.pickup_enabled then raise exception 'Pickup unavailable'; end if;
 if p_method='delivery' and not cfg.delivery_enabled then raise exception 'Delivery unavailable'; end if;
 select * into d from public.baking_days where date=p_date and enabled for update;
 if not found or d.cutoff_at<=now() or (p_method='pickup' and (not d.pickup_enabled or not p_window=any(d.pickup_windows))) or
  (p_method='delivery' and (not d.delivery_enabled or not p_window=any(d.delivery_windows))) then raise exception 'Fulfillment date or window unavailable'; end if;
 if p_method='delivery' then
 v_zip:=p_address->>'zip';
 if v_zip is null or not(v_zip=any(cfg.delivery_zips)) then raise exception 'Delivery not offered to that ZIP code'; end if;
 if coalesce(p_address->>'street','')='' or coalesce(p_address->>'city','')='' then raise exception 'Complete delivery address is required'; end if;
 v_delivery:=cfg.delivery_fee_cents;
 end if;
 -- Lock product records consistently to avoid deadlocks with concurrent orders.
 for r in select distinct (x->>'product_id')::uuid as product_id from jsonb_array_elements(p_items) x order by 1 loop
 perform 1 from public.products where id=r.product_id for update;
 end loop;
 select coalesce(sum(oi.quantity),0) into v_count from public.order_items oi join public.orders o on o.id=oi.order_id where o.fulfillment_date=p_date and oi.mode='preorder' and o.payment_status in ('pending','paid') and o.reservation_released=false;
 if v_count + (select coalesce(sum((x->>'quantity')::int),0) from jsonb_array_elements(p_items) x where x->>'mode'='preorder') > d.capacity_total then raise exception 'Baking day has reached its capacity'; end if;
 insert into public.orders(customer_id,email,customer_name,phone,fulfillment_method,fulfillment_date,fulfillment_window,delivery_address,note,guest_token_hash,reservation_expires_at,delivery_cents)
 values(p_user_id,lower(trim(p_email)),left(p_name,120),left(p_phone,50),p_method,p_date,p_window,p_address,left(p_note,1000),p_guest_hash,now()+interval '30 minutes',v_delivery) returning id into v_id;
 for itm in select * from jsonb_array_elements(p_items) loop
 v_mode:=itm->>'mode'; v_qty:=(itm->>'quantity')::int; v_batch_id:=nullif(itm->>'batch_id','')::uuid;
 if v_qty<1 or v_qty>30 or v_mode not in ('ready','preorder') then raise exception 'Invalid item quantity/mode'; end if;
 select * into v_product from public.products where id=(itm->>'product_id')::uuid and published;
 if not found or (v_mode='ready' and v_product.mode not in ('ready','both')) or (v_mode='preorder' and v_product.mode not in ('preorder','both')) then raise exception 'Item unavailable'; end if;
 if v_mode='ready' then
 select * into v_batch from public.stock_batches where id=v_batch_id and product_id=v_product.id and not disabled and best_before>=p_date and quantity_available>=v_qty and baked_on<=v_today for update;
 if not found then raise exception 'Ready-to-sell stock is unavailable'; end if;
 update public.stock_batches set quantity_available=quantity_available-v_qty where id=v_batch_id;
 else
 if p_date<(v_today+v_product.lead_days) then raise exception 'Item lead time is not met'; end if;
 select max_quantity into v_count from public.product_day_limits where product_id=v_product.id and baking_date=p_date;
 if found and (select coalesce(sum(oi.quantity),0) from public.order_items oi join public.orders o on o.id=oi.order_id where oi.product_id=v_product.id and o.fulfillment_date=p_date and oi.mode='preorder' and o.payment_status in ('paid','pending') and o.reservation_released=false)+v_qty>v_count then raise exception 'Product capacity reached'; end if;
 end if;
 insert into public.order_items(order_id,product_id,batch_id,product_name,quantity,mode,unit_price_cents)
 values(v_id,v_product.id,case when v_mode='ready' then v_batch_id else null end,v_product.name,v_qty,v_mode,v_product.price_cents);
 v_total:=v_total+v_product.price_cents*v_qty;
 v_item_ids:=array_append(v_item_ids,v_product.id);
 end loop;
 if p_code is not null and trim(p_code)<>'' then
 select * into v_promo from public.promotions where lower(code)=lower(trim(p_code)) and published and starts_at<=now() and ends_at>now() for update;
 if not found then raise exception 'Promo code invalid or expired'; end if;
 if v_promo.max_uses is not null and v_promo.uses>=v_promo.max_uses then raise exception 'Promo has reached its usage limit'; end if;
 if v_promo.audience='selected' and (p_user_id is null or not exists(select 1 from public.promotion_recipients where promotion_id=v_promo.id and customer_id=p_user_id)) then raise exception 'Promotion is not assigned to this customer'; end if;
 if v_promo.audience='returning' and (p_user_id is null or not exists(select 1 from public.orders where customer_id=p_user_id and payment_status='paid')) then raise exception 'Promotion is for returning customers'; end if;
 if v_total<v_promo.min_subtotal_cents then raise exception 'Minimum order value not met'; end if;
 select exists(select 1 from public.order_items oi join public.products p on p.id=oi.product_id where oi.order_id=v_id and
 (v_promo.scope='all' or (v_promo.scope='products' and oi.product_id=any(v_promo.scope_ids)) or (v_promo.scope='categories' and p.category_id=any(v_promo.scope_ids)) or (v_promo.scope='batches' and oi.batch_id=any(v_promo.scope_ids)))) into v_match;
 if not v_match then raise exception 'Promotion does not apply to these items'; end if;
 if v_promo.scope='batches' and exists(select 1 from public.order_items oi join public.stock_batches b on b.id=oi.batch_id where oi.order_id=v_id and oi.batch_id=any(v_promo.scope_ids) and not b.clearance_approved) then raise exception 'Owner must approve the clearance batch before discounting it'; end if;
 select coalesce(sum(oi.quantity*oi.unit_price_cents),0) into v_count from public.order_items oi join public.products p on p.id=oi.product_id where oi.order_id=v_id and
 (v_promo.scope='all' or (v_promo.scope='products' and oi.product_id=any(v_promo.scope_ids)) or (v_promo.scope='categories' and p.category_id=any(v_promo.scope_ids)) or (v_promo.scope='batches' and oi.batch_id=any(v_promo.scope_ids)));
 v_discount:=least(v_count,case when v_promo.kind='percent' then round(v_count*v_promo.value/100.0)::int else v_promo.value end,coalesce(v_promo.max_discount_cents,2147483647));
 update public.promotions set uses=uses+1 where id=v_promo.id;
 end if;
 update public.orders set subtotal_cents=v_total,discount_cents=v_discount, total_cents=v_total-v_discount+v_delivery,promotion_id=v_promo.id where id=v_id;
 return jsonb_build_object('order_id',v_id,'amount_cents',v_total-v_discount+v_delivery);
end $$;

create or replace function public.release_checkout(p_order_id uuid,p_reason text default 'expired') returns void language plpgsql set search_path='' as $$
declare o public.orders%rowtype; r record;
begin
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.reservation_released or o.payment_status='paid' then return; end if;
 for r in select batch_id,quantity from public.order_items where order_id=p_order_id and batch_id is not null loop
 update public.stock_batches set quantity_available=quantity_available+r.quantity where id=r.batch_id;
 end loop;
 if o.promotion_id is not null then update public.promotions set uses=greatest(uses-1,0) where id=o.promotion_id; end if;
 update public.orders set payment_status=case when p_reason='failed' then 'failed' else 'expired' end,reservation_released=true,status='cancelled' where id=p_order_id;
end $$;

create or replace function public.complete_checkout(p_order_id uuid,p_session_id text,p_paid_total int,p_tax int) returns void language plpgsql set search_path='' as $$
declare o public.orders%rowtype;
begin
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.reservation_released then raise exception 'Order reservation invalid or expired'; end if;
 if o.payment_status='paid' then return; end if;
 if o.payment_status<>'pending' then raise exception 'Order cannot be paid'; end if;
 if p_paid_total<o.total_cents or p_tax<0 then raise exception 'Payment total insufficient'; end if;
 update public.orders set payment_status='paid',status='new',checkout_session_id=p_session_id,tax_cents=p_tax,total_cents=p_paid_total where id=p_order_id;
 insert into public.order_events(order_id,event,detail) values(p_order_id,'payment_confirmed','Confirmed by Stripe webhook');
end $$;
revoke all on function public.reserve_checkout(jsonb,date,text,text,text,text,text,uuid,jsonb,text,text,text) from public,anon,authenticated;
revoke all on function public.release_checkout(uuid,text) from public,anon,authenticated;
revoke all on function public.complete_checkout(uuid,text,int,int) from public,anon,authenticated;
grant execute on function public.reserve_checkout(jsonb,date,text,text,text,text,text,uuid,jsonb,text,text,text),public.release_checkout(uuid,text),public.complete_checkout(uuid,text,int,int) to service_role;

-- Admin-triggered reservation cleanup. A scheduled maintenance task can invoke this endpoint later.
create or replace function public.expire_stale_checkouts() returns int language plpgsql set search_path='' as $$
declare r record; n int:=0;
begin
 for r in select id from public.orders where payment_status='pending' and reservation_released=false
   and reservation_expires_at<now() for update skip locked loop
   perform public.release_checkout(r.id,'expired'); n:=n+1;
 end loop;
 return n;
end $$;
revoke all on function public.expire_stale_checkouts() from public,anon,authenticated;
grant execute on function public.expire_stale_checkouts() to service_role;

-- Notifications are created by triggers when incoming messages, reviews, orders, and order statuses change.
create or replace function private.notify_staff(p_kind text,p_title text,p_body text) returns void language plpgsql security definer set search_path='' as $$
begin insert into public.notifications(customer_id,kind,title,body)
 select user_id,p_kind,p_title,left(p_body,500) from public.staff_roles where role in ('owner','admin'); end $$;
create or replace function private.notify_inbox_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='messages' and new.is_staff_reply=false then perform private.notify_staff('message','New customer message',new.subject);
 elsif tg_table_name='messages' and new.is_staff_reply=true and new.customer_id is not null then
 insert into public.notifications(customer_id,kind,title,body) values(new.customer_id,'message','Bakery replied to your message',new.subject);
 elsif tg_table_name='reviews' then perform private.notify_staff('review','Review awaiting moderation','A customer submitted a review');
 elsif tg_table_name='orders' and new.payment_status='paid' then perform private.notify_staff('order','Paid order received','A new order requires review');
 end if; return new; end $$;
create trigger message_notice after insert on public.messages for each row execute function private.notify_inbox_event();
create trigger review_notice after insert on public.reviews for each row execute function private.notify_inbox_event();
create trigger order_paid_notice after update of payment_status on public.orders for each row when(new.payment_status='paid') execute function private.notify_inbox_event();
create or replace function private.order_status_notice() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.status is distinct from old.status and new.customer_id is not null then
 insert into public.notifications(customer_id,kind,title,body) values(new.customer_id,'order','Order status updated','Your order '||left(new.id::text,8)||' is now '||new.status);
 end if; return new; end $$;
create trigger order_changed_notice after update of status on public.orders for each row execute function private.order_status_notice();

-- Owner-only promotion marketing inbox delivery, requiring opt-in and recipient eligibility.
create or replace function public.deliver_promotion(p_promo_id uuid) returns int language plpgsql security definer set search_path='' as $$
declare n int;
begin
 if not exists(select 1 from public.staff_roles where user_id=auth.uid() and role in ('owner','admin')) then raise exception 'Admin required'; end if;
 if not exists(select 1 from public.promotions where id=p_promo_id and published and starts_at<=now() and ends_at>now()) then raise exception 'Promotion not active'; end if;
 insert into public.notifications(customer_id,kind,title,body,promotion_id)
 select cp.id,'marketing',p.title,'A bakery promotion is available in your account.',p.id
 from public.customer_profiles cp cross join public.promotions p
 where p.id=p_promo_id and cp.marketing_opt_in and
 (p.audience='all' or (p.audience='selected' and exists(select 1 from public.promotion_recipients x where x.promotion_id=p.id and x.customer_id=cp.id)) or
 (p.audience='returning' and exists(select 1 from public.orders o where o.customer_id=cp.id and o.payment_status='paid')))
 on conflict do nothing;
 get diagnostics n=row_count; return n;
end $$;
revoke all on function public.deliver_promotion(uuid) from public,anon;
grant execute on function public.deliver_promotion(uuid) to authenticated;
-- Owner setup after creating their Supabase Auth account:
-- INSERT INTO public.staff_roles(user_id, role) VALUES ('YOUR-AUTH-USER-UUID', 'owner');
-- Then use Admin to set store content, delivery ZIPs, pickup dates, and finally checkout_enabled.
