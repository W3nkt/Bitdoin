-- Bank QR codes used when Bitdoin pays partner bookstores.
alter table public.bookstores
  add column if not exists bank_qr_code_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bookstore-qr',
  'bookstore-qr',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "bookstore_qr_public_read"
  on storage.objects for select
  using (bucket_id = 'bookstore-qr');

create policy "bookstore_qr_staff_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'bookstore-qr'
    and public.get_user_role() in ('ADMIN', 'OPERATIONS')
  );

create policy "bookstore_qr_staff_update"
  on storage.objects for update
  using (
    bucket_id = 'bookstore-qr'
    and public.get_user_role() in ('ADMIN', 'OPERATIONS')
  )
  with check (
    bucket_id = 'bookstore-qr'
    and public.get_user_role() in ('ADMIN', 'OPERATIONS')
  );

create policy "bookstore_qr_staff_delete"
  on storage.objects for delete
  using (
    bucket_id = 'bookstore-qr'
    and public.get_user_role() in ('ADMIN', 'OPERATIONS')
  );
