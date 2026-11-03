// Local-only PhaJay QR test harness. Nothing here is deployed or imported by the app:
//   node scripts/phajay-local-test.mjs [--key 1] [--port 8787] [--logo path/to/logo.png]
// then open http://127.0.0.1:8787. It reads PHAJAY_API_KEY_<key> and PHAJAY_BCEL_URL from .env
// (process.env wins), generates a QR through PhaJay and polls the status endpoint until
// the QR is paid. The key stays in this process; the browser only sees the QR and the status.
// While the PhaJay account is not KYC-verified, PhaJay rejects amounts above 999 LAK.
// LDB, APB, JDB, STB and IB return a Lao QR (the shared national network, payable from any Lao bank
// app); BCEL returns its own QR that only BCEL One can scan. The harness checks that from the payload.
// The page draws the QR itself at error-correction level H with the logo in the centre; the
// PhaJay payload (and its CRC) is never altered, the logo only covers modules the code can rebuild.
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const argValue = (flag) => {
  const at = process.argv.indexOf(flag)
  return at > 0 ? process.argv[at + 1] : undefined
}
const PORT = Number(argValue('--port') ?? 8787)
const LOGO_PATH = argValue('--logo') ? resolve(argValue('--logo')) : fileURLToPath(new URL('../assets/brand-mark.png', import.meta.url))
const LOGO_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' }
const MAX_AMOUNT = Number(process.env.PHAJAY_TEST_MAX_AMOUNT ?? 999)
const TX_ID = /^[A-Za-z0-9-]{8,64}$/

// Read the file raw: the key is bcrypt-shaped ($2a$...), so a loader that expands $VARS would corrupt it.
async function loadEnv() {
  const vars = {}
  let text = ''
  try {
    text = await readFile(new URL('../.env', import.meta.url), 'utf8')
  } catch {
    // no .env: fall back to process.env only
  }
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    if (!match || line.trimStart().startsWith('#')) continue
    vars[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return (name) => process.env[name] || vars[name] || ''
}

const env = await loadEnv()
// --key picks the key: test (default) or real, read from PHAJAY_API_KEY_TEST / PHAJAY_API_KEY_REAL. The test
// key is limited to 999 LAK and 20 transactions a day; this tool keeps to 999 LAK even with the real key.
const KEY_NAME = `PHAJAY_API_KEY_${(argValue('--key') ?? 'test').toUpperCase()}`
const API_KEY = /^PHAJAY_API_KEY_(TEST|REAL|\d+)$/.test(KEY_NAME) ? env(KEY_NAME) : ''
const BCEL_URL = env('PHAJAY_BCEL_URL') || 'https://payment-gateway.phajay.co/v1/api/payment/generate-bcel-qr'
if (!API_KEY) {
  console.error(`${KEY_NAME} is missing from .env`)
  process.exit(1)
}
const PAYMENT_BASE = BCEL_URL.replace(/\/generate-bcel-qr$/, '')
const STATUS_URL = `${PAYMENT_BASE}/check-transaction/status/`
// M-Money is left out: it needs at least 1,000 LAK, above the non-KYC cap.
const BANKS = new Set(['ldb', 'apb', 'jdb', 'stb', 'ib', 'bcel'])
// Sub-tag 00 of merchant-account tag 38: the identifier of the shared Lao QR network.
const LAO_QR_NETWORK = '0016A005266284662577'

async function phajay(url, init) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}

// BCEL rejects Thai/Lao characters in the description and STB rejects '-', so keep it to letters, digits and spaces.
const cleanDescription = (value) => String(value ?? '').replace(/[^A-Za-z0-9 ]/g, '').trim().slice(0, 24) || 'BITDOIN LOCAL TEST'

// EMV QR checksum: CRC-16/CCITT-FALSE over everything before the final four hex digits.
function crcValid(payload) {
  let crc = 0xffff
  for (const byte of Buffer.from(payload.slice(0, -4))) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0') === payload.slice(-4)
}

// PhaJay allows a non-KYC account 20 transactions a day, and every request that reaches it may count.
let requested = 0

