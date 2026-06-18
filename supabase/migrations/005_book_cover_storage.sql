-- Public storage bucket for admin-managed book cover images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'books',
  'books',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "book_covers_public_read"
  on storage.objects for select
  using (bucket_id = 'books');

create policy "book_covers_staff_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'books'
    and public.get_user_role() in ('ADMIN', 'OPERATIONS')
  );

create policy "book_covers_staff_update"
  on storage.objects for update
  using (
    bucket_id = 'books'
    and public.get_user_role() in ('ADMIN', 'OPERATIONS')
  )
  with check (
    bucket_id = 'books'
    and public.get_user_role() in ('ADMIN', 'OPERATIONS')
  );

create policy "book_covers_staff_delete"
  on storage.objects for delete
  using (
    bucket_id = 'books'
    and public.get_user_role() in ('ADMIN', 'OPERATIONS')
  );
