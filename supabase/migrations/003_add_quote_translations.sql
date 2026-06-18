-- ============================================================
-- Pwen Books — Migration 003: Bilingual quote translations
-- Adds text_lo column so every quote can display in Lao.
-- Run AFTER 002_quotes_table.sql.
-- After running this, re-run quotes_seed.sql (it starts with
-- DELETE FROM public.quotes to replace old single-language rows).
-- ============================================================

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS text_lo text;

COMMENT ON COLUMN public.quotes.text_lo IS
  'Lao translation of the quote. NULL = fall back to text (English).';
