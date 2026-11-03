// Shared by the PhaJay tests: the slice of the shop schema migration 172 touches (supabase/migrations
// 001, 022, 043), a few helpers to make orders, and a loader that runs the Edge Function TypeScript in Node.
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { SUPABASE, createDb, ok, readMigration } from './harness.mjs'

export const SHOP_SQL = `
  create type order_status as enum ('PENDING_PAYMENT','PAYMENT_REVIEW','PROCESSING','CANCELLED','DELIVERED');
  create type payment_status as enum ('PENDING','VERIFIED','REQUIRES_REVIEW','REJECTED','REFUNDED');
  create type payment_method as enum ('QR_PAYMENT','BANK_TRANSFER','CASH_ON_DELIVERY');
  create function public.normalize_order_phone(value text) returns text language sql immutable as
    $$ select regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g') $$;
  create table public.orders (
    id uuid primary key default gen_random_uuid(), order_number text not null unique,
    status order_status not null default 'PENDING_PAYMENT', payment_status payment_status not null default 'PENDING',
    total_amount numeric(12,2) not null, currency text not null default 'LAK', customer_phone text not null);
  create table public.payments (
    id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
    method payment_method not null, amount numeric(12,2) not null, currency text not null default 'LAK',
    verification_status payment_status not null default 'PENDING', transaction_reference text unique, bank_name text,
    transferred_at timestamptz, reviewed_at timestamptz, rejection_reason text, created_at timestamptz not null default now());
  create table public.audit_logs (
    id uuid primary key default gen_random_uuid(), user_id uuid, entity text not null, entity_id uuid,
    action text not null, old_value jsonb, new_value jsonb, created_at timestamptz not null default now());`

// The slice of the Academy schema the migration touches (supabase/migrations 036, 040, 041, 112, 141, 157).
// The test bootstrap already has minimal premium_plans and premium_subscriptions; these add what settling writes.
export const ACADEMY_SQL = `
  alter table public.premium_subscriptions
    add column if not exists cancelled_at timestamptz, add column if not exists reviewed_at timestamptz, add column if not exists rejection_reason text;
  create table public.premium_payments (
    id uuid primary key default gen_random_uuid(), subscription_id uuid not null references public.premium_subscriptions(id) on delete cascade,
    user_id uuid not null references public.users(id), plan_id uuid, amount_lak integer not null, currency text not null default 'LAK',
    method text not null default 'MANUAL_TRANSFER', status text not null default 'PENDING', receipt_image_url text, reference text, notes text,
    reviewed_at timestamptz, rejection_reason text, created_at timestamptz not null default now());
  create table public.premium_activity_members (
    id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.users(id), subscription_id uuid,
    approved_by_user_id uuid, approved_at timestamptz not null default now(), is_active boolean not null default true);
  create table public.academic_settings (key text primary key, value jsonb not null);
  insert into public.academic_settings values ('career_report_price', '{"price_lak": 49000, "months": 12}');
  create function public.academic_setting(p_key text) returns jsonb language sql stable as $$ select value from public.academic_settings where key = p_key $$;
  create table public.academic_entitlement_grants (
    id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id), feature_code text not null, source text not null,
    reason_code text not null, note text, reference text check (length(reference) <= 80), amount_lak integer, starts_at timestamptz not null default now(),
    ends_at timestamptz not null, granted_by uuid, check (ends_at > starts_at));
  create table public.academic_report_purchases (
    id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id), amount_lak integer not null,
    status text not null default 'pending', receipt_path text, reference text, rejection_reason text, grant_id uuid, reviewed_by uuid,
    reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
  insert into public.premium_plans (slug, name, price_lak, interval) values ('premium-yearly', 'Premium Yearly', 390000, 'year');`

/** A fresh database with the shop and Academy stubs and migration 172 applied. */
export async function createShopDb() {
  const db = await createDb([])
  await ok(db, 'shop tables', SHOP_SQL)
  await ok(db, 'academy tables', ACADEMY_SQL)
  await db.exec(readMigration('172_phajay_payments.sql'))
  return db
}

