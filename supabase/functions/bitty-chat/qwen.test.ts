import { assertEquals, assertInstanceOf, assertRejects } from 'jsr:@std/assert@1'
import { QwenError, type QwenStreamOptions, QwenTimeoutError, streamQwenChat } from './qwen.ts'

function sseBody(chunks: unknown[], splitAt = 7): ReadableStream<Uint8Array> {
  const text = chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`).join('') + 'data: [DONE]\n\n'
  const encoder = new TextEncoder()
  // Deliver the stream in small pieces so lines are split across reads, like a real network.
  const pieces: string[] = []
  for (let i = 0; i < text.length; i += splitAt) pieces.push(text.slice(i, i + splitAt))
  return new ReadableStream({
    start(controller) {
      pieces.forEach(piece => controller.enqueue(encoder.encode(piece)))
      controller.close()
    },
  })
}

function options(fetchFn: typeof fetch, overrides: Partial<QwenStreamOptions> = {}) {
  const texts: string[] = []
  const opts: QwenStreamOptions = {
    apiKey: 'test-key',
    baseUrl: 'https://qwen.test/v1/',
    model: 'qwen-plus',
    messages: [{ role: 'system', content: 'sys' }, { role: 'user', content: 'hi' }],
    tools: [],
    timeoutMs: 1000,
    onText: text => texts.push(text),
    fetchFn,
    ...overrides,
  }
  return { opts, texts }
}

Deno.test('streams text and assembles fragmented parallel tool calls', async () => {
  let request: { url: string; init: RequestInit } | null = null
  const fetchFn = ((url: string, init: RequestInit) => {
    request = { url, init }
    return Promise.resolve(new Response(sseBody([
      { choices: [{ delta: { content: 'What level ' } }] },
      { choices: [{ delta: { content: 'are you at?' } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, id: 'c1', function: { name: 'show_quick_replies', arguments: '{"question":"Level?",' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 1, id: 'c2', function: { name: 'recommend_books', arguments: '{"books":[]}' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '"options":["Beginner"]}' } }] } }] },
      { choices: [{ delta: {}, finish_reason: 'tool_calls' }] },
    ])))
  }) as typeof fetch

  const { opts, texts } = options(fetchFn)
  const result = await streamQwenChat(opts)

  assertEquals(texts.join(''), 'What level are you at?')
  assertEquals(result.finishReason, 'tool_calls')
  assertEquals(result.toolCalls.map(({ name, input }) => ({ name, input })), [
    { name: 'show_quick_replies', input: { question: 'Level?', options: ['Beginner'] } },
    { name: 'recommend_books', input: { books: [] } },
  ])

  assertEquals(request!.url, 'https://qwen.test/v1/chat/completions')
  assertEquals((request!.init.headers as Record<string, string>).Authorization, 'Bearer test-key')
  const body = JSON.parse(request!.init.body as string)
  assertEquals([body.model, body.stream, body.enable_thinking, body.parallel_tool_calls], ['qwen-plus', true, false, true])
})

Deno.test('invalid tool arguments become null instead of throwing', async () => {
  const fetchFn = (() => Promise.resolve(new Response(sseBody([
    { choices: [{ delta: { tool_calls: [{ index: 0, function: { name: 'recommend_books', arguments: '{"books":[' } }] } }] },
    { choices: [{ delta: {}, finish_reason: 'length' }] },
  ])))) as typeof fetch
  const result = await streamQwenChat(options(fetchFn).opts)
  // The raw text is kept so the server can log why the call was unusable.
  assertEquals(result.toolCalls, [{ name: 'recommend_books', input: null, rawArguments: '{"books":[' }])
})

Deno.test('HTTP errors become QwenError with status and DashScope code', async () => {
  const fetchFn = (() => Promise.resolve(new Response(
    JSON.stringify({ error: { code: 'data_inspection_failed', message: 'Input data may contain inappropriate content.' } }),
    { status: 400 },
  ))) as typeof fetch
  const error = await assertRejects(() => streamQwenChat(options(fetchFn).opts), QwenError)
  assertEquals([error.status, error.code], [400, 'data_inspection_failed'])
})

Deno.test('a slow provider raises QwenTimeoutError', async () => {
  const fetchFn = ((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
  })) as typeof fetch
  const error = await assertRejects(() => streamQwenChat(options(fetchFn, { timeoutMs: 20 }).opts))
  assertInstanceOf(error, QwenTimeoutError)
})

Deno.test('a new call id at a reused index starts a separate tool call', async () => {
  const fetchFn = (() => Promise.resolve(new Response(sseBody([
    { choices: [{ delta: { tool_calls: [{ index: 0, id: 'a', function: { name: 'show_quick_replies', arguments: '{"question":"Q","options":["x"]}' } }] } }] },
    { choices: [{ delta: { tool_calls: [{ index: 0, id: 'b', function: { name: 'recommend_books', arguments: '{"books":[]}' } }] } }] },
    { choices: [{ delta: {}, finish_reason: 'tool_calls' }] },
  ])))) as typeof fetch
  const result = await streamQwenChat(options(fetchFn).opts)
  assertEquals(result.toolCalls.map(call => call.name), ['show_quick_replies', 'recommend_books'])
})

Deno.test('a forced tool choice is sent to Qwen and max_tokens leaves room for Lao text', async () => {
  let body: Record<string, unknown> = {}
  const fetchFn = ((_url: string, init: RequestInit) => {
    body = JSON.parse(init.body as string)
    return Promise.resolve(new Response(sseBody([{ choices: [{ delta: {}, finish_reason: 'stop' }] }])))
  }) as typeof fetch
  await streamQwenChat(options(fetchFn, { toolChoice: { type: 'function', function: { name: 'recommend_books' } } }).opts)
  assertEquals(body.tool_choice, { type: 'function', function: { name: 'recommend_books' } })
  assertEquals(body.max_tokens, 3000)
})
