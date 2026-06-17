-- ============================================================
-- Pwen Books — Initial Database Schema
-- Supabase PostgreSQL Migration v1.0
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ─── Enums ────────────────────────────────────────────────────────────────────

create type user_role as enum ('CUSTOMER','ADMIN','OPERATIONS','FINANCE');
create type order_status as enum (
  'PENDING_PAYMENT','PAYMENT_REVIEW','PROCESSING',
  'PURCHASING_FROM_BOOKSTORE','PARTIALLY_SHIPPED','SHIPPED',
  'DELIVERED','COMPLETED','CANCELLED','OUT_OF_STOCK','RETURNED'
);
create type payment_status as enum ('PENDING','VERIFIED','REQUIRES_REVIEW','REJECTED','REFUNDED');
create type payment_method as enum ('QR_PAYMENT','BANK_TRANSFER','CASH_ON_DELIVERY');
create type delivery_status as enum (
  'NOT_ASSIGNED','READY_FOR_SHIPMENT','SHIPPED','DELIVERED','FAILED','RETURNED'
);
create type availability_status as enum ('AVAILABLE','LOW_STOCK','OUT_OF_STOCK','UNKNOWN');
create type notification_channel as enum ('IN_APP','WHATSAPP','MESSENGER');

-- ─── Users ────────────────────────────────────────────────────────────────────

