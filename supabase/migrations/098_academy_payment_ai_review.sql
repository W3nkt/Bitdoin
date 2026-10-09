-- AI (Qwen) check of Academy payment proofs.
--
-- The review-academy-payment edge function reads the uploaded receipt and
-- compares it with the plan price, the request date and the admin's bank
-- account names, then suggests Approve / Decline / Check manually (with a
-- drafted decline reason). It is advice only: approving or declining stays
-- an admin action. Kept out of premium_payments because members can read
-- their own payment rows; this table is admin-only.

create table if not exists public.premium_payment_ai_reviews (
  payment_id        uuid primary key references public.premium_payments(id) on delete cascade,
  status            text not null default 'PENDING' check (status in ('PENDING', 'DONE', 'FAILED')),
  -- Which uploaded proof this result is for (a new upload invalidates it).
  receipt_ref       text,
  suggested_action  text check (suggested_action in ('APPROVE', 'DECLINE', 'MANUAL')),
  -- [{ key, status: 'pass' | 'fail' | 'unknown', label, detail }]
  checks            jsonb not null default '[]'::jsonb,
  extracted         jsonb,
  decline_reason_lo text,
  decline_reason_en text,
  model             text,
  error             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists premium_payment_ai_reviews_updated_at on public.premium_payment_ai_reviews;
create trigger premium_payment_ai_reviews_updated_at
  before update on public.premium_payment_ai_reviews
  for each row execute function set_updated_at();

alter table public.premium_payment_ai_reviews enable row level security;

drop policy if exists "premium_payment_ai_reviews_admin_read" on public.premium_payment_ai_reviews;
create policy "premium_payment_ai_reviews_admin_read"
  on public.premium_payment_ai_reviews for select to authenticated
  using (get_user_role() = 'ADMIN');

-- Writes come only from the edge function (service role).
grant select on public.premium_payment_ai_reviews to authenticated;
