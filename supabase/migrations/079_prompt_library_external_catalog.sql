alter table public.premium_prompt_library
  add column if not exists preview_url text,
  add column if not exists external_id text,
  add column if not exists source_name text,
  add column if not exists source_license text,
  add column if not exists source_language text not null default 'en';

create unique index if not exists premium_prompt_library_external_source_idx
  on public.premium_prompt_library (source_name, external_id)
  where external_id is not null;

-- Both to_tsvector(regconfig, text) and array_to_string(anyarray, text) are
-- only STABLE in Postgres, not IMMUTABLE, so neither can be used directly in
-- an index expression. Wrap the whole computation in one plpgsql function
-- declared IMMUTABLE instead — plpgsql bodies are opaque to the planner (no
-- inlining like a simple SQL-language wrapper would get), so CREATE INDEX
-- only sees and trusts the outer declared volatility.
create or replace function public.immutable_prompt_search_vector(
  title text, description text, prompt text, tags text[]
)
returns tsvector
language plpgsql
immutable
parallel safe
as $$
begin
  return to_tsvector('simple',
    coalesce(title, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(prompt, '') || ' ' ||
    array_to_string(tags, ' ')
  );
end;
$$;

create index if not exists premium_prompt_library_search_idx
  on public.premium_prompt_library using gin (
    public.immutable_prompt_search_vector(title_en, description_en, prompt_en, tags)
  );
