-- Official school catalogue provenance and province -> district -> school search.
-- MoES educational type is distinct from public/private ownership (school_type).
alter table public.academic_schools
  add column if not exists emis_school_id varchar(16) unique,
  add column if not exists secondary_level text check (secondary_level in ('upper_secondary', 'complete_secondary')),
  add column if not exists source_academic_year varchar(9),
  add column if not exists latitude double precision check (latitude between -90 and 90),
  add column if not exists longitude double precision check (longitude between -180 and 180),
  add column if not exists coordinates_source_url text,
  add column if not exists coordinates_retrieved_on date;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.academic_schools'::regclass and conname = 'academic_schools_coordinate_pair') then
    alter table public.academic_schools add constraint academic_schools_coordinate_pair
      check ((latitude is null) = (longitude is null));
  end if;
end;
$$;

-- Preserve the first three positional arguments for existing callers.
drop function if exists public.academic_search_schools(text, text, integer);
create or replace function public.academic_search_schools(
  p_query text,
  p_province_code text default null,
  p_limit integer default 20,
  p_district_code text default null
)
returns table (id uuid, name_lo text, name_en text, romanised_name text, province_code text, district_code text, latitude double precision, longitude double precision)
language plpgsql
volatile
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_query text := lower(btrim(coalesce(p_query, '')));
begin
  perform public.academic_require_user();
  -- Browsing needs a province; unfiltered name search still needs two characters.
  if (v_query = '' and nullif(p_province_code, '') is null)
     or (v_query <> '' and length(v_query) < 2) then
    return;
  end if;

  return query
  select s.id, s.name_lo::text, s.name_en::text, s.romanised_name::text, s.province_code::text, s.district_code::text, s.latitude, s.longitude
  from public.academic_schools s
  where s.status = 'active'
    and (p_province_code is null or s.province_code = p_province_code)
    and (p_district_code is null or s.district_code = p_district_code)
    and (
      v_query = ''
      or lower(s.name_lo || ' ' || coalesce(s.name_en, '') || ' ' || coalesce(s.romanised_name, '')) like '%' || v_query || '%'
      or lower(s.name_lo || ' ' || coalesce(s.name_en, '') || ' ' || coalesce(s.romanised_name, '')) % v_query
    )
  order by similarity(lower(s.name_lo || ' ' || coalesce(s.name_en, '') || ' ' || coalesce(s.romanised_name, '')), v_query) desc,
           s.name_lo, s.id
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end;
$$;

revoke all on function public.academic_search_schools(text, text, integer, text) from public, anon;
grant execute on function public.academic_search_schools(text, text, integer, text) to authenticated;
