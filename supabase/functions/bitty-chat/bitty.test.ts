import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert@1'
import { QwenError, QwenTimeoutError } from './qwen.ts'
import type { AiQuota } from '../_shared/ai-rate-limit.ts'
import {
  type BittyDeps,
  type BittyErrorCode,
  type BittyEvent,
  buildCatalog,
  classifyModelError,
  extractInlineRecommendations,
  endsWithQuestion,
  extractListedOptions,
  findCatalogBook,
  formatPlans,
  createBittyHandler,
  MAX_MESSAGES,
  MAX_USER_CHARS,
  type ModelInput,
  type ModelResult,
  parseBittyRequest,
  resolveRecommendations,
  sanitizeQuickReplies,
  toModelMessages,
  shortDescription,
  stripCatalogRefs,
  stripToolNames,
} from './bitty.ts'

const ROWS = [
  {
    id: 'a-1',
    title: 'Money Basics',
    author: 'Kham',
    language: 'Lao',
    description: '<h2>About</h2><p>Saving &amp; budgeting for beginners.</p>',
    cover_image_url: 'https://example.com/a.jpg',
    category: { name_en: 'Business' },
    prices: [
      { final_price: 90000, availability: 'OUT_OF_STOCK' },
      { final_price: 120000, availability: 'AVAILABLE' },
    ],
  },
  {
    id: 'b-2',
    title: 'Deep Python',
    author: null,
    language: 'English',
    description: null,
    cover_image_url: null,
    category: [{ name_en: 'Education' }],
    prices: [{ final_price: 250000, availability: 'OUT_OF_STOCK' }],
  },
  {
    id: 'c-3',
    title: 'Thai Stories',
    author: 'Somchai',
    language: 'Thai',
    description: 'Short stories.',
    cover_image_url: null,
    category: null,
    prices: [],
  },
  {
    id: 'd-4',
    title: 'History of Laos',
    author: 'Bounmy',
    language: 'Lao',
    description: 'A history.',
    cover_image_url: null,
    category: { name_en: 'History' },
    prices: [{ final_price: 80000, availability: 'LOW_STOCK' }],
  },
]
const CATALOG = buildCatalog(ROWS)

const ALLOWED: AiQuota = { allowed: true }

function makeDeps(overrides: Partial<BittyDeps> = {}) {
  const calls: { modelInputs: ModelInput[]; subjects: string[] } = { modelInputs: [], subjects: [] }
  const deps: BittyDeps = {
    corsHeaders: () => ({ 'Access-Control-Allow-Origin': '*' }),
    identify: () => Promise.resolve('subject-hash'),
    consumeQuota: subject => {
      calls.subjects.push(subject)
      return Promise.resolve(ALLOWED)
    },
    quotaResponse: (_req, quota) => new Response(JSON.stringify({ code: `AI_RATE_LIMIT_${quota.reason?.toUpperCase()}` }), {
      status: 429,
      headers: { 'Retry-After': String(quota.retry_after_seconds ?? 60) },
    }),
    loadCatalog: () => Promise.resolve(CATALOG),
    runModel: (input) => {
      calls.modelInputs.push(input)
      return Promise.resolve({ toolCalls: [], finishReason: 'stop' })
    },
    logError: () => {},
    ...overrides,
  }
  return { deps, calls }
}

function post(body: unknown) {
  return new Request('http://localhost/bitty-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const VALID_BODY = {
  uiLanguage: 'en',
  messages: [
    { role: 'assistant', content: 'Hi, I am Bitty! What are you reading for?' },
    { role: 'user', content: 'I want to learn about money' },
  ],
}

async function readEvents(response: Response): Promise<BittyEvent[]> {
  const text = await response.text()
  return text
    .split('\n\n')
    .filter(chunk => chunk.startsWith('data: '))
    .map(chunk => JSON.parse(chunk.slice(6)) as BittyEvent)
}

function modelReturning(result: ModelResult, texts: string[] = []): BittyDeps['runModel'] {
  return (_input, onText) => {
    texts.forEach(onText)
    return Promise.resolve(result)
  }
}

// ─── HTTP behaviour ──────────────────────────────────────────────────────────

Deno.test('OPTIONS returns CORS headers', async () => {
  const handler = createBittyHandler(makeDeps().deps)
  const response = await handler(new Request('http://localhost/bitty-chat', { method: 'OPTIONS' }))
  assertEquals(response.status, 200)
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*')
})

Deno.test('non-POST requests are rejected with 405', async () => {
  const handler = createBittyHandler(makeDeps().deps)
  const response = await handler(new Request('http://localhost/bitty-chat'))
  assertEquals(response.status, 405)
})

Deno.test('invalid JSON and invalid bodies return 400 without using quota', async () => {
  const { deps, calls } = makeDeps()
  const handler = createBittyHandler(deps)
  const bodies: unknown[] = [
    '{not json',
    {},
    { messages: [] },
    { messages: [{ role: 'system', content: 'hi' }] },
    { messages: [{ role: 'user', content: '   ' }] },
    { messages: [{ role: 'user', content: 'x'.repeat(MAX_USER_CHARS + 1) }] },
    { messages: Array.from({ length: MAX_MESSAGES + 1 }, () => ({ role: 'user', content: 'hi' })) },
    { messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }] },
  ]
  for (const body of bodies) {
    const response = await handler(post(body))
    assertEquals(response.status, 400, `expected 400 for ${JSON.stringify(body)}`)
    assertEquals((await response.json()).code, 'bad_request')
  }
  assertEquals(calls.subjects.length, 0)
})

