// Academy route separation and wheel navigation, against an isolated mock backend.
// Run with a local Vite server: node scripts/qa-academy-navigation.mjs
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium, devices } from 'playwright'
import { loadEnv } from 'vite'

const base = process.env.ACADEMY_PREVIEW_URL || 'http://localhost:5173'
const env = loadEnv('development', process.cwd(), 'VITE_')
const backend = new URL(env.VITE_SUPABASE_URL).origin
const storageKey = `sb-${new URL(backend).hostname.split('.')[0]}-auth-token`
const output = process.env.QA_OUTPUT || 'qa-artifacts/academy-navigation'
await mkdir(output, { recursive: true })
const userId = '00000000-0000-4000-8000-0000000000a1'
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'noy@example.com', app_metadata: {}, user_metadata: {} }
const plans = [
  { id: 'free', slug: 'free', name: 'Free', price_lak: 0, interval: 'month' },
  { id: 'monthly', slug: 'premium-monthly', name: 'Premium Monthly', price_lak: 39000, interval: 'month' },
  { id: 'yearly', slug: 'premium-yearly', name: 'Premium Yearly', price_lak: 390000, interval: 'year' },
].map((plan, i) => ({ ...plan, description: 'Learn with Bitdoin', features: ['Learning and practice'], is_active: true, sort_order: i }))
const guidance = { id: 'motivation-1', publish_date: '2026-10-24', quote: 'Small steps make a difference.', reflection: 'What did you learn?', challenge: 'Read for ten minutes.', mission: 'Write a sentence.' }

