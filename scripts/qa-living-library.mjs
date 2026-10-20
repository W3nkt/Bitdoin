import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const url = process.env.LIBRARY_PREVIEW_URL || 'http://127.0.0.1:4173/'
const output = 'qa-artifacts'
await mkdir(output, { recursive: true })
const browser = await chromium.launch()
const errors = []
const results = []

async function ready(page) {
  await page.locator('.library-book-center img').waitFor()
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.querySelectorAll('.living-library img')].map(image => image.decode()))
  })
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 })
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => localStorage.setItem('pwen_lang', 'en'))
  await page.goto(url)
  await ready(page)
  assert.match(await page.locator('h1').innerText(), /A world of ideas/)
  assert.match(await page.locator('.library-shelf-caption').innerText(), /Find your focus/)
  await page.getByRole('button', { name: 'Next idea', exact: true }).click()
  assert.match(await page.locator('.library-shelf-caption').innerText(), /Everyday English/)
  await page.keyboard.press('ArrowRight')
  assert.match(await page.locator('.library-shelf-caption').innerText(), /Ideas into action/)
  await page.getByRole('button', { name: 'Previous idea', exact: true }).click()
  assert.match(await page.locator('.library-shelf-caption').innerText(), /Everyday English/)
  await page.locator('.library-dots button').nth(1).click()
  assert.match(await page.locator('.library-shelf-caption').innerText(), /Find your focus/)
  assert.equal(await page.locator('.library-book[aria-pressed="true"]').count(), 1)
  await page.locator('.library-book-left').click()
  assert.match(await page.locator('.library-shelf-caption').innerText(), /Ideas into action/)
  await page.locator('.library-dots button').nth(1).click()
  results.push('Carousel: previous/next, wraparound, keyboard, book selection, indicators and announcement passed')

  await page.getByRole('button', { name: 'Switch to Lao', exact: true }).click()
  assert.equal(await page.locator('.living-library').getAttribute('lang'), 'lo')
  assert.equal(await page.evaluate(() => localStorage.getItem('pwen_lang')), 'lo')
  assert.match(await page.locator('h1').innerText(), /ໂລກແຫ່ງຄວາມຄິດ/)
  await page.getByRole('button', { name: 'Switch to English', exact: true }).click()
  results.push('Language switching and persistence passed')

  for (const [selector, path, platform] of [
    ['.library-button-orange', '/bookstore', 'bookstore'],
    ['.library-button-outline', '/academy', 'academy'],
    ['.library-text-link', '/bookstore', 'bookstore'],
    ['.library-button-gold', '/academy', 'academy'],
    ['.library-signin', '/auth', null],
  ]) {
    await page.locator(selector).click()
    await page.waitForURL(new URL(path, url).href)
    if (platform) assert.equal(await page.evaluate(() => localStorage.getItem('bitdoin_last_platform')), platform)
    await page.goto(url)
    await ready(page)
  }
  await page.locator('.library-nav a').first().click()
  assert.equal(new URL(page.url()).hash, '#bookstore')
  await page.locator('.library-nav a').last().click()
  assert.equal(new URL(page.url()).hash, '#academy')
  results.push('All primary CTAs, sign-in, platform memory and section navigation passed')

  await page.goto(url)
  await ready(page)
  await page.screenshot({ path: `${output}/living-library-desktop.png`, fullPage: true })
  for (const width of [1440, 1159, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const language of ['en', 'lo']) {
      const current = await page.locator('.living-library').getAttribute('lang')
      if (current !== language) await page.locator('.library-language').click()
      await ready(page)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width} ${language}`)
      for (const selector of ['.library-button-orange', '.library-button-outline', '.library-language', '.library-signin', '.library-carousel-next']) {
        const box = await page.locator(selector).boundingBox()
        assert.ok(box && box.width >= 44 && box.height >= 44, `Small target: ${selector} at ${width} ${language}`)
      }
      if ([1159, 390, 320].includes(width)) await page.screenshot({ path: `${output}/living-library-${width}-${language}.png`, fullPage: true })
    }
  }
  results.push('English and Lao at 1440, 1159, 1024, 768, 390 and 320px: no horizontal overflow; primary touch targets >=44px')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(await page.locator('.library-book').first().evaluate(element => getComputedStyle(element).transitionDuration), '0s')
  results.push('Reduced motion disables carousel transitions')

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  mobile.on('pageerror', error => errors.push(error.message))
  await mobile.addInitScript(() => localStorage.setItem('pwen_lang', 'en'))
  await mobile.goto(url)
  await ready(mobile)
  await mobile.locator('.library-books').scrollIntoViewIfNeeded()
  const shelf = await mobile.locator('.library-books').boundingBox()
  const touch = await mobile.context().newCDPSession(mobile)
  const y = shelf.y + shelf.height / 2
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y }] })
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 80, y }] })
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  assert.match(await mobile.locator('.library-shelf-caption').innerText(), /Everyday English/)
  results.push('Mobile swipe selection passed')
  await mobile.close()

  assert.deepEqual(errors, [])
  results.push('No uncaught browser errors')
  await writeFile(`${output}/living-library-checks.json`, JSON.stringify({ url, results }, null, 2))
  console.log(results.join('\n'))

  // Display both unmodified images in one browser capture for visual comparison.
  const sourcePath = process.env.LIBRARY_DESIGN_REFERENCE
  if (sourcePath) {
    const source = await readFile(sourcePath)
    const implementation = await readFile(`${output}/living-library-1159-en.png`)
    const comparison = await browser.newPage({ viewport: { width: 2318, height: 1600 }, deviceScaleFactor: 1 })
    await comparison.setContent(`<html><body style="margin:0;display:flex;align-items:flex-start;background:#ddd"><img style="width:1159px;height:auto" src="data:image/png;base64,${source.toString('base64')}"><img style="width:1159px;height:auto" src="data:image/png;base64,${implementation.toString('base64')}"></body></html>`)
    await comparison.evaluate(() => Promise.all([...document.images].map(image => image.decode())))
    await comparison.screenshot({ path: `${output}/living-library-comparison.png`, fullPage: true })
    await page.setViewportSize({ width: 1159, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    if (await page.locator('.living-library').getAttribute('lang') !== 'en') await page.locator('.library-language').click()
    await page.evaluate(() => window.scrollTo(0, 0))
    const detailsTop = (await page.locator('.library-destinations').boundingBox()).y
    await comparison.setViewportSize({ width: 2318, height: 640 })
    await comparison.setContent(`<html><body style="margin:0;display:flex;background:#ddd"><div style="width:1159px;height:640px;overflow:hidden"><img style="width:1159px;transform:translateY(-776px)" src="data:image/png;base64,${source.toString('base64')}"></div><div style="width:1159px;height:640px;overflow:hidden"><img style="width:1159px;transform:translateY(-${detailsTop}px)" src="data:image/png;base64,${implementation.toString('base64')}"></div></body></html>`)
    await comparison.evaluate(() => Promise.all([...document.images].map(image => image.decode())))
    await comparison.screenshot({ path: `${output}/living-library-details-comparison.png` })
    await comparison.close()
  }
} finally {
  await browser.close()
}