async function generate({ amount, description, bank }) {
  const value = Number(amount)
  if (!Number.isInteger(value) || value < 1 || value > MAX_AMOUNT) {
    return { code: 400, json: { error: `Amount must be a whole number from 1 to ${MAX_AMOUNT} LAK` } }
  }
  if (!BANKS.has(bank)) return { code: 400, json: { error: 'Unknown bank' } }
  requested += 1
  const res = await phajay(`${PAYMENT_BASE}/generate-${bank}-qr`, {
    method: 'POST',
    headers: { secretKey: API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: value, description: cleanDescription(description), orderNo: `LOCAL-${Date.now()}`, tag1: 'local-test' }),
  })
  const { transactionId, qrCode, link } = res.body
  if (!res.ok || !transactionId || !qrCode) {
    return { code: 502, json: { error: res.body.detail || res.body.message || `PhaJay returned HTTP ${res.status}` } }
  }
  const laoQr = qrCode.includes(LAO_QR_NETWORK)
  console.log(`[qr] #${requested} this run: ${bank} ${transactionId} ${value} LAK laoQr=${laoQr}`)
  return { code: 200, json: { transactionId, qrCode, link, amount: value, bank, laoQr, crcValid: crcValid(qrCode) } }
}

async function status(id) {
  if (!TX_ID.test(id)) return { code: 400, json: { error: 'Bad transaction id' } }
  const res = await phajay(STATUS_URL + id, {
    headers: { Authorization: `Basic ${Buffer.from(API_KEY).toString('base64')}` },
  })
  const data = res.body.data
  if (!res.ok || !data) return { code: res.status === 404 ? 404 : 502, json: { error: res.body.message || `PhaJay returned HTTP ${res.status}` } }
  const { status: state, isPaid, amount, currency, paymentMethod, paymentTime } = data
  return { code: 200, json: { status: state, isPaid, amount, currency, paymentMethod, paymentTime } }
}

async function readJson(req) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > 4096) throw new Error('Body too large')
    chunks.push(chunk)
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
}

// This process can spend the key, so only answer requests that really come from our own page.
function isOwnOrigin(req) {
  const own = [`127.0.0.1:${PORT}`, `localhost:${PORT}`]
  const origin = req.headers.origin
  return own.includes(req.headers.host ?? '') && (!origin || own.some((host) => origin === `http://${host}`))
}

