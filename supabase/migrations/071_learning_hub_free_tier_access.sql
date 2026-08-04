-- Free accounts may now browse the Learning Hub (capped to one lesson per
-- category client-side) instead of being fully blocked. Reads of categories,
-- lessons, and quiz questions no longer require an active subscription — the
-- per-category daily unlock pacing was always enforced client-side even for
-- Premium members, so this just extends the same trust boundary to free
-- accounts. Writing progress/quiz attempts/category-unlock rows for a user's
-- own account is likewise no longer subscription-gated.

drop policy if exists "premium_categories_member_read" on public.premium_learning_categories;
create policy "premium_categories_member_read" on public.premium_learning_categories for select to authenticated
  using (is_active);

drop policy if exists "premium_lessons_member_read" on public.premium_lessons;
create policy "premium_lessons_member_read" on public.premium_lessons for select to authenticated
  using (status = 'PUBLISHED');

drop policy if exists "premium_quizzes_member_read" on public.premium_quiz_questions;
create policy "premium_quizzes_member_read" on public.premium_quiz_questions for select to authenticated
  using (true);

drop policy if exists "premium_lesson_progress_own_all" on public.premium_lesson_progress;
create policy "premium_lesson_progress_own_all" on public.premium_lesson_progress for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "premium_quiz_attempts_own_insert" on public.premium_quiz_attempts;
create policy "premium_quiz_attempts_own_insert" on public.premium_quiz_attempts for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "premium_category_unlocks_own_all" on public.premium_category_unlocks;
create policy "premium_category_unlocks_own_all" on public.premium_category_unlocks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