create table public.users (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  phone       text unique,
  email       text unique,
  role        user_role not null default 'CUSTOMER',
  language    text not null default 'lo',
  currency    text not null default 'LAK',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.addresses (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users(id) on delete cascade,
  full_name    text not null,
  phone        text not null,
  address_line text not null,
  city         text,
  province     text,
  country      text not null default 'Lao PDR',
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ─── Categories ───────────────────────────────────────────────────────────────

create table public.categories (
  id         uuid primary key default uuid_generate_v4(),
  name_lo    text not null,
  name_en    text not null,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

-- Seed initial categories
insert into public.categories (name_lo, name_en, slug) values
  ('ນິຍາຍ', 'Fiction', 'fiction'),
  ('ທີ່ບໍ່ແມ່ນນິຍາຍ', 'Non-Fiction', 'non-fiction'),
  ('ວິທະຍາສາດ', 'Science', 'science'),
  ('ປະຫວັດສາດ', 'History', 'history'),
  ('ທຸລະກິດ', 'Business', 'business'),
  ('ຊີວະປະຫວັດ', 'Biography', 'biography'),
  ('ການສຶກສາ', 'Education', 'education'),
  ('ການທ່ຽວ', 'Travel', 'travel'),
  ('ໜັງສືເດັກ', 'Children', 'children'),
  ('ສາດສະໜາ', 'Religion', 'religion');

-- ─── Bookstores ───────────────────────────────────────────────────────────────

create table public.bookstores (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  contact_name  text,
  phone         text,
  whatsapp      text,
  messenger_url text,
  address       text,
  notes         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Books ────────────────────────────────────────────────────────────────────

create table public.books (
  id               uuid primary key default uuid_generate_v4(),
  isbn             text unique,
  title            text not null,
  author           text,
  publisher        text,
  language         text not null default 'Lao',
  category_id      uuid references public.categories(id) on delete set null,
  description      text,
  pages            int,
  publication_date date,
  cover_image_url  text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index books_title_trgm on public.books using gin (title gin_trgm_ops);
create index books_author_idx on public.books (author);
create index books_category_idx on public.books (category_id);

-- ─── Book Prices ──────────────────────────────────────────────────────────────

create table public.book_prices (
  id              uuid primary key default uuid_generate_v4(),
  book_id         uuid not null references public.books(id) on delete cascade,
  bookstore_id    uuid not null references public.bookstores(id) on delete cascade,
  bookstore_price numeric(12,2) not null,
  margin_percent  numeric(5,2) not null default 5.0,
  final_price     numeric(12,2) not null,
  availability    availability_status not null default 'UNKNOWN',
  last_checked_at timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(book_id, bookstore_id)
);

create index book_prices_book_idx on public.book_prices (book_id);
create index book_prices_bookstore_idx on public.book_prices (bookstore_id);
create index book_prices_availability_idx on public.book_prices (availability);

-- Trigger: auto-compute final_price
create or replace function compute_final_price()
returns trigger language plpgsql as $$
begin
  new.final_price := new.bookstore_price * (1 + new.margin_percent / 100);
  return new;
end;
$$;

create trigger trg_compute_final_price
before insert or update of bookstore_price, margin_percent
on public.book_prices
for each row execute function compute_final_price();

-- ─── Margin Rules ─────────────────────────────────────────────────────────────

create table public.margin_rules (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null,
  category_id    uuid references public.categories(id) on delete set null,
  bookstore_id   uuid references public.bookstores(id) on delete set null,
  min_price      numeric(12,2),
  max_price      numeric(12,2),
  margin_percent numeric(5,2) not null,
  priority       int not null default 100,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Insert global default margin rule
insert into public.margin_rules (name, margin_percent, priority)
values ('Global Default', 5.0, 999);

-- ─── Cart ─────────────────────────────────────────────────────────────────────

create table public.carts (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references public.users(id) on delete cascade,
  session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id           uuid primary key default uuid_generate_v4(),
  cart_id      uuid not null references public.carts(id) on delete cascade,
  book_id      uuid not null references public.books(id) on delete cascade,
  bookstore_id uuid not null references public.bookstores(id) on delete cascade,
  quantity     int not null default 1 check (quantity > 0),
  created_at   timestamptz not null default now()
);

-- ─── Orders ───────────────────────────────────────────────────────────────────

create table public.orders (
  id                uuid primary key default uuid_generate_v4(),
  order_number      text not null unique,
  customer_id       uuid not null references public.users(id),
  status            order_status not null default 'PENDING_PAYMENT',
  payment_status    payment_status not null default 'PENDING',
  subtotal_amount   numeric(12,2) not null,
  total_amount      numeric(12,2) not null,
  currency          text not null default 'LAK',
  delivery_fee_note text not null default 'Delivery fee paid on delivery',
  customer_name     text not null,
  customer_phone    text not null,
  delivery_address  text not null,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index orders_customer_idx on public.orders (customer_id);
create index orders_status_idx on public.orders (status);
create index orders_payment_status_idx on public.orders (payment_status);
create index orders_created_idx on public.orders (created_at desc);

create table public.order_items (
  id                uuid primary key default uuid_generate_v4(),
  order_id          uuid not null references public.orders(id) on delete cascade,
  book_id           uuid not null references public.books(id),
  bookstore_id      uuid not null references public.bookstores(id),
  quantity          int not null check (quantity > 0),
  bookstore_price   numeric(12,2) not null,
  margin_percent    numeric(5,2) not null,
  final_price       numeric(12,2) not null,
  fulfillment_status order_status not null default 'PROCESSING',
  created_at        timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);

-- ─── Payments ─────────────────────────────────────────────────────────────────

create table public.payments (
  id                   uuid primary key default uuid_generate_v4(),
  order_id             uuid not null references public.orders(id) on delete cascade,
  user_id              uuid not null references public.users(id),
  method               payment_method not null,
  amount               numeric(12,2) not null,
  currency             text not null default 'LAK',
  receipt_image_url    text,
  verification_status  payment_status not null default 'PENDING',
  transaction_reference text unique,
  bank_name            text,
  sender_name          text,
  transferred_at       timestamptz,
  ai_confidence_score  numeric(5,2),
  ai_extracted_data    jsonb,
  reviewed_by_user_id  uuid references public.users(id),
  reviewed_at          timestamptz,
  rejection_reason     text,
  created_at           timestamptz not null default now()
);

create index payments_order_idx on public.payments (order_id);
create index payments_status_idx on public.payments (verification_status);

-- ─── Deliveries ───────────────────────────────────────────────────────────────

create table public.deliveries (
  id                   uuid primary key default uuid_generate_v4(),
  order_id             uuid not null references public.orders(id) on delete cascade,
  courier              text not null,
  tracking_number      text,
  status               delivery_status not null default 'NOT_ASSIGNED',
  shipped_at           timestamptz,
  delivered_at         timestamptz,
  estimated_delivery_at timestamptz,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index deliveries_order_idx on public.deliveries (order_id);
create index deliveries_status_idx on public.deliveries (status);

-- ─── Notifications ────────────────────────────────────────────────────────────

create table public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references public.users(id) on delete set null,
  channel    notification_channel not null,
  recipient  text not null,
  subject    text,
  message    text not null,
  status     text not null default 'PENDING',
  sent_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ─── Recommendations ──────────────────────────────────────────────────────────

create table public.recommendations (
  id         uuid primary key default uuid_generate_v4(),
  book_id    uuid not null references public.books(id) on delete cascade,
  type       text not null,
  score      numeric(5,2) not null,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

-- ─── Search Logs ──────────────────────────────────────────────────────────────

create table public.search_logs (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references public.users(id) on delete set null,
  query      text not null,
  language   text,
  results    int,
  created_at timestamptz not null default now()
);

-- ─── Audit Logs ───────────────────────────────────────────────────────────────

create table public.audit_logs (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references public.users(id) on delete set null,
  entity     text not null,
  entity_id  uuid,
  action     text not null,
  old_value  jsonb,
  new_value  jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);
create index audit_logs_user_idx on public.audit_logs (user_id);

-- ─── Updated_at triggers ──────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_users_updated_at before update on public.users for each row execute function set_updated_at();
create trigger trg_bookstores_updated_at before update on public.bookstores for each row execute function set_updated_at();
create trigger trg_books_updated_at before update on public.books for each row execute function set_updated_at();
create trigger trg_book_prices_updated_at before update on public.book_prices for each row execute function set_updated_at();
create trigger trg_margin_rules_updated_at before update on public.margin_rules for each row execute function set_updated_at();
create trigger trg_orders_updated_at before update on public.orders for each row execute function set_updated_at();
create trigger trg_deliveries_updated_at before update on public.deliveries for each row execute function set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.users         enable row level security;
alter table public.addresses     enable row level security;
alter table public.categories    enable row level security;
alter table public.bookstores    enable row level security;
alter table public.books         enable row level security;
alter table public.book_prices   enable row level security;
alter table public.margin_rules  enable row level security;
alter table public.carts         enable row level security;
alter table public.cart_items    enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.payments      enable row level security;
alter table public.deliveries    enable row level security;
alter table public.notifications enable row level security;
alter table public.recommendations enable row level security;
alter table public.search_logs   enable row level security;
alter table public.audit_logs    enable row level security;

-- Helper function: get current user role
create or replace function public.get_user_role()
returns user_role language sql security definer as $$
  select role from public.users where id = auth.uid();
$$;

-- ─── RLS Policies ────────────────────────────────────────────────────────────

-- Categories: public read
create policy "categories_read_all" on public.categories for select using (true);
create policy "categories_admin_write" on public.categories for all using (get_user_role() in ('ADMIN'));

-- Books: public read if active
create policy "books_read_active" on public.books for select using (is_active = true);
create policy "books_admin_all" on public.books for all using (get_user_role() in ('ADMIN', 'OPERATIONS'));

-- Bookstores: admin only write, public read active
create policy "bookstores_read_active" on public.bookstores for select using (is_active = true);
create policy "bookstores_admin_write" on public.bookstores for all using (get_user_role() in ('ADMIN', 'OPERATIONS'));

-- Book prices: public read
create policy "book_prices_read_all" on public.book_prices for select using (true);
create policy "book_prices_admin_write" on public.book_prices for all using (get_user_role() in ('ADMIN', 'OPERATIONS'));

-- Margin rules: admin only
create policy "margin_rules_admin" on public.margin_rules for all using (get_user_role() in ('ADMIN'));

-- Users: own row + admin all
create policy "users_own" on public.users for select using (id = auth.uid() or get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'));
create policy "users_self_update" on public.users for update using (id = auth.uid());
create policy "users_admin_all" on public.users for all using (get_user_role() in ('ADMIN'));
create policy "users_insert_self" on public.users for insert with check (id = auth.uid());

-- Addresses: own rows
create policy "addresses_own" on public.addresses for all using (user_id = auth.uid());

-- Carts: own
create policy "carts_own" on public.carts for all using (user_id = auth.uid() or session_id is not null);
create policy "cart_items_own" on public.cart_items for all using (
  cart_id in (select id from public.carts where user_id = auth.uid())
);

-- Orders: customer sees own, staff sees all
create policy "orders_customer_read" on public.orders for select
  using (customer_id = auth.uid() or get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'));
create policy "orders_customer_insert" on public.orders for insert
  with check (customer_id = auth.uid());
create policy "orders_staff_update" on public.orders for update
  using (get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'));

-- Order items: same as orders
create policy "order_items_customer" on public.order_items for select
  using (order_id in (select id from public.orders where customer_id = auth.uid())
         or get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'));
create policy "order_items_customer_insert" on public.order_items for insert
  with check (order_id in (select id from public.orders where customer_id = auth.uid()));
create policy "order_items_staff_update" on public.order_items for update
  using (get_user_role() in ('ADMIN', 'OPERATIONS'));

-- Payments: customer own, finance sees all
create policy "payments_customer" on public.payments for select
  using (user_id = auth.uid() or get_user_role() in ('ADMIN', 'FINANCE'));
create policy "payments_customer_insert" on public.payments for insert
  with check (user_id = auth.uid());
create policy "payments_customer_update_receipt" on public.payments for update
  using (user_id = auth.uid() or get_user_role() in ('ADMIN', 'FINANCE'));

-- Deliveries: customer sees own orders' deliveries, staff all
create policy "deliveries_customer" on public.deliveries for select
  using (order_id in (select id from public.orders where customer_id = auth.uid())
         or get_user_role() in ('ADMIN', 'OPERATIONS'));
create policy "deliveries_staff_write" on public.deliveries for all
  using (get_user_role() in ('ADMIN', 'OPERATIONS'));

-- Notifications: own + admin
create policy "notifications_own" on public.notifications for select
  using (user_id = auth.uid() or get_user_role() in ('ADMIN'));
create policy "notifications_admin_write" on public.notifications for all
  using (get_user_role() in ('ADMIN'));

-- Recommendations: public read
create policy "recommendations_read" on public.recommendations for select using (true);
create policy "recommendations_admin_write" on public.recommendations for all using (get_user_role() in ('ADMIN'));

-- Search logs: admin read, anyone insert
create policy "search_logs_insert" on public.search_logs for insert with check (true);
create policy "search_logs_admin" on public.search_logs for select using (get_user_role() in ('ADMIN'));

-- Audit logs: admin only
create policy "audit_logs_admin" on public.audit_logs for all using (get_user_role() in ('ADMIN'));

-- ─── Storage Buckets (run via Supabase Dashboard or CLI) ──────────────────────
-- insert into storage.buckets (id, name, public) values ('books', 'books', true);
-- insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false);
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- ─── Auth hook: create user profile on sign up ────────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, new.phone, 'User'), '@', 1)),
    new.email,
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