const server = createServer(async (req, res) => {
  const send = (code, body, type = 'application/json') => {
    const isText = type === 'application/json' || type.startsWith('text/')
    res.writeHead(code, { 'Content-Type': isText ? `${type}; charset=utf-8` : type, 'Cache-Control': 'no-store' })
    res.end(type === 'application/json' ? JSON.stringify(body) : body)
  }
  try {
    if (!isOwnOrigin(req)) return send(403, { error: 'Forbidden' })
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
    if (req.method === 'GET' && url.pathname === '/') return send(200, PAGE, 'text/html')
    if (req.method === 'GET' && url.pathname === '/logo') {
      const type = LOGO_TYPES[extname(LOGO_PATH).toLowerCase()]
      return type ? send(200, await readFile(LOGO_PATH), type) : send(404, { error: 'Unsupported logo type' })
    }
    if (req.method === 'POST' && url.pathname === '/api/generate') {
      const out = await generate(await readJson(req))
      return send(out.code, out.json)
    }
    if (req.method === 'GET' && url.pathname === '/api/status') {
      const out = await status(url.searchParams.get('id') ?? '')
      return send(out.code, out.json)
    }
    send(404, { error: 'Not found' })
  } catch (error) {
    console.error('[error]', error instanceof Error ? error.message : error)
    send(500, { error: 'Local test server error' })
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`PhaJay QR test: http://127.0.0.1:${PORT}`)
  console.log(`  generate -> ${PAYMENT_BASE}/generate-<bank>-qr  (key: ${KEY_NAME})`)
  console.log(`  max amount ${MAX_AMOUNT} LAK and 20 QRs/day (non-KYC limits; set PHAJAY_TEST_MAX_AMOUNT after KYC)`)
  console.log(`  QR logo -> ${LOGO_PATH}`)
})

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PhaJay QR test</title>
<style>
  :root { --bg: #f6f7f9; --card: #fff; --text: #14181f; --muted: #5d6675; --line: #dde1e8; --accent: #c8102e; --ok: #17803d; --warn: #9a6700; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0f1216; --card: #181c22; --text: #eef0f3; --muted: #9aa3b2; --line: #2b323c; --ok: #4cc77a; --warn: #e3b341; } }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px 16px; background: var(--bg); color: var(--text); font: 15px/1.5 system-ui, sans-serif; }
  main { max-width: 560px; margin: 0 auto; }
  h1 { margin: 0 0 4px; font-size: 20px; }
  p.sub { margin: 0 0 16px; color: var(--muted); font-size: 13px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
  label { display: block; margin-bottom: 12px; font-size: 13px; color: var(--muted); }
  input, select { display: block; width: 100%; margin-top: 4px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); color: var(--text); font: inherit; }
  button { padding: 10px 14px; border: 0; border-radius: 8px; background: var(--accent); color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
  button.ghost { background: transparent; color: var(--text); border: 1px solid var(--line); }
  button:disabled { opacity: .5; cursor: default; }
  .row { display: flex; gap: 8px; flex-wrap: wrap; }
  #qr { display: flex; justify-content: center; padding: 16px; background: #fff; border-radius: 8px; }
  #qr canvas { max-width: 100%; }
  .check { display: flex; align-items: flex-start; gap: 8px; margin: 12px 0 0; }
  .check input { display: inline-block; width: auto; margin: 4px 0 0; }
  #coverage { color: var(--muted); font-size: 13px; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; border: 1px solid var(--line); font-size: 13px; font-weight: 600; }
  .badge.paid { color: var(--ok); border-color: var(--ok); }
  .badge.wait { color: var(--warn); border-color: var(--warn); }
  dl { margin: 12px 0 0; display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 13px; }
  dt { color: var(--muted); }
  dd { margin: 0; word-break: break-all; }
  #error { color: var(--accent); font-size: 13px; margin-top: 8px; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<main>
  <h1>PhaJay QR test</h1>
  <p class="sub">Local only. A Lao QR can be paid from any Lao bank app; BCEL's own QR only from BCEL One. Non-KYC accounts are limited to ${MAX_AMOUNT} LAK per QR and 20 QRs per day, so generate sparingly.</p>

  <form class="card" id="form">
    <label>QR type
      <select id="bank">
        <option value="ldb" selected>LDB - Lao QR (any bank app)</option>
        <option value="apb">APB - Lao QR (any bank app)</option>
        <option value="jdb">JDB - Lao QR (any bank app)</option>
        <option value="stb">STB - Lao QR (any bank app)</option>
        <option value="ib">IB - Lao QR (any bank app)</option>
        <option value="bcel">BCEL - BCEL One only</option>
      </select>
    </label>
    <label>Amount (LAK)<input id="amount" type="number" min="1" max="${MAX_AMOUNT}" step="1" value="500" required></label>
    <label>Description (A-Z, 0-9, spaces; no Lao/Thai)<input id="description" maxlength="24" value="BITDOIN LOCAL TEST"></label>
    <div class="row"><button id="go" type="submit">Generate QR</button></div>
    <div id="error" role="alert" hidden></div>
  </form>

  <section class="card" id="result" hidden>
    <div id="qr"></div>
    <label class="check"><input id="logoOn" type="checkbox" checked><span>Logo in the centre <span id="coverage"></span></span></label>
    <p style="margin:12px 0 0"><span class="badge" id="kind"></span></p>
    <p style="margin:8px 0 0"><span class="badge wait" id="state">WAITING</span> <span id="note" class="sub"></span></p>
    <dl>
      <dt>Transaction</dt><dd id="tx"></dd>
      <dt>Amount</dt><dd id="amt"></dd>
      <dt>Paid at</dt><dd id="paidAt">-</dd>
    </dl>
    <div class="row" style="margin-top:12px">
      <a id="open" href="#" hidden><button class="ghost" type="button">Open in bank app</button></a>
      <button class="ghost" id="copy" type="button">Copy QR payload</button>
    </div>
  </section>
</main>

<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js" integrity="sha384-mZT2gIty7ZDdOGkxfP6joZcYdMW1Jvj9dRlfpTmaJAKKXTqzygtB22k7FLe+KZC1" crossorigin="anonymous"></script>
<script>
  const $ = (id) => document.getElementById(id)
  const DONE = new Set(['PAYMENT_COMPLETED', 'EXPIRED', 'REFUNDED', 'DISPUTED'])
  const CELL = 8 // canvas pixels per QR module
  const QUIET = 4 // quiet-zone modules around the code
  const PLATE_SHARE = 0.22 // white plate behind the logo, as a share of the code width (about 5% of its area)
  const LOGO_SHARE = 0.65 // logo width as a share of the plate; the white margin keeps its colours away from data modules
  let timer = null
  let payload = ''
  let logoImage = null

  function loadLogo() {
    logoImage ??= new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Could not load the logo'))
      image.src = '/logo'
    })
    return logoImage
  }

  // Error-correction level H lets a scanner rebuild up to 30% of the code, which is what pays for the logo.
  // The plate covers a whole, odd number of modules so it sits exactly on the centre of the grid.
  async function drawQr(text, withLogo) {
    const qr = qrcode(0, 'H')
    qr.addData(text, 'Byte')
    qr.make()
    const count = qr.getModuleCount()
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = (count + QUIET * 2) * CELL
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#000'
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) ctx.fillRect((col + QUIET) * CELL, (row + QUIET) * CELL, CELL, CELL)
      }
    }
    let covered = 0
    if (withLogo) {
      let plate = Math.round(count * PLATE_SHARE)
      if (plate % 2 === 0) plate += 1
      const start = ((count - plate) / 2 + QUIET) * CELL
      const side = plate * CELL
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.roundRect(start, start, side, side, CELL * 1.5)
      ctx.fill()
      const inset = (side * (1 - LOGO_SHARE)) / 2
      ctx.drawImage(await loadLogo(), start + inset, start + inset, side - inset * 2, side - inset * 2)
      covered = (plate * plate) / (count * count)
    }
    return { canvas, covered }
  }

  async function renderQr() {
    const { canvas, covered } = await drawQr(payload, $('logoOn').checked)
    // Show every module as a whole number of CSS pixels so edges stay sharp; a fractional scale blurs them and scanners struggle.
    const modules = canvas.width / CELL
    const room = ($('qr').clientWidth || window.innerWidth - 64) - 32
    const pixels = Math.max(3, Math.floor(room / modules)) * modules
    canvas.style.width = canvas.style.height = pixels + 'px'
    canvas.style.imageRendering = 'pixelated'
    $('qr').replaceChildren(canvas)
    $('coverage').textContent = covered ? '(covers ' + (covered * 100).toFixed(1) + '% of the code; level H allows about 30%)' : ''
  }

  function fail(message) {
    $('error').textContent = message
    $('error').hidden = !message
  }

  function show(state, note) {
    $('state').textContent = state
    $('state').className = 'badge ' + (state === 'PAYMENT_COMPLETED' ? 'paid' : 'wait')
    $('note').textContent = note || ''
  }

  async function poll(id, startedAt) {
    clearTimeout(timer)
    try {
      const res = await fetch('/api/status?id=' + encodeURIComponent(id))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      show(data.status, data.isPaid ? 'Paid' : 'Polling every 3 s')
      if (data.paymentTime) $('paidAt').textContent = data.paymentTime
      if (DONE.has(data.status)) return
    } catch (error) {
      show('ERROR', error.message)
    }
    if (Date.now() - startedAt < 10 * 60 * 1000) timer = setTimeout(() => poll(id, startedAt), 3000)
    else show('STOPPED', 'Stopped polling after 10 minutes')
  }

  $('form').addEventListener('submit', async (event) => {
    event.preventDefault()
    fail('')
    clearTimeout(timer)
    $('go').disabled = true
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number($('amount').value), description: $('description').value, bank: $('bank').value }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      payload = data.qrCode
      $('result').hidden = false
      await renderQr()
      $('tx').textContent = data.transactionId
      $('amt').textContent = data.amount + ' LAK'
      $('paidAt').textContent = '-'
      $('open').href = data.link || '#'
      $('open').hidden = !data.link
      $('kind').textContent = (data.laoQr ? 'Lao QR: payable from any Lao bank app' : 'Bank-only QR: ' + data.bank.toUpperCase() + ' app') + (data.crcValid ? '' : ' - checksum invalid, scanners may reject it')
      $('kind').className = 'badge ' + (data.laoQr && data.crcValid ? 'paid' : 'wait')
      $('result').hidden = false
      show('WAITING', 'Polling every 3 s')
      poll(data.transactionId, Date.now())
    } catch (error) {
      fail(error.message)
    } finally {
      $('go').disabled = false
    }
  })

  $('logoOn').addEventListener('change', () => payload && renderQr().catch((error) => fail(error.message)))
  $('copy').addEventListener('click', () => navigator.clipboard.writeText(payload))
</script>
</body>
</html>`
