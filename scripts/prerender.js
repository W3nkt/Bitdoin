// Prerenders a fixed list of static, non-personalized routes to real HTML
// files after `vite build`, so crawlers that don't execute JavaScript (most
// AI assistants included) see real content instead of an empty <div id="root">.
//
// This does NOT touch React Router or main.tsx: ReactDOM.createRoot(...) just
// replaces the prerendered markup once the bundle loads for a real visitor,
// so behavior for humans is unchanged. Routes not listed here keep behaving
// exactly as before (served via GitHub Pages' 404.html SPA-redirect trick).
//
// Failure here must never fail the build — prerendering is an enhancement,
// not a requirement, and the site works fine without it (that's the status
// quo today). Every failure is caught and logged as a warning.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, '..', 'dist')

// Static, publicly-crawlable, non-personalized routes only. Account-gated,
// cart/checkout, and per-item dynamic pages (book detail, knowledge posts)
// are intentionally excluded from this first pass.
const ROUTES = [
  '/',
  '/welcome',
  '/bookstore',
  '/bookstore/books',
  '/bookstore/about',
  '/bookstore/faq',
  '/bookstore/contacts',
  '/bookstore/track',
  '/academy',
  '/academy/subscription',
  '/academy/careers',
]

function outputPathFor(route) {
  if (route === '/') return join(distDir, 'index.html')
  return join(distDir, route.replace(/^\//, ''), 'index.html')
}

async function main() {
  if (!existsSync(distDir)) {
    console.warn('[prerender] dist/ not found, skipping (run after `vite build`)')
    return
  }

  let chromium
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    console.warn('[prerender] playwright not installed, skipping prerender step')
    return
  }

  const server = await preview({ preview: { port: 4173, strictPort: false } })
  const address = server.resolvedUrls?.local?.[0]
  if (!address) {
    console.warn('[prerender] could not determine preview server URL, skipping')
    await server.httpServer.close()
    return
  }

  let browser
  try {
    browser = await chromium.launch()
  } catch (err) {
    console.warn('[prerender] failed to launch chromium, skipping:', err.message)
    await server.httpServer.close()
    return
  }

  let succeeded = 0
  for (const route of ROUTES) {
    try {
      const page = await browser.newPage()
      // The app defaults to Lao when localStorage is empty (a fresh crawler
      // has no stored preference). Force English so the prerendered snapshot
      // matches the language of the meta description and JSON-LD around it.
      await page.addInitScript(() => localStorage.setItem('pwen_lang', 'en'))
      await page.goto(new URL(route, address).toString(), { waitUntil: 'networkidle', timeout: 20000 })
      const html = await page.content()
      const outPath = outputPathFor(route)
      mkdirSync(dirname(outPath), { recursive: true })
      writeFileSync(outPath, html)
      await page.close()
      succeeded++
      console.log(`[prerender] ${route} -> ${outPath.replace(distDir, 'dist')}`)
    } catch (err) {
      console.warn(`[prerender] failed for ${route}, leaving unprerendered:`, err.message)
    }
  }

  await browser.close()
  await server.httpServer.close()
  console.log(`[prerender] done: ${succeeded}/${ROUTES.length} routes prerendered`)
}

main().catch(err => {
  console.warn('[prerender] unexpected error, continuing build unaffected:', err)
})
