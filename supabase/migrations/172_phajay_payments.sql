-- PhaJay QR payments (BCEL One, kip only) for the three things Bitdoin takes money for:
--   shop_order     a bookstore order            (payments, orders; checked with order number + phone)
--   premium        an Academy Premium plan      (premium_payments, premium_subscriptions; the signed-in member)
--   career_report  the one-time career report   (academic_report_purchases; the signed-in buyer)
--
-- The customer pays a dynamic QR for the exact amount owed. PhaJay tells us it was paid in two ways: a
-- signed webhook (phajay-webhook) and a status check made while the customer's payment screen is open
-- (phajay-checkout). Both end in phajay_settle(), so the payment is applied exactly once whichever
-- arrives first, and only for a transaction we created ourselves, at the amount we asked for. Applying
-- it does what the admin's Verify / Approve button does for that kind, and nothing else.
--
-- Everything here is for the Edge Functions (service role). No customer or staff role can read or
-- change it directly.

create table if not exists public.phajay_transactions (
  transaction_id text primary key,
  kind           text not null check (kind in ('shop_order', 'premium', 'career_report')),
  -- payments.id, premium_payments.id or academic_report_purchases.id, by kind.
  subject_id     uuid not null,
  bank           text not null default 'BCEL',
  amount         numeric(12,2) not null check (amount > 0),
  currency       text not null default 'LAK' check (currency = 'LAK'),
  qr_code        text not null,
  link           text,
  -- WAITING, PAYMENT_COMPLETED, EXPIRED, REFUNDED or DISPUTED, as PhaJay reports it.
  status         text not null default 'WAITING',
  created_at     timestamptz not null default now(),
  paid_at        timestamptz,
  -- Set only when the payment was applied (order verified, membership started, report granted).
  settled_at     timestamptz,
  -- Why a payment that PhaJay confirmed was not applied (see phajay_settle). Needs a human.
  note           text
);

create index if not exists phajay_transactions_subject_idx on public.phajay_transactions (kind, subject_id, created_at desc);

-- One live QR per payment: asking again returns it instead of opening another.
create unique index if not exists phajay_transactions_one_waiting_idx
  on public.phajay_transactions (kind, subject_id) where status = 'WAITING';

alter table public.phajay_transactions enable row level security;
revoke all on public.phajay_transactions from anon, authenticated;

-- ─── Who may pay what ────────────────────────────────────────────────────────
-- Each resolver returns null (nothing to pay) or
--   { kind, subject_id, label, amount, currency, state }
-- label: a short ASCII reference BCEL shows to the payer. amount: whole kip.
-- state: payable | paid | closed (cannot be paid by QR now) | unsupported_currency.

