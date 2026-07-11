-- Platform hardening: RLS helper performance, safer self-updates, private receipt
-- paths, indexes for common RLS/join filters, and aggregate RPCs for admin screens.

create or replace function public.get_user_role()
returns user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.users where id = (select auth.uid());
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'), false);
$$;

create or replace function public.prevent_unsafe_user_self_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if old.id = (select auth.uid()) and coalesce(public.get_user_role()::text, '') <> 'ADMIN' then
    if new.id is distinct from old.id
      or new.role is distinct from old.role
      or new.email is distinct from old.email
      or new.phone is distinct from old.phone
      or new.created_at is distinct from old.created_at then
      raise exception 'Only profile preferences and media can be updated by the account owner';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_unsafe_user_self_update on public.users;
create trigger prevent_unsafe_user_self_update
  before update on public.users
  for each row execute function public.prevent_unsafe_user_self_update();

drop policy if exists "users_self_update" on public.users;
create policy "users_self_update" on public.users
  for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create or replace function public.prevent_unsafe_payment_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() = 'service_role' or coalesce(public.get_user_role()::text, '') in ('ADMIN', 'FINANCE') then
    return new;
  end if;

  if old.user_id = (select auth.uid()) then
    if new.id is distinct from old.id
      or new.order_id is distinct from old.order_id
      or new.user_id is distinct from old.user_id
      or new.method is distinct from old.method
      or new.amount is distinct from old.amount
      or new.currency is distinct from old.currency
      or new.transaction_reference is distinct from old.transaction_reference
      or new.bank_name is distinct from old.bank_name
      or new.sender_name is distinct from old.sender_name
      or new.transferred_at is distinct from old.transferred_at
      or new.ai_confidence_score is distinct from old.ai_confidence_score
      or new.ai_extracted_data is distinct from old.ai_extracted_data
      or new.reviewed_by_user_id is distinct from old.reviewed_by_user_id
      or new.reviewed_at is distinct from old.reviewed_at
      or new.rejection_reason is distinct from old.rejection_reason
      or new.created_at is distinct from old.created_at then
      raise exception 'Customers can only submit receipt proof for their own payment';
    end if;

    if new.verification_status not in ('PENDING', 'REQUIRES_REVIEW') then
      raise exception 'Customers cannot verify or reject payments';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_unsafe_payment_update on public.payments;
create trigger prevent_unsafe_payment_update
  before update on public.payments
  for each row execute function public.prevent_unsafe_payment_update();

-- Keep policy shape compatible with existing client writes; trigger above enforces columns.
drop policy if exists "payments_customer_update_receipt" on public.payments;
create policy "payments_customer_update_receipt" on public.payments for update
  using (user_id = (select auth.uid()) or public.get_user_role() in ('ADMIN', 'FINANCE'))
  with check (user_id = (select auth.uid()) or public.get_user_role() in ('ADMIN', 'FINANCE'));

-- Public visitor writes are intentionally open, but bound payload size to reduce abuse.
drop policy if exists "visitor_events_insert_all" on public.visitor_events;
create policy "visitor_events_insert_all" on public.visitor_events
  for insert to anon, authenticated
  with check (
    length(coalesce(path, '')) <= 300
    and length(coalesce(label, '')) <= 300
    and octet_length(coalesce(metadata::text, '{}')) <= 4096
  );

