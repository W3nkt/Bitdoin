-- Atomic AI rate limits. Only trusted Edge Functions may consume quota.
create table if not exists public.ai_usage_buckets (
  feature       text        not null,
  subject_hash  text        not null,
  bucket_kind   text        not null check (bucket_kind in ('minute', 'day')),
  bucket_start  timestamptz not null,
  request_count integer     not null default 0 check (request_count >= 0),
  updated_at    timestamptz not null default now(),
  primary key (feature, subject_hash, bucket_kind, bucket_start)
);

create index if not exists ai_usage_buckets_cleanup_idx
  on public.ai_usage_buckets (bucket_start);

alter table public.ai_usage_buckets enable row level security;

revoke all on table public.ai_usage_buckets from anon, authenticated;
grant select, insert, update, delete on table public.ai_usage_buckets to service_role;

create or replace function public.consume_ai_quota(
  p_feature text,
  p_subject_hash text,
  p_minute_limit integer,
  p_daily_limit integer,
  p_global_daily_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_minute_start timestamptz := date_trunc('minute', v_now);
  v_day_start timestamptz := date_trunc('day', v_now at time zone 'Asia/Vientiane') at time zone 'Asia/Vientiane';
  v_minute_count integer;
  v_daily_count integer;
  v_global_count integer;
  v_retry_after integer;
begin
  if p_feature is null or length(p_feature) not between 1 and 64
     or p_subject_hash is null or length(p_subject_hash) not between 16 and 128
     or p_minute_limit < 1 or p_daily_limit < 1 or p_global_daily_limit < 1 then
    raise exception 'Invalid AI quota parameters';
  end if;

  -- Lock in a consistent order so every request for a feature is serialized
  -- against the global budget before its individual subject budget.
  perform pg_advisory_xact_lock(hashtextextended('ai-global:' || p_feature, 0));
  perform pg_advisory_xact_lock(hashtextextended('ai-subject:' || p_feature || ':' || p_subject_hash, 0));

  select request_count into v_global_count
  from public.ai_usage_buckets
  where feature = p_feature
    and subject_hash = 'global'
    and bucket_kind = 'day'
    and bucket_start = v_day_start;
  v_global_count := coalesce(v_global_count, 0);

  select request_count into v_daily_count
  from public.ai_usage_buckets
  where feature = p_feature
    and subject_hash = p_subject_hash
    and bucket_kind = 'day'
    and bucket_start = v_day_start;
  v_daily_count := coalesce(v_daily_count, 0);

  select request_count into v_minute_count
  from public.ai_usage_buckets
  where feature = p_feature
    and subject_hash = p_subject_hash
    and bucket_kind = 'minute'
    and bucket_start = v_minute_start;
  v_minute_count := coalesce(v_minute_count, 0);

  if v_global_count >= p_global_daily_limit then
    v_retry_after := greatest(1, extract(epoch from (v_day_start + interval '1 day' - v_now))::integer);
    return jsonb_build_object('allowed', false, 'reason', 'global_daily', 'retry_after_seconds', v_retry_after);
  end if;

  if v_daily_count >= p_daily_limit then
    v_retry_after := greatest(1, extract(epoch from (v_day_start + interval '1 day' - v_now))::integer);
    return jsonb_build_object('allowed', false, 'reason', 'daily', 'retry_after_seconds', v_retry_after);
  end if;

  if v_minute_count >= p_minute_limit then
    v_retry_after := greatest(1, extract(epoch from (v_minute_start + interval '1 minute' - v_now))::integer);
    return jsonb_build_object('allowed', false, 'reason', 'minute', 'retry_after_seconds', v_retry_after);
  end if;

  insert into public.ai_usage_buckets (feature, subject_hash, bucket_kind, bucket_start, request_count)
  values
    (p_feature, 'global', 'day', v_day_start, 1),
    (p_feature, p_subject_hash, 'day', v_day_start, 1),
    (p_feature, p_subject_hash, 'minute', v_minute_start, 1)
  on conflict (feature, subject_hash, bucket_kind, bucket_start)
  do update set
    request_count = public.ai_usage_buckets.request_count + 1,
    updated_at = v_now;

  return jsonb_build_object(
    'allowed', true,
    'remaining_daily', p_daily_limit - v_daily_count - 1,
    'remaining_global_daily', p_global_daily_limit - v_global_count - 1
  );
end;
$$;

revoke all on function public.consume_ai_quota(text, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(text, text, integer, integer, integer) to service_role;

