-- Shop logo shown on the admin bookstore cards. The image lives in the
-- existing public bookstore-qr bucket (<store id>/logo.png), which already
-- has public read and ADMIN/OPERATIONS write policies.
alter table public.bookstores
  add column if not exists logo_url text;
