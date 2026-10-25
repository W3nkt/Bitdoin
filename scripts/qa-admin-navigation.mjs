// Responsive Academy admin navigation and platform switching, using mocked data.
// Run with Vite: node scripts/qa-admin-navigation.mjs
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium, devices } from 'playwright'
import { loadEnv } from 'vite'

const base = process.env.ACADEMY_PREVIEW_URL || 'http://127.0.0.1:5173'
const env = loadEnv('development', process.cwd(), 'VITE_')
const backend = new URL(env.VITE_SUPABASE_URL).origin
const storageKey = `sb-${new URL(backend).hostname.split('.')[0]}-auth-token`
const output = process.env.QA_OUTPUT || 'qa-artifacts/admin-navigation'
await mkdir(output, { recursive: true })
const user = { id: '00000000-0000-4000-8000-0000000000a1', aud: 'authenticated', role: 'authenticated', email: 'admin@example.com', app_metadata: {}, user_metadata: {} }
const plan = { id: 'free', slug: 'free', name: 'Free', price_lak: 0, interval: 'month', description: 'Learn with Bitdoin', features: [], is_active: true, sort_order: 0 }

async function openAs(browser, { mobile = false, motion = 'reduce', language = 'en', dark = false } = {}) {
  const context = await browser.newContext({ ...(mobile ? devices['Pixel 7'] : { viewport: { width: 1440, height: 1000 } }), reducedMotion: motion })
  const errors = []
  const writes = []
  await context.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.origin === new URL(base).origin) return route.continue()
    if (url.origin !== backend) return route.abort()
    const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
    if (url.pathname.startsWith('/auth/')) return json({ ...user, factors: [] })
    if (url.pathname.startsWith('/functions/')) return json({})
    if (url.pathname.endsWith('/rpc/get_admin_dashboard_stats')) return json({ gmv: 0, revenue: 0, pendingPayments: 0, pendingDeliveries: 0, totalOrders: 0, statusBreakdown: [] })
    if (url.pathname.includes('/rpc/')) return json(null)
    const table = url.pathname.split('/').at(-1)
    if (request.method() !== 'GET' && request.method() !== 'HEAD') writes.push(table)
    const tables = {
      users: [{ ...user, name: 'Admin Noy', role: 'ADMIN', language, currency: 'LAK' }],
      premium_plans: [plan],
      premium_subscriptions: url.searchParams.has('ends_at') ? [] : [{ id: 'sub-1', user_id: 'member-1', plan_id: 'free', plan, status: 'PENDING_APPROVAL', created_at: '2026-10-01', user: { name: 'Student Noy', email: 'noy@example.com', language: 'en' } }],
    }
    const rows = tables[table] || []
    const single = (request.headers().accept || '').includes('vnd.pgrst.object')
    return json(single ? rows[0] ?? null : rows)
  })
  await context.addInitScript(({ storageKey, user, language, dark }) => {
    localStorage.setItem('pwen_lang', language)
    localStorage.setItem('bitdoin_theme', dark ? 'dark' : 'light')
    const b64 = value => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const exp = Math.floor(Date.now() / 1000) + 3600
    const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, role: 'authenticated', aud: 'authenticated', exp, aal: 'aal1' })}.sig`
    localStorage.setItem(storageKey, JSON.stringify({ access_token: token, refresh_token: 'refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user }))
  }, { storageKey, user, language, dark })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  return { context, page, errors, writes }
}

async function choose(page, menu, label, mobile) {
  for (let turn = 0; mobile && turn < 12; turn++) {
    if (await menu.getByRole('button', { name: label, exact: true }).count()) break
    const previous = await menu.locator('.is-selected').getAttribute('aria-label')
    await menu.locator('.is-selected').hover()
    await page.mouse.wheel(0, 60)
    await page.waitForFunction(previous => document.querySelector('.academy-wheel-item.is-selected')?.getAttribute('aria-label') !== previous, previous)
  }
  await menu.getByRole('button', { name: label, exact: true }).click()
}

const browser = await chromium.launch({ headless: true })
try {
  for (const mobile of [false, true]) {
    const { context, page, errors, writes } = await openAs(browser, { mobile })
    const menu = page.getByRole('dialog', { name: 'Academy Admin menu', exact: true })
    const open = () => page.getByRole('button', { name: 'Open menu', exact: true }).click()
    await page.goto(`${base}/academy-admin`)
    await page.locator('#premium-overview').waitFor()
    await open()
    await menu.waitFor()
    assert.equal(await menu.locator('.academy-wheel-item').count(), 11, 'All dashboard sections, subpages and platform switch are present')
    assert.equal(await menu.locator('.academy-menu-badge').textContent(), '1', 'Member requests retain their badge')
    assert.equal(await menu.locator('[aria-current="page"]').count(), 1)
    assert.equal(await menu.locator('[aria-current="page"]').getAttribute('aria-label'), 'Overview', 'The loaded dashboard starts on Overview')
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden')
    if (mobile) {
      assert.equal(await page.locator('.academy-navigation.is-mobile').count(), 1)
      assert.equal(await menu.locator('.academy-radial-surface').evaluate(el => getComputedStyle(el).borderRadius), '50%')
      assert.equal(await menu.locator('.academy-wheel-item:not(.is-outside)').count(), 5)
      // Rotate through every entry, including the routes beyond the old eight-item limit.
      const labels = new Set()
      for (let turn = 0; turn < 11; turn++) {
        const label = await menu.locator('.is-selected').getAttribute('aria-label')
        labels.add(label)
        await menu.locator('.is-selected').hover()
        await page.mouse.wheel(0, 60)
        await page.waitForFunction(label => document.querySelector('.academy-wheel-item.is-selected')?.getAttribute('aria-label') !== label, label)
      }
      assert.equal(labels.size, 11, 'The mobile ring reaches all destinations and wraps')
    } else {
      assert.equal(await page.locator('.academy-navigation.is-desktop').count(), 1)
      assert.equal((await menu.boundingBox()).width, 340)
      assert.equal((await menu.boundingBox()).height, 1000)
      assert.ok(await menu.getByRole('button', { name: 'Bookstore Admin', exact: true }).isVisible())
    }
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-menu.png` })
    if (mobile) await menu.locator('.is-selected').focus()
    await page.keyboard.press('End')
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Bookstore Admin')
    await page.keyboard.press('Escape')
    assert.equal(await page.getByRole('button', { name: 'Open menu', exact: true }).evaluate(el => el === document.activeElement), true)
    assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden')

    await open()
    await choose(page, menu, 'Plans', mobile)
    await page.waitForFunction(() => location.hash === '#premium-plans' && window.scrollY > 0 && (document.getElementById('premium-plans').getBoundingClientRect().top <= 140 || innerHeight + scrollY >= document.documentElement.scrollHeight - 4))
    await open()
    assert.equal(await menu.locator('[aria-current="page"]').getAttribute('aria-label'), 'Plans')
    await choose(page, menu, 'Learning Content', mobile)
    await page.waitForURL(`${base}/academy-admin/learning`)
    await page.getByRole('heading', { name: 'Learning content', exact: true }).waitFor()
    await open()
    assert.equal(await menu.locator('[aria-current="page"]').getAttribute('aria-label'), 'Learning Content')
    await choose(page, menu, 'Schooling', mobile)
    await page.waitForURL(`${base}/academy-admin/scores`)
    await page.getByRole('heading', { name: 'Schooling', exact: true }).waitFor()
    await open()
    const schoolingMenu = page.getByRole('dialog', { name: 'Schooling admin sections', exact: true })
    assert.equal(await schoolingMenu.locator('[aria-current="page"]').getAttribute('aria-label'), 'Subjects')
    assert.equal(await schoolingMenu.getByRole('button', { name: 'Overview', exact: true }).count(), 0)
    await choose(page, schoolingMenu, 'Schools', mobile)
    await page.waitForURL(url => url.pathname === '/academy-admin/scores' && url.searchParams.get('tab') === 'schools')
    await open()
    assert.equal(await schoolingMenu.locator('[aria-current="page"]').getAttribute('aria-label'), 'Schools')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Back to Academy admin', exact: true }).click()
    await page.waitForURL(`${base}/academy-admin`)
    await page.locator('#premium-overview').waitFor()

    // The direct switch works without opening either platform's navigation.
    await page.getByRole('link', { name: 'Switch to Bookstore Admin', exact: true }).click()
    await page.waitForURL(`${base}/admin`)
    const switchBack = page.getByRole('link', { name: 'Switch to Academy Admin', exact: true }).filter({ visible: true })
    await switchBack.waitFor()
    assert.equal(await switchBack.count(), 1)
    await switchBack.click()
    await page.waitForURL(`${base}/academy-admin`)
    await page.locator('#premium-overview').waitFor()

    if (mobile) {
      for (const path of ['/academy-admin', '/academy-admin/learning', '/academy-admin/scores', '/admin']) {
        await page.setViewportSize({ width: 320, height: 740 })
        await page.goto(`${base}${path}`)
        await page.getByRole('link', { name: path === '/admin' ? 'Switch to Academy Admin' : 'Switch to Bookstore Admin', exact: true }).filter({ visible: true }).waitFor()
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${path} fits a narrow phone`)
        const controls = await page.locator('header button:visible, header a:visible').evaluateAll(elements => elements.map(el => {
          const { left, right } = el.getBoundingClientRect()
          return { left, right }
        }))
        assert.ok(controls.every(rect => rect.left >= 0 && rect.right <= 320), `${path} header controls remain reachable`)
      }
    }
    assert.deepEqual(errors, [])
    assert.deepEqual(writes, [], 'Navigation does not change backend data')
    await context.close()
    console.log(`PASS: ${mobile ? 'mobile' : 'desktop'} admin navigation and platform switching`)
  }

  const { context, page, errors } = await openAs(browser, { mobile: true, motion: 'no-preference', language: 'lo', dark: true })
  await page.goto(`${base}/academy-admin/learning`)
  await page.getByRole('button', { name: 'ເປີດເມນູ', exact: true }).click()
  const menu = page.getByRole('dialog', { name: 'ເມນູຈັດການ Academy', exact: true })
  await menu.waitFor()
  await menu.evaluate(async element => {
    await Promise.allSettled(element.getAnimations({ subtree: true }).map(animation => animation.finished))
  })
  await page.screenshot({ path: `${output}/mobile-dark-lao-menu.png` })
  await menu.getByRole('button', { name: 'ໂຮງຮຽນ', exact: true }).click()
  await page.waitForURL(`${base}/academy-admin/scores`)
  await page.getByRole('heading', { name: 'Schooling', exact: true }).waitFor()
  assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden', 'Animated route navigation releases the scroll lock')
  assert.equal(await page.locator('html.dark').count(), 1)
  assert.deepEqual(errors, [])
  await context.close()
  console.log('PASS: animated mobile navigation in Lao and dark mode')
} finally {
  await browser.close()
}
