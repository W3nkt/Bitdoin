// Minimal streaming client for Qwen's OpenAI-compatible chat/completions API (DashScope).

export interface QwenToolCallParam {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export type QwenMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string; tool_calls?: QwenToolCallParam[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export interface QwenTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface QwenToolCall {
  name: string
  /** Parsed JSON arguments, or null when the model produced invalid JSON. */
  input: unknown
  /** The arguments exactly as streamed, for logging when they can't be used. */
  rawArguments?: string
}

/** Lets the model choose, or forces a call to one named function. */
export type QwenToolChoice = 'auto' | { type: 'function'; function: { name: string } }

export interface QwenStreamResult {
  toolCalls: QwenToolCall[]
  finishReason: string | null
}

export interface QwenStreamOptions {
  apiKey: string
  baseUrl: string
  model: string
  messages: QwenMessage[]
  tools: QwenTool[]
  toolChoice?: QwenToolChoice
  timeoutMs: number
  onText: (text: string) => void
  fetchFn?: typeof fetch
}

/** Non-2xx response from Qwen. `code` is DashScope's error code, e.g. "data_inspection_failed". */
export class QwenError extends Error {
  constructor(readonly status: number, readonly code: string | null, message: string) {
    super(message)
    this.name = 'QwenError'
  }
}

export class QwenTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Qwen did not finish within ${timeoutMs}ms`)
    this.name = 'QwenTimeoutError'
  }
}

interface StreamChunk {
  choices?: {
    delta?: {
      content?: string | null
      tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[]
    }
    finish_reason?: string | null
  }[]
}

export async function streamQwenChat(options: QwenStreamOptions): Promise<QwenStreamResult> {
  const fetchFn = options.fetchFn ?? fetch
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs)

  try {
    let response: Response
    try {
      response = await fetchFn(`${options.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${options.apiKey}` },
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          tools: options.tools,
          ...(options.toolChoice ? { tool_choice: options.toolChoice } : {}),
          parallel_tool_calls: true,
          stream: true,
          enable_thinking: false,
          temperature: 0.4,
          // Lao and Thai text is token-heavy; a cut-off tool call can't be parsed.
          max_tokens: 3000,
        }),
        signal: controller.signal,
      })
    } catch (error) {
      if (controller.signal.aborted) throw new QwenTimeoutError(options.timeoutMs)
      throw error
    }

    if (!response.ok || !response.body) {
      let code: string | null = null
      let message = ''
      try {
        const body = await response.json()
        code = body?.error?.code ?? body?.code ?? null
        message = body?.error?.message ?? body?.message ?? ''
      } catch {
        // Non-JSON errors still carry a useful status.
      }
      throw new QwenError(response.status, code, `Qwen API error (${response.status})${message ? `: ${message}` : ''}`)
    }

    // Tool call arguments arrive in fragments keyed by index; a new id at the same index starts a new call.
    const calls: { index: number; id: string; name: string; args: string }[] = []
    let finishReason: string | null = null
    let buffer = ''
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()

    const handleLine = (line: string) => {
      if (!line.startsWith('data:')) return
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') return
      const chunk = JSON.parse(payload) as StreamChunk
      const choice = chunk.choices?.[0]
      if (!choice) return
      if (choice.delta?.content) options.onText(choice.delta.content)
      for (const fragment of choice.delta?.tool_calls ?? []) {
        const index = fragment.index ?? 0
        let call = calls.findLast(c => c.index === index)
        if (!call || (fragment.id && call.id && fragment.id !== call.id)) {
          call = { index, id: '', name: '', args: '' }
          calls.push(call)
        }
        if (fragment.id && !call.id) call.id = fragment.id
        call.name += fragment.function?.name ?? ''
        call.args += fragment.function?.arguments ?? ''
      }
      if (choice.finish_reason) finishReason = choice.finish_reason
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += value
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        lines.forEach(handleLine)
      }
      handleLine(buffer)
    } catch (error) {
      if (controller.signal.aborted) throw new QwenTimeoutError(options.timeoutMs)
      throw error
    }

    return {
      finishReason,
      toolCalls: calls
        .filter(call => call.name)
        .map(call => ({ name: call.name, input: parseArguments(call.args), rawArguments: call.args })),
    }
  } finally {
    clearTimeout(timeout)
  }
}

function parseArguments(raw: string): unknown {
  if (!raw.trim()) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
