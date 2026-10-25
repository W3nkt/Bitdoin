// Helpers for UAT agents (QA-004, #40). Agents write small Playwright scripts
// in uat-artifacts/<agent>/ and import this file:
//
//   import { open, signIn, shot, axe, totp, account } from '../../scripts/uat/lib.mjs'
//   const { page, close } = await open({ device: 'phone', lang: 'lo' })
//   await signIn(page, account('uat-s01'))
//   await page.goto(url('/academy/scores'))
//   await shot(page, 'uat-new-student', '01-landing')
//   await close()
//
// Run with: node uat-artifacts/<agent>/<script>.mjs
import { createHmac } from 'node:crypto'
import { mkdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium, devices } from 'playwright'

const ROOT = resolve(import.meta.dirname, '../..')
const ACCOUNTS = JSON.parse(readFileSync(join(ROOT, 'uat-artifacts', 'accounts.json'), 'utf8'))

export const url = (path = '/') => `${ACCOUNTS.app}${path}`
/** account('uat-s01') -> { email, password, name, role } */
export const account = (id) => {
  const found = ACCOUNTS.accounts.find((a) => a.email.startsWith(`${id}@`))
  if (!found) throw new Error(`unknown account ${id}`)
  return { ...found, password: ACCOUNTS.password }
}

const DEVICES = {
  phone: { viewport: { width: 360, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: devices['Pixel 7'].userAgent },
  'phone-large': devices['Pixel 7'],
  iphone: devices['iPhone 13'],
  desktop: { viewport: { width: 1280, height: 900 } },
}

const NETWORKS = {
  // Chrome DevTools "Slow 3G"-like: 400 kbit/s down, 2 s round trip.
  slow: { offline: false, latency: 2000, downloadThroughput: 50_000, uploadThroughput: 50_000 },
}

/**
 * Opens a browser context.
 * device: phone | phone-large | iphone | desktop; lang: lo | en; theme: light | dark.
 * profile: a name -> a persistent browser profile in uat-artifacts/<agent>/profile-<name>
 *   (needs agent); storage, service worker and cookies survive close() like a real
 *   phone's browser. Without it the context is fresh (nothing shared).
 * network: 'slow' throttles like a slow 3G connection.
 * Offline: await context.setOffline(true|false).
 * Console errors and page errors are collected in `problems`.
 */
export async function open({ device = 'phone', lang = 'lo', theme = 'light', headless = true, agent, profile, network } = {}) {
  const options = { ...DEVICES[device], locale: lang === 'lo' ? 'lo-LA' : 'en-GB' }
  let browser = null
  let context
  if (profile) {
    if (!agent) throw new Error('open({ profile }) needs agent')
    const dir = join(ROOT, 'uat-artifacts', agent, `profile-${profile}`)
    mkdirSync(dir, { recursive: true })
    context = await chromium.launchPersistentContext(dir, { headless, ...options })
  } else {
    browser = await chromium.launch({ headless })
    context = await browser.newContext(options)
  }
  await context.addInitScript(({ lang, theme }) => {
    if (!localStorage.getItem('pwen_lang')) localStorage.setItem('pwen_lang', lang)
    if (!localStorage.getItem('bitdoin_theme')) localStorage.setItem('bitdoin_theme', theme)
  }, { lang, theme })
  const page = context.pages()[0] ?? await context.newPage()
  if (network) {
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.emulateNetworkConditions', NETWORKS[network])
  }
  const problems = []
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`))
  page.on('console', (message) => { if (message.type() === 'error') problems.push(`console: ${message.text().slice(0, 300)}`) })
  return { browser, context, page, problems, close: () => (browser ? browser.close() : context.close()) }
}

/** Signs in through the real /auth page (email and password). */
export async function signIn(page, who, { returnTo } = {}) {
  await page.goto(url('/auth'), { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="email"]').first().fill(who.email)
  await page.locator('input[type="password"]').first().fill(who.password)
  await page.locator('form button[type="submit"]').first().click()
  await page.waitForURL((u) => !new URL(u).pathname.startsWith('/auth'), { timeout: 20_000 })
  if (returnTo) await page.goto(url(returnTo), { waitUntil: 'domcontentloaded' })
}

/** Full-page screenshot to uat-artifacts/<agent>/<name>.png; returns the path. */
export async function shot(page, agent, name) {
  const dir = join(ROOT, 'uat-artifacts', agent)
  mkdirSync(dir, { recursive: true })
  const path = join(dir, `${name}.png`)
  await page.screenshot({ path, fullPage: true })
  return path
}

/** axe WCAG 2.2 AA violations on the current page (empty array = clean). */
export async function axe(page) {
  await page.addScriptTag({ path: join(ROOT, 'node_modules', 'axe-core', 'axe.min.js') })
  return page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })
    return result.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)
  })
}

/** Current 6-digit TOTP code for a base32 secret (the authenticator-app step of admin sign-in). */
export function totp(secret, at = Date.now()) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const char of secret.replace(/=+$/, '').replace(/\s/g, '').toUpperCase()) bits += alphabet.indexOf(char).toString(2).padStart(5, '0')
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)))
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)))
  const hmac = createHmac('sha1', key).update(counter).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000
  return String(code).padStart(6, '0')
}