create or replace function public.submit_guest_receipt(
  p_order_number text,
  p_customer_phone text,
  p_access_token text,
  p_receipt_path text,
  p_receipt_url text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_payment_id uuid;
  v_expected_prefix text;
begin
  select id
    into v_order_id
  from public.orders
  where upper(order_number) = upper(trim(p_order_number))
    and public.normalize_order_phone(customer_phone) = public.normalize_order_phone(p_customer_phone)
    and guest_access_token_hash = public.hash_guest_token(p_access_token)
  limit 1;

  if v_order_id is null then
    raise exception 'Order not found or access token expired';
  end if;

  v_expected_prefix := 'guest/' || v_order_id::text || '/' || p_access_token || '/';
  if p_receipt_path is null or p_receipt_path not like (v_expected_prefix || '%') then
    raise exception 'Invalid receipt path';
  end if;

  if p_receipt_path like '%..%' or p_receipt_path like '%//%' then
    raise exception 'Invalid receipt path';
  end if;

  if not exists (
    select 1
    from storage.objects
    where bucket_id = 'receipts'
      and name = p_receipt_path
  ) then
    raise exception 'Receipt upload was not found';
  end if;

  select id into v_payment_id
  from public.payments
  where order_id = v_order_id
    and method <> 'CASH_ON_DELIVERY'
  order by created_at
  limit 1;

  if v_payment_id is null then
    raise exception 'This order does not require a payment receipt';
  end if;

  update public.payments
  set receipt_image_url = p_receipt_path,
      verification_status = 'REQUIRES_REVIEW'
  where id = v_payment_id;

  update public.orders
  set payment_status = 'REQUIRES_REVIEW',
      status = 'PAYMENT_REVIEW'
  where id = v_order_id;

  return true;
end;
$$;

-- Indexes for FK joins, RLS filters, and admin queues.
create index if not exists addresses_user_idx on public.addresses (user_id);
create index if not exists carts_user_idx on public.carts (user_id);
create index if not exists carts_session_idx on public.carts (session_id) where session_id is not null;
create index if not exists cart_items_cart_idx on public.cart_items (cart_id);
create index if not exists cart_items_book_idx on public.cart_items (book_id);
create index if not exists cart_items_bookstore_idx on public.cart_items (bookstore_id);
create index if not exists order_items_book_idx on public.order_items (book_id);
create index if not exists order_items_bookstore_idx on public.order_items (bookstore_id);
create index if not exists payments_user_idx on public.payments (user_id);
create index if not exists payments_created_idx on public.payments (created_at desc);
create index if not exists notifications_user_idx on public.notifications (user_id);
create index if not exists search_logs_user_idx on public.search_logs (user_id);
create index if not exists search_logs_created_idx on public.search_logs (created_at desc);
create index if not exists recommendations_book_idx on public.recommendations (book_id);
create index if not exists visitor_events_created_desc_idx on public.visitor_events (created_at desc);
create index if not exists visitor_events_page_views_idx on public.visitor_events (created_at desc, visitor_id)
  where event_type = 'page_view';
create index if not exists premium_payments_subscription_idx on public.premium_payments (subscription_id, created_at desc);
create index if not exists premium_payments_plan_idx on public.premium_payments (plan_id);
create index if not exists premium_challenge_completions_user_idx on public.premium_challenge_completions (user_id);
create index if not exists premium_challenge_completions_motivation_idx on public.premium_challenge_completions (motivation_id);
create index if not exists premium_activity_members_user_idx on public.premium_activity_members (user_id);

create or replace function public.get_admin_dashboard_stats()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with allowed as (
    select public.get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE') as ok
  ),
  orders_base as (
    select *
    from public.orders
    where (select ok from allowed)
  ),
  payments_base as (
    select p.*
    from public.payments p
    where (select ok from allowed)
  ),
  active_orders as (
    select * from orders_base where status <> 'CANCELLED'
  ),
  status_counts as (
    select status::text as status, count(*)::int as count
    from orders_base
    group by status
  )
  select case
    when not (select ok from allowed) then
      jsonb_build_object('error', 'not_authorized')
    else
      jsonb_build_object(
        'gmv', coalesce((select sum(total_amount) from active_orders), 0),
        'revenue', coalesce((
          select sum(p.amount)
          from payments_base p
          join orders_base o on o.id = p.order_id
          where p.verification_status = 'VERIFIED' and o.status <> 'CANCELLED'
        ), 0),
        'pendingPayments', coalesce((select count(*) from payments_base where verification_status = 'PENDING'), 0),
        'pendingDeliveries', coalesce((
          select count(*) from orders_base where status in ('PROCESSING', 'PURCHASING_FROM_BOOKSTORE')
        ), 0),
        'totalOrders', coalesce((select count(*) from orders_base), 0),
        'statusBreakdown', coalesce((
          select jsonb_agg(jsonb_build_object('status', status, 'count', count))
          from status_counts
        ), '[]'::jsonb)
      )
    end;
$$;

create or replace function public.get_admin_analytics_summary()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with allowed as (
    select public.get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE') as ok
  ),
  orders_base as (
    select *
    from public.orders
    where (select ok from allowed)
  ),
  payments_base as (
    select *
    from public.payments
    where (select ok from allowed)
  ),
  items_base as (
    select oi.*, b.title, bs.name as bookstore_name
    from public.order_items oi
    left join public.books b on b.id = oi.book_id
    left join public.bookstores bs on bs.id = oi.bookstore_id
    where (select ok from allowed)
  ),
  monthly as (
    select to_char(date_trunc('month', created_at), 'Mon') as month,
           date_trunc('month', created_at) as month_start,
           sum(total_amount)::numeric as total
    from orders_base
    where created_at >= date_trunc('month', now()) - interval '5 months'
    group by 1, 2
    order by month_start
  ),
  store_margins as (
    select bookstore_id,
           coalesce(bookstore_name, bookstore_id::text) as name,
           sum(final_price * quantity * (margin_percent / 100) / (1 + margin_percent / 100))::numeric as margin,
           sum(quantity)::int as count
    from items_base
    group by bookstore_id, bookstore_name
    order by margin desc
    limit 10
  ),
  top_books as (
    select book_id,
           coalesce(title, book_id::text) as title,
           sum(quantity)::int as qty
    from items_base
    group by book_id, title
    order by qty desc
    limit 5
  )
  select case
    when not (select ok from allowed) then
      jsonb_build_object('error', 'not_authorized')
    else
      jsonb_build_object(
        'gmv', coalesce((select sum(total_amount) from orders_base), 0),
        'revenue', coalesce((select sum(amount) from payments_base where verification_status = 'VERIFIED'), 0),
        'grossMargin', coalesce((
          select sum(final_price * quantity * (margin_percent / 100) / (1 + margin_percent / 100)) from items_base
        ), 0),
        'avgOrderValue', coalesce((select avg(total_amount) from orders_base), 0),
        'totalCustomers', coalesce((
          select count(distinct public.normalize_order_phone(customer_phone)) from orders_base
        ), 0),
        'monthlyData', coalesce((
          select jsonb_agg(jsonb_build_object('month', month, 'total', total) order by month_start) from monthly
        ), '[]'::jsonb),
        'storeMargins', coalesce((
          select jsonb_agg(jsonb_build_object('name', name, 'margin', margin, 'count', count)) from store_margins
        ), '[]'::jsonb),
        'topBooks', coalesce((
          select jsonb_agg(jsonb_build_object('title', title, 'qty', qty)) from top_books
        ), '[]'::jsonb)
      )
    end;
$$;

create or replace function public.get_admin_visitor_tracking_events(p_days integer default 400)
returns table (
  event_type text,
  path text,
  label text,
  visitor_id uuid,
  metadata jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select ve.event_type, ve.path, ve.label, ve.visitor_id, ve.metadata, ve.created_at
  from public.visitor_events ve
  where public.get_user_role() in ('ADMIN', 'OPERATIONS')
    and ve.created_at >= now() - make_interval(days => least(greatest(coalesce(p_days, 400), 1), 400))
  order by ve.created_at asc
  limit 20000;
$$;

revoke all on function public.get_admin_dashboard_stats() from public, anon;
revoke all on function public.get_admin_analytics_summary() from public, anon;
revoke all on function public.get_admin_visitor_tracking_events(integer) from public, anon;
grant execute on function public.get_admin_dashboard_stats() to authenticated;
grant execute on function public.get_admin_analytics_summary() to authenticated;
grant execute on function public.get_admin_visitor_tracking_events(integer) to authenticated;