-- A shop order is paid by whoever has the order number and the phone it was placed with, the same
-- proof the tracking page asks for.
create or replace function public.phajay_resolve_order(p_order_number text, p_customer_phone text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_payment public.payments;
  v_state text;
begin
  if length(public.normalize_order_phone(p_customer_phone)) < 8 then
    return null;
  end if;

  select * into v_order
  from public.orders
  where upper(order_number) = upper(trim(p_order_number))
    and public.normalize_order_phone(customer_phone) = public.normalize_order_phone(p_customer_phone)
  limit 1;
  if v_order.id is null then
    return null;
  end if;

  -- The tracking page and checkout both show the first payment of the order.
  select * into v_payment from public.payments where order_id = v_order.id order by created_at limit 1;
  if v_payment.id is null then
    return null;
  end if;

  v_state := case
    when v_payment.verification_status = 'VERIFIED' then 'paid'
    when v_payment.method <> 'QR_PAYMENT'
      or v_payment.verification_status = 'REFUNDED'
      or v_order.status not in ('PENDING_PAYMENT', 'PAYMENT_REVIEW') then 'closed'
    -- PhaJay takes kip only; a dollar order stays on the bank-transfer flow.
    when v_order.currency <> 'LAK' then 'unsupported_currency'
    when round(v_order.total_amount) < 1 then 'closed'
    else 'payable'
  end;

  return jsonb_build_object(
    'kind', 'shop_order', 'subject_id', v_payment.id, 'label', v_order.order_number,
    'amount', round(v_order.total_amount), 'currency', v_order.currency, 'state', v_state
  );
end;
$$;

-- The signed-in member's latest Premium request.
create or replace function public.phajay_resolve_premium(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_subscription public.premium_subscriptions;
  v_payment public.premium_payments;
  v_state text;
begin
  select * into v_subscription from public.premium_subscriptions
  where user_id = p_user_id order by created_at desc limit 1;
  if v_subscription.id is null then
    return null;
  end if;

  select * into v_payment from public.premium_payments
  where subscription_id = v_subscription.id order by created_at desc limit 1;
  if v_payment.id is null then
    return null;
  end if;

  v_state := case
    when v_payment.status = 'VERIFIED' then 'paid'
    when v_subscription.status not in ('PENDING_PAYMENT', 'PAYMENT_REVIEW') or v_payment.status = 'REFUNDED' then 'closed'
    when v_payment.currency <> 'LAK' then 'unsupported_currency'
    when v_payment.amount_lak < 1 then 'closed'
    else 'payable'
  end;

  return jsonb_build_object(
    'kind', 'premium', 'subject_id', v_payment.id, 'label', 'PRM-' || upper(left(v_payment.id::text, 8)),
    'amount', v_payment.amount_lak, 'currency', v_payment.currency, 'state', v_state
  );
end;
$$;

-- The signed-in buyer's latest career report purchase.
create or replace function public.phajay_resolve_report(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.academic_report_purchases;
  v_state text;
begin
  select * into v_purchase from public.academic_report_purchases
  where user_id = p_user_id order by created_at desc limit 1;
  if v_purchase.id is null then
    return null;
  end if;

  v_state := case
    when v_purchase.status = 'verified' then 'paid'
    when v_purchase.status not in ('pending', 'review') or v_purchase.amount_lak < 1 then 'closed'
    else 'payable'
  end;

  return jsonb_build_object(
    'kind', 'career_report', 'subject_id', v_purchase.id, 'label', 'RPT-' || upper(left(v_purchase.id::text, 8)),
    'amount', v_purchase.amount_lak, 'currency', 'LAK', 'state', v_state
  );
end;
$$;

-- ─── QR codes ────────────────────────────────────────────────────────────────

-- The newest QR made for a payment, whatever its status, or null.
create or replace function public.phajay_latest_transaction(p_kind text, p_subject_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select to_jsonb(t)
  from (
    select transaction_id, amount, qr_code, link, status, settled_at, note
    from public.phajay_transactions
    where kind = p_kind and subject_id = p_subject_id
    order by created_at desc
    limit 1
  ) t
$$;

-- Keeps a QR that was just made at PhaJay. False when the payment already has a live one, which means
-- two payment screens raced; the caller then shows the live one.
create or replace function public.phajay_record_qr(
  p_kind text, p_subject_id uuid, p_transaction_id text, p_amount numeric, p_qr_code text, p_link text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.phajay_transactions (transaction_id, kind, subject_id, amount, qr_code, link)
  values (p_transaction_id, p_kind, p_subject_id, p_amount, p_qr_code, p_link);
  return true;
exception when unique_violation then
  return false;
end;
$$;

-- PhaJay reports the QR can no longer be paid (EXPIRED, ...). Only a QR still waiting changes, so a
-- confirmed payment is never overwritten.
create or replace function public.phajay_set_status(p_transaction_id text, p_status text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.phajay_transactions set status = p_status
  where transaction_id = p_transaction_id and status = 'WAITING'
$$;

-- ─── Applying a confirmed payment ────────────────────────────────────────────
-- Each returns null once it has applied the payment, or the reason it did not (and changed nothing):
--   order_changed      what is owed is no longer what the QR was made for
--   order_not_payable  cancelled, withdrawn, or already paid some other way

-- Same two writes as the admin's Verify button (src/pages/admin/Payments.tsx).
create or replace function public.phajay_apply_order(p_tx public.phajay_transactions, p_paid_at timestamptz)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.payments;
  v_order public.orders;
begin
  select * into v_payment from public.payments where id = p_tx.subject_id for update;
  if v_payment.id is null then
    return 'order_not_payable';
  end if;
  select * into v_order from public.orders where id = v_payment.order_id for update;

  if v_order.currency <> 'LAK' or p_tx.amount <> round(v_order.total_amount) then
    return 'order_changed';
  end if;
  if v_order.status not in ('PENDING_PAYMENT', 'PAYMENT_REVIEW')
     or v_payment.verification_status in ('VERIFIED', 'REFUNDED') then
    return 'order_not_payable';
  end if;

  update public.payments
  set verification_status = 'VERIFIED',
      reviewed_at = now(),
      transaction_reference = p_tx.transaction_id,
      bank_name = p_tx.bank,
      transferred_at = p_paid_at,
      rejection_reason = null
  where id = v_payment.id;

  update public.orders
  set payment_status = 'VERIFIED', status = 'PROCESSING'
  where id = v_order.id;

  insert into public.audit_logs (entity, entity_id, action, old_value, new_value)
  values (
    'payment', v_payment.id, 'PAYMENT_VERIFIED',
    jsonb_build_object('status', v_payment.verification_status),
    jsonb_build_object('status', 'VERIFIED', 'order_id', v_order.id, 'amount', p_tx.amount,
                       'provider', 'phajay', 'transaction_id', p_tx.transaction_id)
  );
  return null;
end;
$$;

-- Same as the admin's approval (review_premium_subscription_request, migration 072): the payment is
-- verified, the membership starts now and replaces any other open one, and the member joins the
-- activity group. One difference on purpose: the admin's button always gives 30 days, even for a
-- yearly plan; here a yearly plan lasts a year, because that is what was paid for.
create or replace function public.phajay_apply_premium(p_tx public.phajay_transactions, p_paid_at timestamptz)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.premium_payments;
  v_subscription public.premium_subscriptions;
  v_plan public.premium_plans;
  v_now timestamptz := now();
begin
  select * into v_payment from public.premium_payments where id = p_tx.subject_id for update;
  if v_payment.id is null then
    return 'order_not_payable';
  end if;
  select * into v_subscription from public.premium_subscriptions where id = v_payment.subscription_id for update;
  select * into v_plan from public.premium_plans where id = v_subscription.plan_id;

  if v_payment.currency <> 'LAK' or p_tx.amount <> v_payment.amount_lak then
    return 'order_changed';
  end if;
  if v_subscription.status not in ('PENDING_PAYMENT', 'PAYMENT_REVIEW')
     or v_payment.status in ('VERIFIED', 'REFUNDED') then
    return 'order_not_payable';
  end if;

  update public.premium_payments
  set status = 'VERIFIED',
      reviewed_at = v_now,
      reference = p_tx.transaction_id,
      notes = 'Paid by BCEL One QR through PhaJay',
      rejection_reason = null
  where id = v_payment.id;

  update public.premium_subscriptions
  set status = 'ACTIVE',
      starts_at = v_now,
      ends_at = v_now + case when v_plan.interval = 'year' then interval '1 year' else interval '30 days' end,
      cancelled_at = null,
      reviewed_at = v_now,
      rejection_reason = null
  where id = v_subscription.id;

  update public.premium_subscriptions
  set status = 'CANCELLED',
      cancelled_at = v_now,
      rejection_reason = 'Superseded by a newer subscription request.'
  where user_id = v_subscription.user_id
    and id <> v_subscription.id
    and status not in ('CANCELLED', 'EXPIRED');

  insert into public.premium_activity_members (user_id, subscription_id, approved_by_user_id, approved_at, is_active)
  values (v_subscription.user_id, v_subscription.id, null, v_now, true)
  on conflict (user_id) do update
  set subscription_id = excluded.subscription_id,
      approved_by_user_id = excluded.approved_by_user_id,
      approved_at = excluded.approved_at,
      is_active = true;

  insert into public.audit_logs (entity, entity_id, action, old_value, new_value)
  values (
    'premium_payment', v_payment.id, 'PAYMENT_VERIFIED',
    jsonb_build_object('status', v_payment.status),
    jsonb_build_object('status', 'VERIFIED', 'subscription_id', v_subscription.id, 'amount', p_tx.amount,
                       'provider', 'phajay', 'transaction_id', p_tx.transaction_id)
  );
  return null;
end;
$$;

-- Same as academic_admin_review_report_purchase (migration 157) with action 'verify': the purchase is
-- verified and the buyer gets 'career_report' for the number of months the report price setting says.
create or replace function public.phajay_apply_report(p_tx public.phajay_transactions, p_paid_at timestamptz)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.academic_report_purchases;
  v_grant uuid;
begin
  select * into v_purchase from public.academic_report_purchases where id = p_tx.subject_id for update;
  if v_purchase.id is null then
    return 'order_not_payable';
  end if;

  if p_tx.amount <> v_purchase.amount_lak then
    return 'order_changed';
  end if;
  if v_purchase.status not in ('pending', 'review') then
    return 'order_not_payable';
  end if;

  insert into public.academic_entitlement_grants (user_id, feature_code, source, reason_code, note, reference, amount_lak, ends_at, granted_by)
  values (
    v_purchase.user_id, 'career_report', 'one_time_purchase', 'one_time_purchase', 'Career report purchase (PhaJay)',
    p_tx.transaction_id, v_purchase.amount_lak,
    now() + make_interval(months => coalesce((public.academic_setting('career_report_price')->>'months')::integer, 12)),
    null
  )
  returning id into v_grant;

  update public.academic_report_purchases
  set status = 'verified', reference = p_tx.transaction_id, grant_id = v_grant,
      reviewed_by = null, reviewed_at = now(), updated_at = now()
  where id = v_purchase.id;

  insert into public.audit_logs (entity, entity_id, action, old_value, new_value)
  values (
    'report_purchase', v_purchase.id, 'PAYMENT_VERIFIED',
    jsonb_build_object('status', v_purchase.status),
    jsonb_build_object('status', 'verified', 'grant_id', v_grant, 'amount', p_tx.amount,
                       'provider', 'phajay', 'transaction_id', p_tx.transaction_id)
  );
  return null;
end;
$$;

-- PhaJay says transaction p_transaction_id was paid. Apply it, once.
--
-- result: settled | already_settled | unknown_transaction, or a reason the money arrived but was NOT
-- applied: amount_mismatch (PhaJay's amount is not the one we asked for), order_changed or
-- order_not_payable (see above). Those are written to audit_logs as PHAJAY_PAYMENT_UNAPPLIED, and the
-- transaction keeps the reason in note, for a person to refund or fix.
create or replace function public.phajay_settle(p_transaction_id text, p_amount numeric, p_paid_at timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tx public.phajay_transactions;
  v_paid_at timestamptz := coalesce(p_paid_at, now());
  v_problem text;
begin
  select * into v_tx from public.phajay_transactions where transaction_id = p_transaction_id for update;
  if v_tx.transaction_id is null then
    return jsonb_build_object('result', 'unknown_transaction');
  end if;
  if v_tx.settled_at is not null then
    return jsonb_build_object('result', 'already_settled', 'subject_id', v_tx.subject_id);
  end if;
  -- Confirmed earlier but not applied: do not repeat the audit entry on every retry.
  if v_tx.note is not null then
    return jsonb_build_object('result', v_tx.note, 'subject_id', v_tx.subject_id);
  end if;

  if p_amount is distinct from v_tx.amount then
    v_problem := 'amount_mismatch';
  else
    v_problem := case v_tx.kind
      when 'shop_order' then public.phajay_apply_order(v_tx, v_paid_at)
      when 'premium' then public.phajay_apply_premium(v_tx, v_paid_at)
      when 'career_report' then public.phajay_apply_report(v_tx, v_paid_at)
    end;
  end if;

  if v_problem is not null then
    update public.phajay_transactions
    set status = 'PAYMENT_COMPLETED', paid_at = v_paid_at, note = v_problem
    where transaction_id = v_tx.transaction_id;

    insert into public.audit_logs (entity, entity_id, action, new_value)
    values (
      case v_tx.kind when 'shop_order' then 'payment' when 'premium' then 'premium_payment' else 'report_purchase' end,
      v_tx.subject_id, 'PHAJAY_PAYMENT_UNAPPLIED',
      jsonb_build_object('reason', v_problem, 'kind', v_tx.kind, 'provider', 'phajay',
                         'transaction_id', v_tx.transaction_id, 'paid_amount', p_amount, 'expected_amount', v_tx.amount)
    );
    return jsonb_build_object('result', v_problem, 'subject_id', v_tx.subject_id);
  end if;

  update public.phajay_transactions
  set status = 'PAYMENT_COMPLETED', paid_at = v_paid_at, settled_at = now()
  where transaction_id = v_tx.transaction_id;

  return jsonb_build_object('result', 'settled', 'subject_id', v_tx.subject_id);
end;
$$;

-- Server only. The appliers are reached through phajay_settle() alone.
revoke all on function public.phajay_resolve_order(text, text) from public, anon, authenticated;
revoke all on function public.phajay_resolve_premium(uuid) from public, anon, authenticated;
revoke all on function public.phajay_resolve_report(uuid) from public, anon, authenticated;
revoke all on function public.phajay_latest_transaction(text, uuid) from public, anon, authenticated;
revoke all on function public.phajay_record_qr(text, uuid, text, numeric, text, text) from public, anon, authenticated;
revoke all on function public.phajay_set_status(text, text) from public, anon, authenticated;
-- The appliers are internal to phajay_settle(), even for the service role.
revoke all on function public.phajay_apply_order(public.phajay_transactions, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.phajay_apply_premium(public.phajay_transactions, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.phajay_apply_report(public.phajay_transactions, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.phajay_settle(text, numeric, timestamptz) from public, anon, authenticated;

grant execute on function public.phajay_resolve_order(text, text) to service_role;
grant execute on function public.phajay_resolve_premium(uuid) to service_role;
grant execute on function public.phajay_resolve_report(uuid) to service_role;
grant execute on function public.phajay_latest_transaction(text, uuid) to service_role;
grant execute on function public.phajay_record_qr(text, uuid, text, numeric, text, text) to service_role;
grant execute on function public.phajay_set_status(text, text) to service_role;
grant execute on function public.phajay_settle(text, numeric, timestamptz) to service_role;