Deno.test('rate-limited callers get 429 and the model is not called', async () => {
  const { deps, calls } = makeDeps({
    consumeQuota: () => Promise.resolve({ allowed: false, reason: 'minute', retry_after_seconds: 30 }),
  })
  const response = await createBittyHandler(deps)(post(VALID_BODY))
  assertEquals(response.status, 429)
  assertEquals(response.headers.get('Retry-After'), '30')
  assertEquals((await response.json()).code, 'AI_RATE_LIMIT_MINUTE')
  assertEquals(calls.modelInputs.length, 0)
})

Deno.test('catalog failures return a friendly 503', async () => {
  const { deps } = makeDeps({ loadCatalog: () => Promise.reject(new Error('db down')) })
  const response = await createBittyHandler(deps)(post(VALID_BODY))
  assertEquals(response.status, 503)
  assertEquals((await response.json()).code, 'unavailable')
})

Deno.test('streams text, quick replies and validated recommendations', async () => {
  const inputs: ModelInput[] = []
  const { deps } = makeDeps({
    runModel: (input, onText) => {
      inputs.push(input)
      onText('Here are ')
      onText('some picks.')
      return Promise.resolve({
        finishReason: 'tool_calls',
        toolCalls: [
          {
            name: 'recommend_books',
            input: {
              books: [
                { ref: 'B1', reason: 'Great for beginners.' },
                { ref: 'B99', reason: 'Invented book.' },
                { ref: 'b1', reason: 'Duplicate.' },
                { ref: 'B4', reason: 'Lao history.' },
              ],
            },
          },
          { name: 'show_quick_replies', input: { options: ['More like this', 'Another language', 'More like this'] } },
        ],
      })
    },
  })

  const response = await createBittyHandler(deps)(post(VALID_BODY))
  assertEquals(response.status, 200)
  assertEquals(response.headers.get('Content-Type'), 'text/event-stream; charset=utf-8')

  const events = await readEvents(response)
  assertEquals(events.filter(e => e.type === 'text').map(e => (e as { text: string }).text).join(''), 'Here are some picks.')

  const recommendations = events.find(e => e.type === 'recommendations') as Extract<BittyEvent, { type: 'recommendations' }>
  assertEquals(recommendations.books.map(b => b.id), ['a-1', 'd-4'])
  assertEquals(recommendations.books[0].price, 120000)
  assertEquals(recommendations.books[0].reason, 'Great for beginners.')

  const quickReplies = events.find(e => e.type === 'quick_replies') as Extract<BittyEvent, { type: 'quick_replies' }>
  assertEquals(quickReplies.options, ['More like this', 'Another language'])
  assertEquals(events.at(-1), { type: 'done' })

  // The system prompt comes first, and the client greeting is dropped so the conversation starts with a user turn.
  const [system, ...turns] = inputs[0].messages
  assertEquals(turns, [{ role: 'user', content: 'I want to learn about money' }])
  assertEquals(system.role, 'system')
  // The catalog is in the system prompt, and only real catalog languages are offered.
  assertStringIncludes(system.content, 'B1 | Money Basics | by Kham | Lao | Business | 120000 LAK | in stock | About Saving & budgeting for beginners.')
  assertStringIncludes(system.content, '(English, Lao, Thai)')
  assertStringIncludes(system.content, 'Reply in English')
  assertEquals(inputs[0].tools.map(t => t.function.name), ['show_quick_replies', 'recommend_books', 'decline_off_topic'])
})

Deno.test('a quick-reply question is shown when Qwen writes no text', async () => {
  const { deps } = makeDeps({
    runModel: modelReturning({
      finishReason: 'tool_calls',
      toolCalls: [{ name: 'show_quick_replies', input: { question: 'What level are you at?', options: ['Beginner', 'Advanced'] } }],
    }),
  })
  const events = await readEvents(await createBittyHandler(deps)(post(VALID_BODY)))
  assertEquals(events, [
    { type: 'text', text: 'What level are you at?' },
    { type: 'quick_replies', options: ['Beginner', 'Advanced'] },
    { type: 'done' },
  ])
})

