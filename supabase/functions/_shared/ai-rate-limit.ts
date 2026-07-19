type SupabaseAdmin = {
  rpc: (name: string, params: Record<string, unknown>) => PromiseLike<{
    data: unknown
    error: { message?: string } | null
  }>
}

export type AiQuota = {
  allowed: boolean
  reason?: 'minute' | 'daily' | 'global_daily'
  retry_after_seconds?: number
  remaining_daily?: number
  remaining_global_daily?: number
}

export function positiveIntEnv(name: string, fallback: number) {
  const value = Number(Deno.env.get(name))
  return Number.isSafeInteger(value) && value > 0 ? value : fallback
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function userSubject(userId: string) {
  return sha256(`user:${userId}`)
}

export async function requestSubject(req: Request, pepper: string) {
  const forwarded = req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-real-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown'
  return sha256(`ip:${forwarded.slice(0, 64)}:${pepper}`)
}

export async function consumeAiQuota(
  admin: SupabaseAdmin,
  options: {
    feature: string
    subjectHash: string
    minuteLimit: number
    dailyLimit: number
    globalDailyLimit: number
  },
): Promise<AiQuota> {
  const { data, error } = await admin.rpc('consume_ai_quota', {
    p_feature: options.feature,
    p_subject_hash: options.subjectHash,
    p_minute_limit: options.minuteLimit,
    p_daily_limit: options.dailyLimit,
    p_global_daily_limit: options.globalDailyLimit,
  })
  if (error) throw new Error(`AI quota check failed: ${error.message ?? 'unknown database error'}`)
  const quota = data as AiQuota | null
  if (!quota || typeof quota.allowed !== 'boolean') throw new Error('AI quota check returned an invalid result')
  return quota
}

export function quotaResponse(
  req: Request,
  quota: AiQuota,
  corsHeaders: (req: Request) => Record<string, string>,
) {
  const retryAfter = Math.max(1, quota.retry_after_seconds ?? 60)
  const platformBusy = quota.reason === 'global_daily'
  return new Response(JSON.stringify({
    error: platformBusy
      ? 'AI is temporarily at capacity. Please try again later.'
      : quota.reason === 'daily'
        ? 'You have reached today’s AI usage limit. Please try again tomorrow.'
        : 'Too many AI requests. Please wait a moment and try again.',
    code: `AI_RATE_LIMIT_${quota.reason?.toUpperCase() ?? 'UNKNOWN'}`,
    retryAfterSeconds: retryAfter,
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfter),
      ...corsHeaders(req),
    },
  })
}
