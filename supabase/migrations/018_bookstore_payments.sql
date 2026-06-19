-- Track payments made by Bitdoin to each bookstore for an order.
create table public.bookstore_payments (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  bookstore_id     uuid not null references public.bookstores(id),
  amount           numeric(12,2) not null check (amount > 0),
  currency         text not null default 'LAK',
  proof_image_url  text not null,
  reference        text,
  notes            text,
  paid_at          timestamptz not null default now(),
  paid_by_user_id  uuid not null references public.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (order_id, bookstore_id)
);

create index bookstore_payments_order_idx
  on public.bookstore_payments (order_id);

create index bookstore_payments_bookstore_idx
  on public.bookstore_payments (bookstore_id);

create index bookstore_payments_paid_by_idx
  on public.bookstore_payments (paid_by_user_id);

create trigger bookstore_payments_updated_at
  before update on public.bookstore_payments
  for each row execute function set_updated_at();

alter table public.bookstore_payments enable row level security;

create policy "bookstore_payments_staff_read"
  on public.bookstore_payments for select
  using (get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'));

create policy "bookstore_payments_staff_insert"
  on public.bookstore_payments for insert
  with check (
    get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE')
    and paid_by_user_id = auth.uid()
  );

create policy "bookstore_payments_staff_update"
  on public.bookstore_payments for update
  using (get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'))
  with check (
    get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE')
    and paid_by_user_id = auth.uid()
  );

create policy "bookstore_payments_admin_delete"
  on public.bookstore_payments for delete
  using (get_user_role() = 'ADMIN');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bookstore-payment-proofs',
  'bookstore-payment-proofs',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "bookstore_payment_proofs_staff_read"
  on storage.objects for select
  using (
    bucket_id = 'bookstore-payment-proofs'
    and public.get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE')
  );

create policy "bookstore_payment_proofs_staff_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'bookstore-payment-proofs'
    and public.get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE')
  );

create policy "bookstore_payment_proofs_staff_update"
  on storage.objects for update
  using (
    bucket_id = 'bookstore-payment-proofs'
    and public.get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE')
  )
  with check (
    bucket_id = 'bookstore-payment-proofs'
    and public.get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE')
  );

create policy "bookstore_payment_proofs_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'bookstore-payment-proofs'
    and public.get_user_role() = 'ADMIN'
  );