Deno.test('the quick-reply question is not repeated when Qwen already wrote it', async () => {
  const { deps } = makeDeps({
    runModel: modelReturning({
      finishReason: 'tool_calls',
      toolCalls: [{ name: 'show_quick_replies', input: { question: 'Level?', options: ['Beginner'] } }],
    }, ['What level are you at?']),
  })
  const events = await readEvents(await createBittyHandler(deps)(post(VALID_BODY)))
  assertEquals(events.filter(e => e.type === 'text'), [{ type: 'text', text: 'What level are you at?' }])
})

Deno.test('off-topic questions produce an off_topic event and no recommendations', async () => {
  const { deps } = makeDeps({
    runModel: modelReturning({
      finishReason: 'tool_calls',
      toolCalls: [
        { name: 'decline_off_topic', input: {} },
        { name: 'recommend_books', input: { books: [{ ref: 'B1', reason: 'x' }] } },
      ],
    }),
  })
  const events = await readEvents(await createBittyHandler(deps)(post({
    messages: [{ role: 'user', content: 'What is the capital of France?' }],
  })))
  assertEquals(events, [{ type: 'off_topic' }, { type: 'done' }])
})

Deno.test('content moderation blocks are treated as off-topic', async () => {
  const filtered = makeDeps({ runModel: modelReturning({ finishReason: 'content_filter', toolCalls: [] }) })
  assertEquals(await readEvents(await createBittyHandler(filtered.deps)(post(VALID_BODY))), [{ type: 'off_topic' }, { type: 'done' }])

  const rejected = makeDeps({
    runModel: () => Promise.reject(new QwenError(400, 'data_inspection_failed', 'Input data may contain inappropriate content.')),
  })
  assertEquals(await readEvents(await createBittyHandler(rejected.deps)(post(VALID_BODY))), [{ type: 'off_topic' }, { type: 'done' }])
})

Deno.test('provider failures stream a friendly error code', async () => {
  const cases: [unknown, BittyErrorCode][] = [
    [new QwenError(429, 'Throttling', 'rate limited'), 'busy'],
    [new QwenError(500, 'InternalError', 'boom'), 'unavailable'],
    [new QwenError(503, null, 'overloaded'), 'unavailable'],
    [new QwenError(401, 'InvalidApiKey', 'bad key'), 'unknown'],
    [new QwenTimeoutError(45000), 'timeout'],
    [new TypeError('error sending request'), 'unavailable'],
    [new Error('QWEN_API_KEY is not set'), 'unknown'],
  ]
  for (const [error, code] of cases) {
    const { deps } = makeDeps({ runModel: () => Promise.reject(error) })
    const events = await readEvents(await createBittyHandler(deps)(post(VALID_BODY)))
    assertEquals(events, [{ type: 'error', code }])
  }
})

// ─── Pure helpers ────────────────────────────────────────────────────────────

Deno.test('buildCatalog prefers in-stock prices and assigns stable refs', () => {
  const reversed = buildCatalog([...ROWS].reverse())
  assertEquals(reversed.map(b => b.ref), CATALOG.map(b => b.ref))
  const [money, python, thai, history] = CATALOG
  assertEquals([money.price, money.available], [120000, true])
  assertEquals([python.price, python.available, python.category], [250000, false, 'Education'])
  assertEquals([thai.price, thai.available], [null, false])
  assertEquals([history.price, history.available], [80000, false])
})

Deno.test('shortDescription strips HTML and truncates long text', () => {
  assertEquals(shortDescription('<p>Hello&nbsp;<b>world</b></p>'), 'Hello world')
  assertEquals(shortDescription('<p> </p>'), null)
  assertEquals(shortDescription(null), null)
  const long = shortDescription('word '.repeat(200))!
  assert(long.length <= 281)
  assert(long.endsWith('…'))
})

Deno.test('resolveRecommendations caps at three books', () => {
  const books = resolveRecommendations({
    books: ['B1', 'B2', 'B3', 'B4'].map(ref => ({ ref, reason: 'fits' })),
  }, CATALOG)
  assertEquals(books.length, 3)
  assertEquals(resolveRecommendations({ books: 'nope' }, CATALOG), [])
  assertEquals(resolveRecommendations(null, CATALOG), [])
})

Deno.test('sanitizeQuickReplies trims, dedupes and caps options', () => {
  assertEquals(sanitizeQuickReplies({ options: [' A ', 'A', '', 3, 'B'] }), ['A', 'B'])
  assertEquals(sanitizeQuickReplies({ options: Array.from({ length: 10 }, (_, i) => `o${i}`) }).length, 6)
  assertEquals(sanitizeQuickReplies(undefined), [])
})