export const PHONE = '020 5555 1234'

let seq = 0
/** An order with its single payment. Returns the ids and the order number. */
export async function shopOrder(db, { total = 45150.5, currency = 'LAK', status = 'PENDING_PAYMENT', paymentStatus = 'PENDING', method = 'QR_PAYMENT' } = {}) {
  seq++
  const orderNumber = `BD-T${seq}AA`
  const order = (await db.query(`insert into orders (order_number, status, total_amount, currency, customer_phone)
    values ($1, $2, $3, $4, $5) returning id`, [orderNumber, status, total, currency, PHONE])).rows[0]
  const payment = (await db.query(`insert into payments (order_id, method, amount, currency, verification_status)
    values ($1, $2, $3, $4, $5) returning id`, [order.id, method, total, currency, paymentStatus])).rows[0]
  return { orderNumber, orderId: order.id, paymentId: payment.id }
}

let userSeq = 0
/** A signed-in member (a row in users). Returns the id. */
export async function member(db) {
  userSeq++
  const id = `00000000-0000-4000-8000-${String(userSeq).padStart(12, '0')}`
  await db.query(`insert into users (id, name) values ($1, $2)`, [id, `Member ${userSeq}`])
  return id
}

/** A Premium request: the subscription and its payment. Returns their ids. */
export async function premiumRequest(db, userId, { plan = 'premium-monthly', status = 'PENDING_PAYMENT', paymentStatus = 'PENDING', amount } = {}) {
  const planRow = (await db.query(`select id, price_lak from premium_plans where slug = $1`, [plan])).rows[0]
  const subscription = (await db.query(`insert into premium_subscriptions (user_id, plan_id, status) values ($1, $2, $3) returning id`, [userId, planRow.id, status])).rows[0]
  const payment = (await db.query(`insert into premium_payments (subscription_id, user_id, plan_id, amount_lak, status)
    values ($1, $2, $3, $4, $5) returning id`, [subscription.id, userId, planRow.id, amount ?? planRow.price_lak, paymentStatus])).rows[0]
  return { subscriptionId: subscription.id, paymentId: payment.id }
}

/** A career report purchase. Returns its id. */
export async function reportPurchase(db, userId, { status = 'pending', amount = 49000 } = {}) {
  return (await db.query(`insert into academic_report_purchases (user_id, amount_lak, status) values ($1, $2, $3) returning id`, [userId, amount, status])).rows[0].id
}

/** supabase-js style rpc() that runs the SQL function in PGlite, so adapters can be tested against the real SQL. */
export function pgRpc(db) {
  return async (name, args) => {
    const keys = Object.keys(args)
    try {
      const { rows } = await db.query(`select public.${name}(${keys.map((key, i) => `${key} => $${i + 1}`).join(', ')}) as r`, keys.map((key) => args[key]))
      return { data: rows[0].r, error: null }
    } catch (error) {
      return { data: null, error: { message: error.message } }
    }
  }
}

/** Transpiles Edge Function files (paths under supabase/functions) to a temp folder and imports them. */
export async function loadFunctionModules(paths) {
  const out = await mkdtemp(join(tmpdir(), 'edge-'))
  try {
    const names = paths.map((path) => path.split('/').pop().replace(/\.ts$/, ''))
    for (const [i, path] of paths.entries()) {
      const source = await readFile(join(SUPABASE, 'functions', path), 'utf8')
      const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
      await writeFile(join(out, `${names[i]}.mjs`), js.replace(/from '\.\/([\w-]+)\.ts'/g, "from './$1.mjs'"))
    }
    return Object.assign({}, ...(await Promise.all(names.map((name) => import(pathToFileURL(join(out, `${name}.mjs`)).href)))))
  } finally {
    await rm(out, { recursive: true })
  }
}

export const here = dirname(fileURLToPath(import.meta.url))
