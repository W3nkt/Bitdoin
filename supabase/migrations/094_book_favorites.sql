-- Favorite books.
--
-- Signed-in customers tap the heart on a book page to save it. Each row is
-- one customer's favorite; customers can only see, add and remove their own.

create table if not exists public.book_favorites (
  user_id    uuid not null default auth.uid() references public.users(id) on delete cascade,
  book_id    uuid not null references public.books(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create index if not exists book_favorites_book_idx on public.book_favorites (book_id);

alter table public.book_favorites enable row level security;

drop policy if exists "Customers read own favorites" on public.book_favorites;
create policy "Customers read own favorites"
  on public.book_favorites for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Customers add own favorites" on public.book_favorites;
create policy "Customers add own favorites"
  on public.book_favorites for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Customers remove own favorites" on public.book_favorites;
create policy "Customers remove own favorites"
  on public.book_favorites for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on public.book_favorites to authenticated;