Deno.test('parseBittyRequest defaults the UI language to Lao', () => {
  const parsed = parseBittyRequest({ messages: [{ role: 'user', content: 'hi' }], uiLanguage: 'fr' })
  assert(typeof parsed !== 'string')
  assertEquals(parsed.uiLanguage, 'lo')
  assertEquals(classifyModelError('weird'), 'unknown')
})

// ─── History replay ──────────────────────────────────────────────────────────

Deno.test('earlier quick replies, cards and declines are replayed as tool calls', () => {
  const parsed = parseBittyRequest({
    uiLanguage: 'en',
    messages: [
      { role: 'assistant', content: 'Greeting' },
      { role: 'user', content: 'Learn a skill' },
      { role: 'assistant', content: 'Which language?', options: ['Lao', 'Thai'] },
      { role: 'user', content: 'Lao' },
      { role: 'assistant', content: 'Try these:', bookIds: ['a-1', 'gone-from-catalog'] },
      { role: 'user', content: 'Tell me a joke' },
      { role: 'assistant', content: '', offTopic: true },
      { role: 'user', content: 'Something about history' },
    ],
  })
  assert(typeof parsed !== 'string')

  const messages = toModelMessages(parsed.messages, CATALOG)
  // No text notes for the model to imitate.
  assert(messages.every(m => !m.content.includes('[Options shown')))
  assertEquals(messages, [
    { role: 'user', content: 'Learn a skill' },
    {
      role: 'assistant',
      content: 'Which language?',
      tool_calls: [{
        id: 'call_1_0',
        type: 'function',
        function: { name: 'show_quick_replies', arguments: '{"question":"Which language?","options":["Lao","Thai"]}' },
      }],
    },
    { role: 'tool', tool_call_id: 'call_1_0', content: 'Shown to the customer.' },
    { role: 'user', content: 'Lao' },
    {
      role: 'assistant',
      content: 'Try these:',
      tool_calls: [{ id: 'call_3_0', type: 'function', function: { name: 'recommend_books', arguments: '{"books":[{"ref":"B1","reason":""}]}' } }],
    },
    { role: 'tool', tool_call_id: 'call_3_0', content: 'Shown to the customer.' },
    { role: 'user', content: 'Tell me a joke' },
    {
      role: 'assistant',
      content: '',
      tool_calls: [{ id: 'call_5_0', type: 'function', function: { name: 'decline_off_topic', arguments: '{}' } }],
    },
    { role: 'tool', tool_call_id: 'call_5_0', content: 'Shown to the customer.' },
    { role: 'user', content: 'Something about history' },
  ])
})

Deno.test('assistant history fields are validated', () => {
  const bad: unknown[] = [
    { role: 'assistant', content: 'Q?', options: 'Lao' },
    { role: 'assistant', content: 'Q?', options: Array.from({ length: 7 }, () => 'x') },
    { role: 'assistant', content: 'Q?', bookIds: [1] },
    { role: 'assistant', content: '' },
  ]
  for (const turn of bad) {
    const result = parseBittyRequest({ messages: [{ role: 'user', content: 'hi' }, turn, { role: 'user', content: 'ok' }] })
    assertEquals(typeof result, 'string', JSON.stringify(turn))
  }
})

// ─── Books listed as text ────────────────────────────────────────────────────

Deno.test('books listed as text with refs become recommendation cards', async () => {
  const { deps } = makeDeps({
    runModel: modelReturning({ finishReason: 'stop', toolCalls: [] }, [
      'Here are some books:\nB1: Money Basics – Great for learning to save.\n',
      'B99: Invented – not real\nB4: History of Laos (History) – A clear look at the past.',
    ]),
  })
  const events = await readEvents(await createBittyHandler(deps)(post(VALID_BODY)))
  const replaced = events.find(e => e.type === 'replace_text') as Extract<BittyEvent, { type: 'replace_text' }>
  assertEquals(replaced.text, 'Here are some books:')
  const recs = events.find(e => e.type === 'recommendations') as Extract<BittyEvent, { type: 'recommendations' }>
  assertEquals(recs.books.map(b => [b.id, b.reason]), [
    ['a-1', 'Great for learning to save.'],
    ['d-4', 'A clear look at the past.'],
  ])
  assertEquals(events.at(-1), { type: 'done' })
})

Deno.test('refs are stripped from text when the tool was used', async () => {
  const { deps } = makeDeps({
    runModel: modelReturning({
      finishReason: 'tool_calls',
      toolCalls: [{ name: 'recommend_books', input: { books: [{ ref: 'B1', reason: 'fits' }] } }],
    }, ['Try Money Basics (B1) first.']),
  })
  const events = await readEvents(await createBittyHandler(deps)(post(VALID_BODY)))
  assertEquals(events.filter(e => e.type === 'replace_text'), [{ type: 'replace_text', text: 'Try Money Basics first.' }])
  assertEquals(events.filter(e => e.type === 'recommendations').length, 1)
})

