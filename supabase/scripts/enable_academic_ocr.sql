-- Run only after release-runbook.md, "Switching score-book scanning on",
-- steps 1-4 are complete. Deploy the counsel-approved English and Lao notice
-- and publish its consent_notice_version before running this script.
-- Configured for the approved OCR notice version 2026-10-26.

begin;

do $$
declare
  approved_notice_version text := '2026-10-26';
  purposes jsonb;
begin
  if approved_notice_version is null
     or btrim(approved_notice_version) = '' then
    raise exception 'Set approved_notice_version to the counsel-approved, published notice version first.';
  end if;

  -- Keep the checks and both flag changes consistent with concurrent edits.
  perform 1 from public.academic_settings
  where key in ('consent_notice_version', 'consent_purposes_enabled', 'ocr_enabled')
  order by key for update;

  if public.academic_setting('consent_notice_version')
       is distinct from to_jsonb(approved_notice_version) then
    raise exception 'The approved privacy notice version has not been published.';
  end if;

  select value into purposes from public.academic_settings
  where key = 'consent_purposes_enabled';
  if jsonb_typeof(purposes) is distinct from 'array' then
    raise exception 'consent_purposes_enabled is missing or is not a JSON array.';
  end if;
  if not exists (select 1 from public.academic_settings where key = 'ocr_enabled') then
    raise exception 'ocr_enabled is missing. Apply the OCR migrations first.';
  end if;

  update public.academic_settings
  set value = value || '["ocr_processing"]'::jsonb
  where key = 'consent_purposes_enabled' and not (value ? 'ocr_processing');

  update public.academic_settings
  set value = 'true'::jsonb
  where key = 'ocr_enabled';
end;
$$;

commit;

select key, value from public.academic_settings
where key in ('consent_notice_version', 'consent_purposes_enabled', 'ocr_enabled')
order by key;