async function openAs(browser, { mobile = false, lang = 'en', tier = 'paid', dark = false, scoresEnabled = false } = {}) {
  const context = await browser.newContext({ ...(mobile ? devices['Pixel 7'] : { viewport: { width: 1440, height: 1000 } }), reducedMotion: 'reduce' })
  const errors = []
  const writes = []
  await context.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.origin === new URL(base).origin) return route.continue()
    if (url.origin !== backend) return route.abort()
    const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
    if (url.pathname.startsWith('/auth/')) return json(user)
    if (url.pathname.startsWith('/functions/')) {
      if (url.pathname.endsWith('premium-daily-mentor')) return json({ guidance })
      return json({ questions: [], missions: [] })
    }
    if (url.pathname.endsWith('/rpc/get_premium_member_dashboard')) return json({ member: { streak: 3, xp: 120, rank: 1, completed_days: 3, completed_items: 9 }, leaderboard: [] })
    if (url.pathname.endsWith('/rpc/academic_get_session')) return json({ user, module_enabled: scoresEnabled, next_step: scoresEnabled ? 'consent' : 'unavailable', profile: scoresEnabled ? { id: 'student-1', display_name: 'Noy', age_band: '18_plus', status: 'active', consent_state: 'active', version: 1 } : null, active_enrolment_id: null, notice_version: '1', consent: { module_processing: false, notice_version: null } })
    if (url.pathname.endsWith('/rpc/academic_get_history')) return json({ enrolments: [] })
    if (url.pathname.endsWith('/rpc/academic_list_notifications')) return json({ items: [], unread_count: 0, next_before: null })
    if (url.pathname.includes('/rpc/')) return json(null)
    const table = url.pathname.split('/').at(-1)
    if (request.method() !== 'GET') { writes.push(table); return json([]) }
    const single = (request.headers().accept || '').includes('vnd.pgrst.object')
    const tables = {
      users: [{ ...user, name: 'Noy Student', member_code: 'DAN9XY', role: 'CUSTOMER', language: lang, currency: 'LAK' }],
      premium_plans: plans,
      premium_subscriptions: tier === 'guest' ? [] : [{ id: 'sub-1', user_id: userId, plan_id: tier === 'free' ? 'free' : 'monthly', plan: plans[tier === 'free' ? 0 : 1], status: 'ACTIVE', starts_at: '2026-10-01', ends_at: tier === 'expired' ? '2020-01-01' : '2099-12-31', created_at: '2026-10-01', auto_renew: false }],
      premium_onboarding_responses: [{ completed: true, responses: { preferred_name: 'Noy', priority_goal: 'Learn something new' } }],
      premium_daily_motivations: [guidance],
    }
    const rows = tables[table] || []
    return json(single ? rows[0] ?? null : rows)
  })
  await context.addInitScript(({ storageKey, user, lang, tier, dark }) => {
    localStorage.setItem('pwen_lang', lang)
    localStorage.setItem('bitdoin_theme', dark ? 'dark' : 'light')
    if (tier === 'guest') return
    const b64 = value => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const exp = Math.floor(Date.now() / 1000) + 3600
    const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, role: 'authenticated', aud: 'authenticated', exp })}.sig`
    localStorage.setItem(storageKey, JSON.stringify({ access_token: token, refresh_token: 'refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user }))
  }, { storageKey, user, lang, tier, dark })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  return { page, context, errors, writes }
}

const browser = await chromium.launch({ headless: true })
try {
  for (const mobile of [false, true]) {
    const { page, context, errors } = await openAs(browser, { mobile, scoresEnabled: true })
    const menu = page.getByRole('dialog', { name: 'Academy menu' })
    const openMenu = () => page.getByRole('button', { name: 'Open menu', exact: true }).click()
    async function choose(label) {
      for (let turn = 0; mobile && turn < 8; turn++) {
        if (await menu.getByRole('button', { name: label, exact: true }).count()) break
        const previous = await menu.locator('.is-selected').getAttribute('aria-label')
        await menu.locator('.is-selected').hover()
        await page.mouse.wheel(0, 60)
        await page.waitForFunction(previous => document.querySelector('.academy-wheel-item.is-selected')?.getAttribute('aria-label') !== previous, previous)
      }
      await menu.getByRole('button', { name: label, exact: true }).click()
    }
    await page.goto(`${base}/academy/home`)
    await page.getByRole('heading', { name: 'Top performers', exact: true }).waitFor().catch(async error => {
      await page.screenshot({ path: `${output}/failure.png`, fullPage: true })
      console.error('Page:', await page.locator('body').innerText(), 'Runtime errors:', errors)
      throw error
    })
    const triggerBox = await page.getByRole('button', { name: 'Open menu', exact: true }).boundingBox()
    if (mobile) {
      assert.equal(triggerBox.width, 44)
      assert.equal(triggerBox.height, 44)
      assert.equal(await page.getByRole('button', { name: 'Open menu', exact: true }).evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(247, 147, 26)')
    }
    assert.ok(mobile ? triggerBox.y > 700 : triggerBox.y < 80, 'Toggle floats at the bottom on mobile and at the top on desktop')
    assert.equal(await page.getByRole('button', { name: 'Open menu', exact: true }).evaluate(el => getComputedStyle(el).position), 'fixed')
    assert.equal(await page.locator('#plans, #membership, #mentor, #play, #community').count(), 0, 'Home must not render the other sections')
    assert.equal(await page.locator('header .lucide-arrow-left').count(), 0, 'Menu landing pages have no back button')
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-home.png`, fullPage: true })
    await openMenu()
    await menu.waitFor()
    if (mobile) {
      await page.waitForFunction(() => document.querySelector('.academy-wheel-item.is-selected')?.getAttribute('aria-label') === 'Home')
      const box = await menu.boundingBox()
      assert.ok(box.width <= 245 && box.height <= 310 && box.y > 400, 'Mobile wheel stays in the bottom corner with space for its entry motion')
      assert.equal(await menu.locator('.academy-radial-surface').evaluate(el => getComputedStyle(el).borderRadius), '50%')
      const geometry = await menu.evaluate(el => ['.academy-radial-surface', '.academy-radial-core', '.academy-radial-hub', '.is-selected .academy-wheel-icon'].map(selector => {
        const box = el.querySelector(selector).getBoundingClientRect()
        return { width: box.width, height: box.height, centerX: box.x + box.width / 2, centerY: box.y + box.height / 2 }
      }))
      for (const circle of geometry) assert.ok(Math.abs(circle.width - circle.height) < 1, 'Circles have equal width and height')
      assert.equal(geometry[0].centerX, geometry[1].centerX)
      assert.equal(geometry[0].centerY, geometry[1].centerY)
      assert.equal(geometry[0].centerX, geometry[2].centerX)
      assert.equal(geometry[0].centerY, geometry[2].centerY)
      assert.equal(await menu.locator('.academy-radial-surface').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(250, 250, 248)')
      assert.equal(await menu.locator('.academy-radial-core').evaluate(el => getComputedStyle(el, '::before').backgroundColor), 'rgb(15, 31, 53)')
      assert.equal(await menu.locator('.academy-radial-hub').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(250, 250, 248)')
      assert.equal(await menu.locator('.academy-radial-hub').evaluate(el => el.parentElement.classList.contains('academy-wheel-track')), true, 'The white hub moves independently of the dark wheel')
      assert.notEqual(await menu.locator('.academy-radial-hub').evaluate(el => getComputedStyle(el).boxShadow), 'none', 'The hub has a visible depth shadow')
      assert.notEqual(await menu.locator('.academy-radial-surface').evaluate(el => getComputedStyle(el).maskImage), 'none', 'Outer rings leave room for the independently animated hub')
      assert.notEqual(await menu.locator('.academy-radial-core').evaluate(el => getComputedStyle(el, '::before').maskImage), 'none')
      assert.equal(await menu.locator('.academy-radial-count').count(), 0)
      const closeColor = await page.getByRole('button', { name: 'Close menu', exact: true }).evaluate(el => getComputedStyle(el).backgroundColor)
      assert.ok(['rgb(220, 38, 38)', 'rgb(185, 28, 28)'].includes(closeColor), 'Close button stays solid red, including hover')
      assert.equal(await menu.locator('.academy-wheel-item:not(.is-outside)').count(), 5)
      assert.equal(await menu.locator('.academy-wheel-label').count(), 0, 'Mobile destinations show icons only, with accessible names')
      assert.equal(await menu.locator('.is-edge').count(), 2)
      for (const edge of await menu.locator('.is-edge').all()) {
        assert.ok(await edge.evaluate(el => Number(getComputedStyle(el).opacity)) < .5, 'Edge options fade to suggest more destinations')
      }
      assert.equal(await menu.locator('.academy-radial-more').count(), 0)
      assert.equal(await menu.locator('.academy-radial-caption textPath').count(), 1, 'The title follows a circular text path')
      assert.equal(await menu.locator('.academy-radial-caption textPath').textContent(), 'Home')
      for (const target of await menu.locator('.academy-wheel-item:not(.is-outside)').all()) {
        const hit = await target.boundingBox()
        assert.ok(hit.width >= 44 && hit.height >= 44, 'Targets remain large enough to tap')
      }
    } else {
      assert.equal(await menu.locator('.academy-wheel-item').first().getAttribute('aria-label'), 'Home')
      assert.ok((await menu.boundingBox()).height >= 950, 'Desktop uses a full-height sidebar')
    }
    assert.equal(await menu.locator('.academy-wheel-item').count(), 8, 'Scores is a main menu entry; plans and billing share one entry')
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-menu.png` })
    assert.equal(await menu.locator('[aria-current="page"]').count(), 1)
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden')
    if (mobile) await menu.locator('.is-selected').focus()
    await page.keyboard.press('End')
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Membership')
    await page.waitForTimeout(300)
    if (mobile) assert.equal(await menu.locator('.is-selected').getAttribute('aria-label'), 'Membership')
    await page.keyboard.press('Escape')
    assert.equal(await page.getByRole('button', { name: 'Open menu', exact: true }).evaluate(el => el === document.activeElement), true)
    assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden')

    for (const [path, label, selector] of [
      ['mentor', 'Daily Mentor', '#mentor'], ['play', 'Play & Learn', '#play'],
      ['community', 'Community', '#community'],
      ['membership', 'Membership', '#membership'],
    ]) {
      await openMenu()
      await choose(label)
      await page.waitForURL(`${base}/academy/${path}`)
      await page.locator(selector).waitFor()
      if (path === 'membership') {
        await page.getByRole('heading', { name: 'Membership control', exact: true }).waitFor()
        await page.locator('#plans').waitFor()
      }
      assert.equal(await page.locator('#home').count(), 0)
      assert.equal(await page.locator('#home, #mentor, #play, #community, #plans, #membership').count(), path === 'membership' ? 2 : 1)
      assert.equal(await page.getByRole('dialog', { name: 'Academy menu' }).count(), 0)
      assert.equal(await page.locator('header .lucide-arrow-left').count(), 0, `${label} has no back button`)
    }
    await page.reload()
    await page.locator('#membership').waitFor()
    await page.goBack()
    await page.waitForURL(`${base}/academy/community`)
    await page.locator('#community').waitFor()

    await openMenu()
    if (mobile) {
      const before = await menu.locator('.is-selected').getAttribute('aria-label')
      await menu.locator('.is-selected').hover()
      await page.mouse.wheel(0, 60)
      await page.waitForFunction(before => document.querySelector('.academy-wheel-item.is-selected')?.getAttribute('aria-label') !== before, before)
      assert.notEqual(await menu.locator('.is-selected').getAttribute('aria-label'), before)
      assert.equal(new URL(page.url()).pathname, '/academy/community')
      const beforeSwipe = await menu.locator('.is-selected').getAttribute('aria-label')
      const hit = await menu.locator('.is-selected').boundingBox()
      const touch = await context.newCDPSession(page)
      const point = { x: hit.x + hit.width / 2, y: hit.y + hit.height / 2 }
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, y: point.y - 60 }] })
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.waitForFunction(before => document.querySelector('.academy-wheel-item.is-selected')?.getAttribute('aria-label') !== before, beforeSwipe)
      assert.equal(new URL(page.url()).pathname, '/academy/community', 'A swipe rotates without opening a page')
      await touch.detach()
    }
    await choose('Learning')
    await page.waitForURL(`${base}/academy/learn`)
    await page.getByRole('heading', { name: 'Learning Hub', exact: true }).waitFor()
    assert.equal(await page.locator('header .lucide-arrow-left').count(), 0)
    assert.equal(await page.locator('a[href="/academy/scores"]').count(), 0, 'Scores no longer appears inside Learning')
    await page.getByRole('button', { name: 'Open menu', exact: true }).waitFor()
    await openMenu()
    await choose('Schooling')
    await page.waitForURL(`${base}/academy/scores`)
    await page.getByRole('heading', { name: 'Schooling', exact: true }).waitFor()
    assert.equal(await page.locator('header .lucide-school').count(), 1, 'Schooling page uses the School icon')
    assert.equal(await page.locator('header .lucide-arrow-left').count(), 0, 'Scores landing page has no back button')
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-scores.png` })
    await openMenu()
    assert.equal(await menu.locator('[aria-current="page"]').getAttribute('aria-label'), 'Schooling')
    assert.equal(await menu.getByRole('button', { name: 'Schooling', exact: true }).locator('.lucide-school').count(), 1)
    if (mobile) assert.equal(await menu.locator('.academy-radial-caption textPath').textContent(), 'Schooling')
    await choose('AI Coach')
    await page.waitForURL(`${base}/academy/coach`)
    await page.getByText('Ready to coach', { exact: true }).waitFor()
    assert.equal(await page.locator('header .lucide-arrow-left').count(), 0)
    await page.getByRole('button', { name: 'Open menu', exact: true }).waitFor()

    // Deep links return to their menu landing page, even after visiting another menu.
    for (const [path, parent] of [['careers', 'learn'], ['challenges', 'learn'], ['habits', 'learn'], ['progress', 'learn'], ['prompts', 'learn'], ['top-corner-lab', 'play'], ['scores/history', 'scores']]) {
      await page.goto(`${base}/academy/community`)
      await page.locator('#community').waitFor()
      await page.goto(`${base}/academy/${path}`)
      if (path.startsWith('scores/')) {
        await openMenu()
        assert.equal(await menu.locator('[aria-current="page"]').getAttribute('aria-label'), 'Schooling', 'Scores subpages belong to the Scores menu')
        await page.keyboard.press('Escape')
      }
      await page.locator('header button').filter({ has: page.locator('.lucide-arrow-left') }).click()
      await page.waitForURL(`${base}/academy/${parent}`)
      await page.locator('header').first().waitFor()
      assert.equal(await page.locator('header .lucide-arrow-left').count(), 0, 'Back stops at the menu landing page')
    }
    await page.goto(`${base}/academy/profile`)
    const schoolingProfileLink = page.getByRole('link', { name: 'Schooling', exact: true })
    await schoolingProfileLink.waitFor()
    assert.equal(await schoolingProfileLink.locator('.lucide-school').count(), 1)
    await schoolingProfileLink.click()
    await page.waitForURL(url => url.pathname === '/academy/scores')

    // Existing bookmarks must still reach the new page.
    await page.goto(`${base}/academy/home#mentor`)
    await page.waitForURL(`${base}/academy/mentor`)
    await page.locator('#mentor').waitFor()
    await page.goto(`${base}/academy/subscription#plans`)
    await page.waitForURL(`${base}/academy/membership`)
    await page.locator('#plans').waitFor()
    assert.deepEqual(errors, [], 'No browser runtime errors')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow')
    await context.close()
    console.log(`PASS ${mobile ? 'mobile' : 'desktop'}: dedicated routes, reload/back, wheel, keyboard, focus, legacy links`)
  }

  const { page, context, errors } = await openAs(browser, { mobile: true, lang: 'lo', tier: 'free', dark: true })
  await page.goto(`${base}/academy/community`)
  await page.locator('#community').waitFor()
  await page.getByRole('button', { name: 'ເປີດເມນູ', exact: true }).click()
  await page.getByRole('dialog').waitFor()
  await page.screenshot({ path: `${output}/mobile-lao-dark-menu.png` })
  assert.equal(await page.getByRole('dialog').locator('[aria-current="page"]').count(), 1)
  assert.equal(await page.getByRole('dialog').innerText().then(text => text.includes('????')), false)
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  const laoSchooling = page.getByRole('dialog').getByRole('button', { name: 'ໂຮງຮຽນ', exact: true })
  await laoSchooling.click()
  await page.waitForURL(`${base}/academy/scores`)
  await page.getByRole('heading', { name: 'ໂຮງຮຽນ', exact: true }).waitFor()
  assert.equal(await page.locator('header .lucide-school').count(), 1)
  await page.keyboard.press('Escape')
  assert.deepEqual(errors, [])
  await context.close()
  console.log('PASS Lao, dark theme and free membership')

  const unavailable = await openAs(browser, { mobile: true })
  await unavailable.page.goto(`${base}/academy/scores`)
  await unavailable.page.getByRole('heading', { name: 'Schooling is coming soon', exact: true }).waitFor()
  assert.equal(await unavailable.page.locator('header .lucide-arrow-left').count(), 0)
  assert.deepEqual(unavailable.errors, [])
  await unavailable.context.close()
  console.log('PASS scores module unavailable state')

  const checkout = await openAs(browser, { tier: 'free', mobile: true })
  await checkout.page.goto(`${base}/academy/plans`)
  await checkout.page.locator('#plans').waitFor()
  await checkout.page.getByRole('button', { name: 'Start Premium', exact: true }).first().click()
  const details = checkout.page.getByRole('dialog', { name: 'Package details' })
  await details.waitFor()
  await details.getByRole('button', { name: 'Confirm & subscribe', exact: true }).click()
  await checkout.page.getByRole('dialog', { name: 'Choose a payment method' }).waitFor()
  assert.deepEqual(checkout.writes, [], 'Opening checkout must not create a request')
  await checkout.page.keyboard.press('Escape')
  assert.deepEqual(checkout.errors, [])
  await checkout.context.close()
  const renewal = await openAs(browser, { tier: 'expired' })
  await renewal.page.goto(`${base}/academy/subscription?renew=1`)
  await renewal.page.waitForURL(`${base}/academy/membership`)
  await renewal.page.getByRole('dialog', { name: 'Package details' }).waitFor()
  assert.deepEqual(renewal.errors, [])
  assert.deepEqual(renewal.writes, [])
  await renewal.context.close()
  console.log('PASS upgrade checkout and renewal links')

  const small = await openAs(browser, { mobile: true })
  await small.page.setViewportSize({ width: 320, height: 568 })
  await small.page.goto(`${base}/academy/home`)
  await small.page.getByRole('button', { name: 'Open menu', exact: true }).click()
  const smallMenu = small.page.getByRole('dialog', { name: 'Academy menu' })
  await smallMenu.waitFor()
  await small.page.waitForFunction(() => document.querySelector('.academy-wheel-item.is-selected')?.getAttribute('aria-label') === 'Home')
  const box = await smallMenu.boundingBox()
  assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 320 && box.y + box.height <= 568)
  await small.page.screenshot({ path: `${output}/small-mobile-menu.png` })
  assert.equal(await small.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  await small.page.setViewportSize({ width: 1280, height: 800 })
  await small.page.locator('.is-desktop .academy-menu-panel.is-open').waitFor()
  assert.equal(await smallMenu.locator('[aria-current="page"]').getAttribute('aria-label'), 'Home')
  assert.equal(await small.page.locator('.is-desktop > .academy-menu-trigger').count(), 1)
  await small.page.keyboard.press('Escape')
  await small.context.close()
  console.log('PASS small mobile viewport')

  // Real motion: finish the wheel close before either page-fade implementation.
  for(const fallback of [false,true]){
    const {page,context,errors}=await openAs(browser,{mobile:true})
    await page.emulateMedia({reducedMotion:'no-preference'})
    await page.goto(base+'/academy/home')
    await page.getByRole('button',{name:'Open menu',exact:true}).click()
    const menu=page.getByRole('dialog',{name:'Academy menu'})
    await menu.evaluate(async el=>{await Promise.all(el.getAnimations({subtree:true}).map(animation=>animation.finished.catch(()=>{})))})
    await page.evaluate(fallback=>{
      window.__menuNavigationPhases=[]
      if(fallback){ document.startViewTransition=undefined; return }
      const original=document.startViewTransition.bind(document)
      document.startViewTransition=callback=>{
        const panel=document.querySelector('.academy-menu-panel')
        window.__menuNavigationPhases.push({phase:'page-fade-start', time:performance.now(), location:location.pathname, wheelMoving:panel.getAnimations({subtree:true}).some(animation=>animation.playState==='running'&&animation.transitionProperty==='transform')})
        return original(callback)
      }
    },fallback)
    const start=await page.evaluate(()=>performance.now())
    const target=menu.getByRole('button',{name:'Learning',exact:true})
    await target.click()
    await page.waitForTimeout(150)
    assert.equal(new URL(page.url()).pathname,'/academy/home','Old page remains visible while wheel closes')
    const closing=await page.locator('.academy-menu-panel').evaluate(el=>el.getAnimations({subtree:true}).some(animation=>animation.playState==='running'&&animation.transitionProperty==='transform'))
    assert.equal(closing,true,'Selection plays the wheel close animation')
    await page.waitForURL(base+'/academy/learn')
    const elapsed=await page.evaluate(start=>performance.now()-start,start)
    assert.ok(elapsed>=400,'Route changes only after the wheel closes')
    if(!fallback){
      const phases=await page.evaluate(()=>window.__menuNavigationPhases)
      assert.equal(phases.length,1)
      assert.equal(phases[0].location,'/academy/home')
      assert.equal(phases[0].wheelMoving,false,'Page fade starts only after wheel motion ends')
      await page.waitForFunction(()=>!document.documentElement.dataset.flight)
    } else {
      await page.waitForTimeout(300)
      assert.equal(await page.locator('#root').evaluate(el=>getComputedStyle(el).opacity),'1')
    }
    assert.deepEqual(errors,[])
    await page.screenshot({path:output+'/navigation-'+(fallback?'fallback':'native')+'.png'})
    console.log('PASS '+(fallback?'fallback fade':'native fade')+': wheel close before page fade, lazy destination, '+Math.round(elapsed)+'ms before route switch')
    await context.close()
  }

  const guest = await openAs(browser, { tier: 'guest' })
  await guest.page.goto(`${base}/academy/plans`)
  await guest.page.locator('#plans').waitFor()
  assert.equal(await guest.page.locator('.academy-menu-trigger').count(), 0)
  assert.equal(await guest.page.locator('#membership').count(), 1)
  assert.equal(await guest.page.locator('#mentor').count(), 0)
  assert.deepEqual(guest.errors, [])
  await guest.context.close()
  console.log('PASS public plans page')
} finally {
  await browser.close()
}