Deno.test('plain replies without refs are left alone', async () => {
  const { deps } = makeDeps({ runModel: modelReturning({ finishReason: 'stop', toolCalls: [] }, ['What topics do you like?']) })
  const events = await readEvents(await createBittyHandler(deps)(post(VALID_BODY)))
  assertEquals(events, [{ type: 'text', text: 'What topics do you like?' }, { type: 'done' }])
})

Deno.test('inline extraction caps at three books and strips bullets', () => {
  const text = ['• B1: A – one', '- B2: B – two', '1. B3: C – three', 'B4: D – four'].join('\n')
  const result = extractInlineRecommendations(text, CATALOG)
  assertEquals(result.books.map(b => b.reason), ['one', 'two', 'three'])
  assertEquals(result.text, '')
  assertEquals(stripCatalogRefs('See B2: and (B3) or B77', CATALOG), 'See and or B77')
})

// ─── Tool names written as text ──────────────────────────────────────────────

Deno.test('a reply that writes "decline_off_topic" as text is treated as off-topic', async () => {
  for (const text of ['decline_off_topic', '`decline_off_topic()`', 'Sorry. decline_off_topic']) {
    const { deps } = makeDeps({ runModel: modelReturning({ finishReason: 'stop', toolCalls: [] }, [text]) })
    const events = await readEvents(await createBittyHandler(deps)(post({
      messages: [{ role: 'user', content: 'If I want to go to Xiengkhouang what should I do?' }],
    })))
    assertEquals(events.slice(-2), [{ type: 'off_topic' }, { type: 'done' }], text)
  }
})

Deno.test('other tool names written as text are stripped', async () => {
  const { deps } = makeDeps({
    runModel: modelReturning({ finishReason: 'stop', toolCalls: [] }, ['Which level suits you? show_quick_replies(["A","B"])']),
  })
  const events = await readEvents(await createBittyHandler(deps)(post(VALID_BODY)))
  assertEquals(events.filter(e => e.type === 'replace_text'), [{ type: 'replace_text', text: 'Which level suits you?' }])
  assertEquals(stripToolNames('Here: `recommend_books`  done'), 'Here: done')
})

// ─── Options written as a list ───────────────────────────────────────────────

const LAO_LIST_REPLY = 'ທ່ານຕ້ອງການຮຽນຮູ້ທັກສະດ້ານໃດ? (ເລືອກຈາກຕົວເລືອກ)\n\n- ການຈັດການເງິນ\n- ການສື່ສານ\n- ການຄິດວິເຄາະ\n- ການຈັດການເວລາ\n- ອື່ນໆ (ຂຽນໄດ້ເອງ)'

Deno.test('a dash list of choices after a question becomes quick replies', async () => {
  const { deps } = makeDeps({ runModel: modelReturning({ finishReason: 'stop', toolCalls: [] }, [LAO_LIST_REPLY]) })
  const events = await readEvents(await createBittyHandler(deps)(post(VALID_BODY)))
  assertEquals(events.slice(1), [
    { type: 'replace_text', text: 'ທ່ານຕ້ອງການຮຽນຮູ້ທັກສະດ້ານໃດ?' },
    { type: 'quick_replies', options: ['ການຈັດການເງິນ', 'ການສື່ສານ', 'ການຄິດວິເຄາະ', 'ການຈັດການເວລາ', 'ອື່ນໆ (ຂຽນໄດ້ເອງ)'] },
    { type: 'done' },
  ])
})

Deno.test('numbered, bulleted and inline choice lists are recognised', () => {
  assertEquals(extractListedOptions('Which level?\n1. Beginner\n2. Intermediate\n3) Advanced'), {
    text: 'Which level?',
    options: ['Beginner', 'Intermediate', 'Advanced'],
  })
  assertEquals(extractListedOptions('Which language?\n• **Lao**\n\n• Thai;'), { text: 'Which language?', options: ['Lao', 'Thai'] })
  assertEquals(extractListedOptions('ທ່ານຕ້ອງການອ່ານເປັນພາສາໃດ?\n(ພາສາລາວ / ພາສາໄທ / ໃຊ້ໄດ້ທຸກພາສາ)'), {
    text: 'ທ່ານຕ້ອງການອ່ານເປັນພາສາໃດ?',
    options: ['ພາສາລາວ', 'ພາສາໄທ', 'ໃຊ້ໄດ້ທຸກພາສາ'],
  })
  assertEquals(extractListedOptions('Which level are you at? (Beginner / Advanced)'), {
    text: 'Which level are you at?',
    options: ['Beginner', 'Advanced'],
  })
})

