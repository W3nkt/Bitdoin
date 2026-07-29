-- Extends premium_lessons with the fields needed for full-length (10-20 min)
-- reading summaries: a longer intro "deck", a term glossary, and reflection
-- questions. content_en/content_lo keep their existing jsonb-array shape but
-- each element may now also carry "paragraphs" (string[]), "subsections"
-- ([{heading, body}]), and "oneline" (string) alongside the legacy "body".

alter table public.premium_lessons
  add column if not exists deck_en text,
  add column if not exists deck_lo text,
  add column if not exists glossary_en jsonb not null default '[]'::jsonb
    check (jsonb_typeof(glossary_en) = 'array'),
  add column if not exists glossary_lo jsonb not null default '[]'::jsonb
    check (jsonb_typeof(glossary_lo) = 'array'),
  add column if not exists reflection_questions_en text[] not null default '{}',
  add column if not exists reflection_questions_lo text[] not null default '{}';
