-- Longer responses, especially in Lao, can exceed the original 8,000-character cap.
alter table public.premium_coach_messages
  drop constraint if exists premium_coach_messages_content_check;

alter table public.premium_coach_messages
  add constraint premium_coach_messages_content_check
  check (char_length(content) between 1 and 20000);