Deno.test('lists that are not choices for a question are left alone', () => {
  const howTo = 'Want to order? Here is how:\n1. Add books to your cart\n2. Go to checkout'
  assertEquals(extractListedOptions(howTo), { text: howTo, options: [] })
  const notAQuestion = 'Tips for reading:\n- Read daily\n- Take notes'
  assertEquals(extractListedOptions(notAQuestion), { text: notAQuestion, options: [] })
  const oneItem = 'Which level?\n- Beginner'
  assertEquals(extractListedOptions(oneItem), { text: oneItem, options: [] })
  const longItems = `Which?\n- ${'x'.repeat(70)}\n- ${'y'.repeat(70)}`
  assertEquals(extractListedOptions(longItems).options, [])
})

Deno.test('a tool call for quick replies wins over a listed copy in the text', async () => {
  const { deps } = makeDeps({
    runModel: modelReturning({
      finishReason: 'tool_calls',
      toolCalls: [{ name: 'show_quick_replies', input: { question: 'Which level?', options: ['Beginner', 'Advanced'] } }],
    }, ['Which level?\n- Beginner\n- Advanced']),
  })
  const events = await readEvents(await createBittyHandler(deps)(post(VALID_BODY)))
  assertEquals(events.filter(e => e.type === 'quick_replies'), [{ type: 'quick_replies', options: ['Beginner', 'Advanced'] }])
  // The duplicate list is removed from the text.
  assertEquals(events.filter(e => e.type === 'replace_text'), [{ type: 'replace_text', text: 'Which level?' }])
})

// ─── Missing recommendations ─────────────────────────────────────────────────

Deno.test('books can be identified by ref variants, id or title', () => {
  for (const key of ['B4', 'b4', '4', '[B4]', ' B 4 ', 'd-4', 'History of Laos', 'history of laos', 'History']) {
    assertEquals(findCatalogBook(key, CATALOG)?.id, 'd-4', key)
  }
  assertEquals(findCatalogBook('B99', CATALOG), undefined)
  assertEquals(resolveRecommendations({ books: [{ id: 'a-1', reason: 'x' }, { title: 'Deep Python', reason: 'y' }] }, CATALOG).map(b => b.id), ['a-1', 'b-2'])
  assertEquals(resolveRecommendations([{ ref: 'B3', reason: 'z' }], CATALOG).map(b => b.id), ['c-3'])
  assertEquals(resolveRecommendations({ books: ['B1'] }, CATALOG).map(b => b.id), ['a-1'])
})

function scriptedModel(results: ModelResult[], texts: string[][] = []) {
  const inputs: ModelInput[] = []
  const runModel: BittyDeps['runModel'] = (input, onText) => {
    const turn = inputs.length
    inputs.push(input)
    for (const text of texts[turn] ?? []) onText(text)
    return Promise.resolve(results[turn] ?? { toolCalls: [], finishReason: 'stop' })
  }
  return { inputs, runModel }
}

Deno.test('announced books with no tool call trigger one forced retry', async () => {
  const model = scriptedModel([
    { finishReason: 'stop', toolCalls: [] },
    { finishReason: 'tool_calls', toolCalls: [{ name: 'recommend_books', input: { books: [{ ref: 'B4', reason: 'Lao history.' }] } }] },
  ], [['ຂ້າພະເຈົ້າແນະນຳປຶ້ມທີ່ເໝາະສົມກັບຄວາມຕ້ອງການຂອງທ່ານ:']])
  const { deps } = makeDeps({ runModel: model.runModel })
  const events = await readEvents(await createBittyHandler(deps)(post(VALID_BODY)))

  assertEquals(model.inputs.length, 2)
  const retry = model.inputs[1]
  assertEquals(retry.toolChoice, { type: 'function', function: { name: 'recommend_books' } })
  assertEquals(retry.tools.map(t => t.function.name), ['recommend_books'])
  assertEquals(retry.messages.at(-2), { role: 'assistant', content: 'ຂ້າພະເຈົ້າແນະນຳປຶ້ມທີ່ເໝາະສົມກັບຄວາມຕ້ອງການຂອງທ່ານ:' })
  assertEquals(retry.messages.at(-1)?.role, 'user')

  const recs = events.find(e => e.type === 'recommendations') as Extract<BittyEvent, { type: 'recommendations' }>
  assertEquals(recs.books.map(b => b.id), ['d-4'])
  assertEquals(events.at(-1), { type: 'done' })
})

Deno.test('an unusable recommend_books call (cut off or unknown refs) is retried', async () => {
  for (const input of [null, { books: [{ ref: 'B99', reason: 'x' }] }]) {
    const model = scriptedModel([
      { finishReason: 'length', toolCalls: [{ name: 'recommend_books', input, rawArguments: '{"books":[' }] },
      { finishReason: 'tool_calls', toolCalls: [{ name: 'recommend_books', input: { books: [{ ref: 'B1', reason: 'fits' }] } }] },
    ], [['Here you go']])
    const logged: unknown[] = []
    const { deps } = makeDeps({ runModel: model.runModel, logError: (message, detail) => logged.push([message, detail]) })
    const events = await readEvents(await createBittyHandler(deps)(post(VALID_BODY)))
    assertEquals(model.inputs.length, 2, JSON.stringify(input))
    assertEquals((events.find(e => e.type === 'recommendations') as Extract<BittyEvent, { type: 'recommendations' }>).books[0].id, 'a-1')
    assertEquals((logged[0] as [string])[0], 'bitty-chat recommendations missing')
  }
})

