-- ============================================================
-- Payment Accounts — QR codes and bank transfer details
-- shown to buyers during checkout.
-- ============================================================

create table public.payment_accounts (
  id             uuid primary key default uuid_generate_v4(),
  method         payment_method not null,  -- QR_PAYMENT or BANK_TRANSFER
  label          text not null,            -- e.g. "BCEL OnePay QR"
  bank_name      text not null,
  account_name   text,
  account_number text,
  qr_image_url   text,                     -- public URL to QR code image
  instructions   text,                     -- optional extra instructions shown to buyer
  is_active      boolean not null default true,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- RLS
alter table public.payment_accounts enable row level security;

-- Anyone can read active accounts (needed during checkout / order detail)
create policy "payment_accounts_public_read"
  on public.payment_accounts for select
  using (is_active = true);

-- Only admins can write
create policy "payment_accounts_admin_all"
  on public.payment_accounts for all
  using (get_user_role() in ('ADMIN'));

-- Updated-at trigger (reuses set_updated_at() defined in 001_initial_schema.sql)
create trigger payment_accounts_updated_at
  before update on public.payment_accounts
  for each row execute function set_updated_at();

-- ── Storage bucket note ──────────────────────────────────────────────────────
-- Create a public bucket named "payment-qr" in the Supabase dashboard:
--   Storage → New bucket → Name: payment-qr → Public: true
-- This is where admin-uploaded QR images will be stored.
