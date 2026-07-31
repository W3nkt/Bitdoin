-- Expose only the small amount of published-summary metadata needed by the
-- public Bookstore detail page. The lesson body remains protected by the
-- existing Premium RLS policies.
create or replace function public.get_book_reading_summary(p_book_id uuid)
returns table (
  slug text,
  title_en text,
  title_lo text,
  estimated_minutes integer,
  has_access boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    lesson.slug,
    lesson.title_en,
    lesson.title_lo,
    lesson.estimated_minutes,
    coalesce(public.has_active_premium_subscription(auth.uid()), false)
      or public.get_user_role() = 'ADMIN'
  from public.premium_lessons as lesson
  where lesson.book_id = p_book_id
    and lesson.lesson_type = 'READING_SUMMARY'
    and lesson.status = 'PUBLISHED'
  limit 1;
$$;

revoke all on function public.get_book_reading_summary(uuid) from public;
grant execute on function public.get_book_reading_summary(uuid) to anon, authenticated;