Deno.test('if the retry also fails, the customer gets a retryable error instead of a dead end', async () => {
  const model = scriptedModel([
    { finishReason: 'stop', toolCalls: [] },
    { finishReason: 'stop', toolCalls: [] },
  ], [['Here are some books:']])
  const { deps } = makeDeps({ runModel: model.runModel })
  const events = await readEvents(await createBittyHandler(deps)(post(VALID_BODY)))
  assertEquals(events.at(-1), { type: 'error', code: 'unknown' })
  assertEquals(events.some(e => e.type === 'done'), false)
})

Deno.test('ordinary replies do not trigger a retry', async () => {
  for (const text of ['Happy reading!','Which level?\n- Beginner\n- Advanced']) {
    const model = scriptedModel([{ finishReason: 'stop', toolCalls: [] }], [[text]])
    const { deps } = makeDeps({ runModel: model.runModel })
    await readEvents(await createBittyHandler(deps)(post(VALID_BODY)))
    assertEquals(model.inputs.length, 1, text)
  }
})

Deno.test('Academy plan prices from the database reach the platform guide', async () => {
  const { deps, calls } = makeDeps({
    loadPlans: () => Promise.resolve([
      { name: 'Free', priceLak: 0, interval: 'month' },
      { name: 'Premium Monthly', priceLak: 39000, interval: 'month' },
    ]),
  })
  await readEvents(await createBittyHandler(deps)(post(VALID_BODY)))
  const system = calls.modelInputs[0].messages[0].content as string
  assertStringIncludes(system, 'You are Arlin')
  assertStringIncludes(system, 'How to buy books')
  assertStringIncludes(system, '- Premium Monthly: 39,000 LAK per month.')
  assertStringIncludes(system, '- Free: free, needs admin approval, no payment.')
})

Deno.test('a failed plan lookup does not stop the chat', async () => {
  const { deps, calls } = makeDeps({ loadPlans: () => Promise.reject(new Error('db down')) })
  const events = await readEvents(await createBittyHandler(deps)(post(VALID_BODY)))
  assertEquals(events.at(-1), { type: 'done' })
  assertStringIncludes(calls.modelInputs[0].messages[0].content as string, formatPlans([]))
})

Deno.test('example lists in brackets after a question become quick replies', () => {
  assertEquals(
    extractListedOptions('ທ່ານມີຄວາມສົນໃຈເປັນພິເສດກັບຫົວຂໍ້ໃດ? (ເຊັ່ນ: ການຄິດ, ການຈັດການເວລາ, ຈິດຕະວິທະຍາ, ການເງິນ, ແລະອື່ນໆ)'),
    { text: 'ທ່ານມີຄວາມສົນໃຈເປັນພິເສດກັບຫົວຂໍ້ໃດ?', options: ['ການຄິດ', 'ການຈັດການເວລາ', 'ຈິດຕະວິທະຍາ', 'ການເງິນ'] },
  )
  assertEquals(
    extractListedOptions('Which topic interests you? (e.g. Money, Organizing, or History, etc.)'),
    { text: 'Which topic interests you?', options: ['Money', 'Organizing', 'History'] },
  )
  // A bracket after a statement is not a set of choices.
  const note = 'We ship to every province (Vientiane, Luang Prabang, Pakse).'
  assertEquals(extractListedOptions(note), { text: note, options: [] })
})

Deno.test('endsWithQuestion looks only at the last line', () => {
  assert(endsWithQuestion('Great choice.\nWhich level are you at?'))
  assert(endsWithQuestion('Which level? (any is fine)'))
  assert(!endsWithQuestion('Any questions? Here is how:\n1. Add to cart'))
})

Deno.test('a question without buttons asks once more for its choices', async () => {
  const model = scriptedModel([
    { finishReason: 'stop', toolCalls: [] },
    { finishReason: 'tool_calls', toolCalls: [{ name: 'show_quick_replies', input: { question: 'Which topic?', options: ['Money', 'History'] } }] },
  ], [['Which topic do you like?']])
  const { deps } = makeDeps({ runModel: model.runModel })
  const events = await readEvents(await createBittyHandler(deps)(post(VALID_BODY)))
  assertEquals(model.inputs.length, 2)
  assertEquals(model.inputs[1].toolChoice, { type: 'function', function: { name: 'show_quick_replies' } })
  assertEquals(events.filter(e => e.type === 'quick_replies'), [{ type: 'quick_replies', options: ['Money', 'History'] }])
  assertEquals(events.at(-1), { type: 'done' })
})

