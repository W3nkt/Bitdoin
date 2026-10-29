// Run with a local Vite server: node scripts/test-book-detail-scroll.mjs
// External requests are mocked; no live catalog or customer data is accessed.
import assert from 'node:assert/strict'
import { chromium, webkit } from 'playwright'

const base = process.env.TEST_BASE_URL || 'http://localhost:5173'
const engine = process.env.TEST_BROWSER === 'webkit' ? webkit : chromium
const category = { id: 'scroll-category', name_en: 'Test category', name_lo: 'Test category' }
const books = Array.from({ length: 24 }, (_, index) => ({
  id: `scroll-book-${index + 1}`,
  title: `Scroll Test Book ${index + 1}`,
  author: 'Test Author',
  category_id: category.id,
  category,
  language: 'English',
  pages: 200,
  description: Array.from({ length: 20 }, () => '<p>A long book description for testing navigation from the bottom of a page.</p>').join(''),
  prices: [],
}))

const browser = await engine.launch()
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 800 }]) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' })
    await context.addInitScript(() => localStorage.setItem('pwen_lang', 'en'))
    const page = await context.newPage()
    page.setDefaultTimeout(10000)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    let detailDelay = 0
    await page.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (url.origin === new URL(base).origin) return route.continue()
      if (url.pathname.endsWith('/rpc/search_books')) {
        return route.fulfill({ json: { books, count: books.length } })
      }
      if (url.pathname.endsWith('/categories')) return route.fulfill({ json: [category] })
      if (url.pathname.endsWith('/books')) {
        const id = url.searchParams.get('id')
        if (id?.startsWith('eq.')) {
          if (detailDelay) await new Promise(resolve => setTimeout(resolve, detailDelay))
          return route.fulfill({ json: books.find(book => book.id === id.slice(3)) })
        }
        return route.fulfill({ json: books.filter(book => `neq.${book.id}` !== id).slice(0, 8) })
      }
      return route.fulfill({ json: [] })
    })

    const bookPath = index => `/bookstore/books/${books[index].id}`
    const link = index => page.locator(`main a[href="${bookPath(index)}"]`).last()
    async function assertTop(label) {
      // Check immediately and again after native history restoration/layout settles.
      assert.equal(await page.evaluate(() => window.scrollY), 0, `${label}: initial scroll`)
      await page.waitForTimeout(250)
      assert.equal(await page.evaluate(() => window.scrollY), 0, `${label}: settled scroll`)
    }
    async function assertBook(index, label) {
      await page.waitForURL(`**${bookPath(index)}`)
      await page.getByRole('heading', { name: books[index].title, exact: true, level: 1 }).waitFor()
      await assertTop(label)
      console.log(`PASS ${engine.name()} ${viewport.width}px - ${label}`)
    }
    async function scrollDown() {
      await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
      assert.ok(await page.evaluate(() => window.scrollY > 300), 'test starts scrolled down')
    }

    await page.goto(`${base}/bookstore/books`, { waitUntil: 'domcontentloaded' })
    await link(12).scrollIntoViewIfNeeded()
    assert.ok(await page.evaluate(() => window.scrollY > 300), 'catalog is scrolled down')
    detailDelay = 350
    await link(12).click()
    await assertBook(12, 'scrolled catalog opens an uncached book at the top')
    detailDelay = 0

    await link(1).scrollIntoViewIfNeeded()
    assert.ok(await page.evaluate(() => window.scrollY > 300), 'related books are below the fold')
    await link(1).click()
    await assertBook(1, 'related book opens at the top')

    await scrollDown()
    await page.goBack()
    await assertBook(12, 'Back to a cached book starts at the top')
    await scrollDown()
    await page.goForward()
    await assertBook(1, 'Forward to a cached book starts at the top')

    await scrollDown()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await assertBook(1, 'reloading a book starts at the top')

    // Reading should still allow scrolling after the navigation reset.
    await scrollDown()
    await page.getByRole('button', { name: 'Switch language', exact: true }).click()
    assert.ok(await page.evaluate(() => window.scrollY > 300), 'ordinary updates preserve reading position')
    await page.getByRole('button', { name: 'Switch language', exact: true }).click()
    await page.locator('nav a[href="/bookstore/cart"]:visible').first().click()
    await page.waitForURL('**/bookstore/cart')
    await page.getByRole('button', { name: 'Continue Shopping', exact: true }).waitFor()
    assert.equal(await page.evaluate(() => history.scrollRestoration), 'auto', 'browser restoration resumes after leaving details')
    await page.goBack()
    await assertBook(1, 'returning from another page starts the book at the top')

    assert.deepEqual(errors, [], 'no browser runtime errors')
    await context.close()
  }
} finally {
  await browser.close()
}
