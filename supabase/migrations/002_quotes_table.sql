-- ============================================================
-- Pwen Books — Migration 002: Quotes table
-- Run in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

CREATE TABLE public.quotes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  text         text        NOT NULL,
  author       varchar(200),
  source       varchar(200),        -- book title or source name
  language     varchar(20) NOT NULL DEFAULT 'English',
  category     varchar(50) NOT NULL DEFAULT 'reading',
  -- MM-DD e.g. '04-13' = Lao New Year, shown every year on that date
  -- NULL = general quote, shown any day
  display_date char(5),
  sort_weight  smallint    NOT NULL DEFAULT 0,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.quotes.display_date IS 'MM-DD format. Shown on this date every year. NULL = any day.';

CREATE INDEX quotes_active_date_idx ON public.quotes (is_active, display_date);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_public_read" ON public.quotes
  FOR SELECT USING (is_active = true);

CREATE POLICY "quotes_admin_write" ON public.quotes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'OPERATIONS'))
  );
