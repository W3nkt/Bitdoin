import { fetchWithTimeout } from './timed-fetch.ts'

const QWEN_API_KEY = Deno.env.get('QWEN_API_KEY') ?? ''
const QWEN_BASE_URL = (Deno.env.get('QWEN_BASE_URL') ?? 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '')
const QWEN_VISION_MODEL = Deno.env.get('QWEN_VISION_MODEL') ?? 'qwen3-vl-plus'

export interface QwenVisionResult {
  model: string
  content: string
}

export async function analyzeImageWithQwen(
  image: { base64: string; mimeType: string },
  prompt: string,
  timeoutMs: number,
): Promise<QwenVisionResult> {
  if (!QWEN_API_KEY) throw new Error('QWEN_API_KEY not configured')

  const response = await fetchWithTimeout(
    `${QWEN_BASE_URL}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: QWEN_VISION_MODEL,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
              // Preserve small Lao/Thai text and transaction identifiers for OCR.
              min_pixels: 65536,
              max_pixels: 4194304,
            },
            { type: 'text', text: prompt },
          ],
        }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1200,
      }),
    },
    timeoutMs,
  )

  if (!response.ok) {
    const requestId = response.headers.get('x-request-id')
    throw new Error(`Qwen vision API error (${response.status})${requestId ? ` [${requestId}]` : ''}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Qwen vision API returned an empty response')
  }

  return { model: QWEN_VISION_MODEL, content }
}
