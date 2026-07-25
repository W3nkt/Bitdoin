-- Sanity check for the AI Skills lessons added in 060.

do $$
declare
  v_count integer;
  v_bad_sections integer;
begin
  select count(*) into v_count
  from public.premium_lessons pl
  join public.premium_learning_categories c on c.id = pl.category_id
  where c.slug = 'ai-skills' and pl.status = 'PUBLISHED';

  raise notice 'published ai-skills lessons: %', v_count;

  if v_count < 7 then
    raise exception 'expected at least 7 published ai-skills lessons, found %', v_count;
  end if;

  select count(*) into v_bad_sections
  from public.premium_lessons pl
  join public.premium_learning_categories c on c.id = pl.category_id
  where c.slug = 'ai-skills' and pl.status = 'PUBLISHED'
    and (jsonb_array_length(pl.content_en) < 3 or jsonb_array_length(pl.content_lo) < 3);

  if v_bad_sections > 0 then
    raise exception '% published ai-skills lessons have fewer than 3 sections', v_bad_sections;
  end if;

  raise notice 'ai-skills lessons verified: % lessons published with full content', v_count;
end $$;