Deno.test('an open question can stay without buttons', async () => {
  const model = scriptedModel([
    { finishReason: 'stop', toolCalls: [] },
    { finishReason: 'tool_calls', toolCalls: [{ name: 'show_quick_replies', input: { question: 'What is it about?', options: [] } }] },
  ], [['What is the book about?']])
  const { deps } = makeDeps({ runModel: model.runModel })
  const events = await readEvents(await createBittyHandler(deps)(post(VALID_BODY)))
  assertEquals(events.filter(e => e.type === 'quick_replies' || e.type === 'error'), [])
  assertEquals(events.at(-1), { type: 'done' })
})

// ─── Current page ────────────────────────────────────────────────────────────

const PAGE_BOOK_ID = '3f2b8c1e-5a4d-4e7f-9b6a-1c2d3e4f5a6b'

Deno.test('the book page the customer is on reaches the prompt with its full description', async () => {
  const requested: string[] = []
  const { deps, calls } = makeDeps({
    loadBookPage: id => {
      requested.push(id)
      return Promise.resolve({
        id: 'a-1',
        title: 'Money Basics',
        author: 'Kham',
        publisher: 'Vientiane Press',
        language: 'Lao',
        category: 'Business',
        pages: 180,
        isbn: '978-1',
        publicationDate: '2024-01-01',
        description: 'A long, complete description of saving and budgeting.',
        price: 120000,
        available: true,
      })
    },
  })
  await readEvents(await createBittyHandler(deps)(post({ ...VALID_BODY, page: { path: `/bookstore/books/${PAGE_BOOK_ID}` } })))
  assertEquals(requested, [PAGE_BOOK_ID])
  const system = calls.modelInputs[0].messages[0].content as string
  assertStringIncludes(system, 'The customer is now on: A book page')
  assertStringIncludes(system, 'Catalog ref: B1')
  assertStringIncludes(system, 'Publisher: Vientiane Press')
  assertStringIncludes(system, 'Description: A long, complete description of saving and budgeting.')
  assertStringIncludes(system, 'call recommend_books with ref B1')
  // The page goes after the cached instructions and catalog.
  assert(system.indexOf('Current page:') > system.indexOf('Catalog (ref'))
})

Deno.test('a Knowledge Hub post page reaches the prompt in the UI language', async () => {
  const languages: string[] = []
  const { deps, calls } = makeDeps({
    loadArticlePage: (_id, uiLanguage) => {
      languages.push(uiLanguage)
      return Promise.resolve({ title: 'Saving tips', type: 'tip', author: null, category: null, content: 'Save first, spend later.' })
    },
  })
  await readEvents(await createBittyHandler(deps)(post({ ...VALID_BODY, page: { path: `/bookstore/knowledge/${PAGE_BOOK_ID}` } })))
  assertEquals(languages, ['en'])
  const system = calls.modelInputs[0].messages[0].content as string
  assertStringIncludes(system, 'Knowledge Hub post on this page:')
  assertStringIncludes(system, 'Content: Save first, spend later.')
})

Deno.test('other pages are named without loading details', async () => {
  let loaded = false
  const { deps, calls } = makeDeps({
    loadBookPage: () => {
      loaded = true
      return Promise.resolve(null)
    },
  })
  await readEvents(await createBittyHandler(deps)(post({ ...VALID_BODY, page: { path: '/bookstore/cart' } })))
  assertEquals(loaded, false)
  assertStringIncludes(calls.modelInputs[0].messages[0].content as string, 'The customer is now on: Cart (/bookstore/cart).')
})

Deno.test('a failed page lookup does not stop the chat', async () => {
  const { deps, calls } = makeDeps({ loadBookPage: () => Promise.reject(new Error('db down')) })
  const events = await readEvents(await createBittyHandler(deps)(post({ ...VALID_BODY, page: { path: `/bookstore/books/${PAGE_BOOK_ID}` } })))
  assertEquals(events.at(-1), { type: 'done' })
  const system = calls.modelInputs[0].messages[0].content as string
  assertStringIncludes(system, 'The customer is now on: A book page')
  assert(!system.includes('Book on this page:'))
})

Deno.test('unusable page paths are ignored', () => {
  for (const page of [{ path: 'bookstore' }, { path: `/${'x'.repeat(300)}` }, { path: 42 }, 'nope', null]) {
    const parsed = parseBittyRequest({ ...VALID_BODY, page })
    assert(typeof parsed !== 'string')
    assertEquals(parsed.pagePath, undefined)
  }
  const parsed = parseBittyRequest({ ...VALID_BODY, page: { path: '/bookstore/faq' } })
  assert(typeof parsed !== 'string')
  assertEquals(parsed.pagePath, '/bookstore/faq')
})
