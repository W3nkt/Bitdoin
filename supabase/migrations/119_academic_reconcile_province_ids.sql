-- My Scores — make province ids match src/data/laosAdministrativeDivisions.ts
-- on databases that applied migrations 109/113 before they switched from
-- ISO 3166-2 codes to the shared slugs. Safe to run anywhere: on an
-- up-to-date database every statement is a no-op.

alter table public.academic_schools alter column province_code type varchar(32);
alter table public.academic_calendar_templates alter column province_code type varchar(32);
alter table public.academic_student_profiles alter column province_code type varchar(32);

update public.academic_settings
set value = '["vientiane-prefecture","phongsaly","luang-namtha","oudomxay","bokeo","luang-prabang","houaphanh","sainyabuli","xiangkhouang","vientiane-province","bolikhamsai","khammouane","savannakhet","salavan","sekong","champasak","attapeu","xaisomboun"]',
    description = 'Lao PDR provinces, using the ids of src/data/laosAdministrativeDivisions.ts (shared with checkout addresses).'
where key = 'province_codes'
  and value <> '["vientiane-prefecture","phongsaly","luang-namtha","oudomxay","bokeo","luang-prabang","houaphanh","sainyabuli","xiangkhouang","vientiane-province","bolikhamsai","khammouane","savannakhet","salavan","sekong","champasak","attapeu","xaisomboun"]'::jsonb;

-- Rows saved with ISO codes in the meantime.
do $$
declare
  v_map jsonb := '{"AT":"attapeu","BK":"bokeo","BL":"bolikhamsai","CH":"champasak","HO":"houaphanh","KH":"khammouane","LM":"luang-namtha","LP":"luang-prabang","OU":"oudomxay","PH":"phongsaly","SL":"salavan","SV":"savannakhet","VI":"vientiane-province","VT":"vientiane-prefecture","XA":"sainyabuli","XE":"sekong","XI":"xiangkhouang","XS":"xaisomboun"}';
begin
  update public.academic_schools set province_code = v_map->>province_code where v_map ? province_code;
  update public.academic_calendar_templates set province_code = v_map->>province_code where v_map ? province_code;
  update public.academic_student_profiles set province_code = v_map->>province_code where v_map ? province_code;
end;
$$;
