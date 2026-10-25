// Score-book scanning (P2-OCR #48, migration 139). Actions:
//   process  (student's JWT) store the compressed photo in the private bucket,
//            extract with Qwen-VL twice (self-consistency), validate, save
//   image    (student's JWT) a 60-second link to the photo of the caller's job
//   purge    (scheduled; idempotent) remove photos whose retention is over or
//            whose deletion was asked for (OCR-011)
// The function never writes scores: confirmation is the student's (OCR-006).
// PRIV-006: the client strips EXIF by re-encoding; only the photo and the
// student's subject names go to the provider, never their name or ids.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { analyzeImageWithQwen } from '../_shared/qwen-vision.ts'
import { buildExtraction, buildPrompt, parseModelJson, PROMPT_VERSION, validateModelOutput, type ModelOutput, type Scale } from './extract.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const OCR_MODEL = Deno.env.get('QWEN_OCR_MODEL') || Deno.env.get('QWEN_VISION_MODEL') || 'qwen3-vl-plus'
const OCR_PASSES = Number(Deno.env.get('OCR_PASSES') ?? '2') >= 2 ? 2 : 1
const BUCKET = 'academic-ocr'
const MAX_BYTES = 3 * 1024 * 1024
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(origin => origin.trim()).filter(Boolean)

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.length === 0 ? '*' : ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })
}

async function caller(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  return error ? null : data.user
}

function decodeJpeg(base64: string) {
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0))
  if (bytes.length === 0 || bytes.length > MAX_BYTES) throw new Error('image_size')
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('image_type')
  return bytes
}

/** One model pass, retried once if the reply fails schema validation (OCR-004). */
async function readPage(base64: string, prompt: string, deadline: number): Promise<ModelOutput> {
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - Date.now()
    if (remaining < 3000) break
    try {
      const reply = await analyzeImageWithQwen({ base64, mimeType: 'image/jpeg' }, prompt, Math.min(remaining, 40000), { model: OCR_MODEL, maxTokens: 4000 })
      return validateModelOutput(parseModelJson(reply.content))
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error('timeout')
}

async function processJob(req: Request, body: Record<string, unknown>) {
  const user = await caller(req)
  if (!user) return json(req, { error: { code: 'UNAUTHORIZED', status: 401 } }, 401)
  const jobId = String(body.job_id ?? '')
  let image: Uint8Array
  try {
    image = decodeJpeg(String(body.image_base64 ?? ''))
  } catch (error) {
    return json(req, { error: { code: 'VALIDATION_FAILED', status: 400, message: (error as Error).message } }, 400)
  }

  const path = `${user.id}/${jobId}.jpg`
  const { data: claimed, error: claimError } = await admin.rpc('academic_ocr_begin', { p_job_id: jobId, p_user_id: user.id, p_storage_path: path, p_image_bytes: image.length })
  if (claimError || !claimed) return json(req, { error: { code: 'NOT_FOUND', status: 404 } }, 404)

  const started = Date.now()
  const deadline = started + 55000
  try {
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, image, { contentType: 'image/jpeg', upsert: false })
    if (uploadError) throw new Error('storage')
    const scale = claimed.scale as Scale
    const prompt = buildPrompt(claimed.subjects ?? [], scale)
    const base64 = String(body.image_base64)
    const passes = await Promise.all(Array.from({ length: OCR_PASSES }, () => readPage(base64, prompt, deadline)))
    const extraction = buildExtraction(passes[0], passes[1] ?? null, scale, {
      model_id: OCR_MODEL,
      image_quality: typeof body.image_quality === 'object' && body.image_quality ? body.image_quality as Record<string, number> : undefined,
      processing_ms: Date.now() - started,
    })
    const { data: done, error } = await admin.rpc('academic_ocr_complete', {
      p_job_id: jobId, p_extraction: extraction, p_model_id: OCR_MODEL, p_prompt_version: PROMPT_VERSION, p_latency_ms: Date.now() - started,
    })
    if (error || !done) throw new Error('save')
    return json(req, done)
  } catch (error) {
    const message = (error as Error).message ?? ''
    const code = /timed out|timeout/i.test(message) ? 'timeout' : message === 'storage' ? 'storage' : /JSON|reply|period|row|month|score|subject/i.test(message) ? 'schema_invalid' : 'provider_error'
    await admin.rpc('academic_ocr_fail', { p_job_id: jobId, p_error_code: code, p_model_id: OCR_MODEL, p_latency_ms: Date.now() - started })
    return json(req, { error: { code: 'OCR_FAILED', status: 502, reason: code } }, 502)
  }
}

async function imageLink(req: Request, body: Record<string, unknown>) {
  const user = await caller(req)
  if (!user) return json(req, { error: { code: 'UNAUTHORIZED', status: 401 } }, 401)
  const { data: job } = await admin.from('academic_ocr_jobs')
    .select('storage_path, image_deleted_at, image_delete_requested_at, academic_student_profiles!inner(user_id)')
    .eq('id', String(body.job_id ?? '')).eq('academic_student_profiles.user_id', user.id).maybeSingle()
  if (!job?.storage_path || job.image_deleted_at || job.image_delete_requested_at) return json(req, { error: { code: 'NOT_FOUND', status: 404 } }, 404)
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(job.storage_path, 60)
  if (error || !data) return json(req, { error: { code: 'NOT_FOUND', status: 404 } }, 404)
  return json(req, { url: data.signedUrl })
}

async function purge(req: Request) {
  const { data: due, error } = await admin.rpc('academic_ocr_images_due', { p_limit: 200 })
  if (error) return json(req, { error: { code: 'PURGE_FAILED', status: 500 } }, 500)
  const paths = (due ?? []).map((row: { storage_path: string }) => row.storage_path)
  if (paths.length === 0) return json(req, { removed: 0 })
  const { error: removeError } = await admin.storage.from(BUCKET).remove(paths)
  if (removeError) return json(req, { error: { code: 'PURGE_FAILED', status: 500 } }, 500)
  await admin.rpc('academic_ocr_images_deleted', { p_paths: paths })
  return json(req, { removed: paths.length })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: { code: 'METHOD_NOT_ALLOWED', status: 405 } }, 405)
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json(req, { error: { code: 'VALIDATION_FAILED', status: 400 } }, 400)
  }
  if (body.action === 'purge') return purge(req)
  if (body.action === 'image') return imageLink(req, body)
  return processJob(req, body)
})
