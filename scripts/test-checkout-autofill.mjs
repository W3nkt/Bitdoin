// Run with the local Vite server: node scripts/test-checkout-autofill.mjs
// All external requests are mocked; this never reads or writes customer data.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base = process.env.TEST_BASE_URL || 'http://localhost:5173'
const browser = await chromium.launch()
const context = await browser.newContext({ serviceWorkers: 'block' })
const page = await context.newPage()
const calls = []
let respond = () => ({ customer: null })
const returningCustomer = {
  customer_name: 'Returning Reader',
  delivery_address: 'Logistics Company: HAL Logistics\nProvince: Vientiane Prefecture\nDistrict: Chanthabuly District\nDelivery Address: Test Village\nBranch: Near the market',
}
await page.route('**/*', async route => {
  const url = new URL(route.request().url())
  if (url.origin === new URL(base).origin) return route.continue()
  if (url.pathname.endsWith('/functions/v1/checkout-customer')) {
    const body = route.request().postDataJSON()
    calls.push(body)
    const response = await respond(body)
    return route.fulfill({ status: response.status ?? 200, json: response })
  }
  return route.fulfill({ json: [] })
})
await context.addInitScript(() => {
  if (localStorage.getItem('autofill-test-initialized')) return
  localStorage.setItem('autofill-test-initialized', 'true')
  localStorage.setItem('pwen_lang', 'en')
  localStorage.setItem('pwen-cart', JSON.stringify({ state: { items: [{
    book_id: 'test-book', bookstore_id: 'test-store', quantity: 1,
    unit_price: 50000, book: { title: 'Test Book' },
  }] }, version: 0 }))
  localStorage.removeItem('pwen_checkout_draft')
})

const phone = page.locator('[name="phone"]')
const field = name => page.locator(`[name="${name}"]`)
const status = page.getByRole('status')
const expectValue = async (name, value) => {
  await page.waitForFunction(({ name, value }) => document.querySelector(`[name="${name}"]`)?.value === value, { name, value })
}
const waitForStatus = text => status.filter({ hasText: text }).waitFor()
const pass = name => console.log(`PASS - ${name}`)

try {
  await page.goto(`${base}/bookstore/checkout`, { waitUntil: 'domcontentloaded' })
  await phone.waitFor()
  await phone.fill('5551234')
  await page.waitForTimeout(650)
  assert.equal(calls.length, 0)
  pass('incomplete phone does not query the database')

  respond = () => ({ customer: returningCustomer })
  await phone.fill('55512345')
  await waitForStatus('Previous delivery details filled in')
  await expectValue('full_name', 'Returning Reader')
  await expectValue('province', 'vientiane-prefecture')
  await expectValue('district', '1-01')
  assert.equal(await field('delivery_address').inputValue(), 'Test Village\nBranch: Near the market')
  assert.equal(await page.locator('[name="logistics_provider"]:checked').inputValue(), 'HAL Logistics')
  assert.equal(calls.at(-1).phone, '02055512345')
  pass('returning customer restores all delivery fields and multiline address')

  await field('full_name').fill('Edited Reader')
  await field('delivery_address').fill('Edited delivery address')
  await page.reload()
  await waitForStatus('Previous delivery details filled in')
  await expectValue('full_name', 'Edited Reader')
  await expectValue('delivery_address', 'Edited delivery address')
  await expectValue('district', '1-01')
  pass('draft edits and district survive reload and another lookup')

  // A fresh lookup applies data for a different customer, even after a reload.
  await phone.fill('55512346')
  await waitForStatus('Previous delivery details filled in')
  await expectValue('full_name', 'Returning Reader')
  respond = () => ({ customer: null })
  await phone.fill('55512347')
  await waitForStatus('No previous delivery details found')
  for (const name of ['full_name', 'province', 'district', 'delivery_address']) {
    assert.equal(await field(name).inputValue(), '')
  }
  assert.equal(await page.locator('[name="logistics_provider"]:checked').count(), 0)
  pass('unknown number clears the previous customer’s autofilled details')

  let release
  const waitForLookup = async () => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (release) return
      await new Promise(resolve => setTimeout(resolve, 20))
    }
    throw new Error('Lookup did not start')
  }
  respond = () => new Promise(resolve => { release = resolve })
  await phone.fill('55512348')
  await waitForStatus('Looking up your delivery details')
  await waitForLookup()
  await field('full_name').fill('Name typed during lookup')
  await field('province').selectOption('vientiane-prefecture')
  await field('district').selectOption('1-02')
  release({ customer: returningCustomer })
  await waitForStatus('Previous delivery details filled in')
  await expectValue('full_name', 'Name typed during lookup')
  await expectValue('district', '1-02')
  pass('edits made during a lookup remain intact')

  release = undefined
  await phone.fill('55512349')
  await waitForStatus('Looking up your delivery details')
  await waitForLookup()
  await phone.fill('555')
  release({ customer: { ...returningCustomer, customer_name: 'Stale response' } })
  await page.waitForTimeout(650)
  assert.notEqual(await field('full_name').inputValue(), 'Stale response')
  pass('changing phone discards an in-flight response')

  respond = () => ({ status: 429, error: 'Too many requests' })
  await phone.fill('55512340')
  await waitForStatus('Could not load previous details')
  assert.equal(await field('full_name').isEnabled(), true)
  pass('lookup failures leave manual checkout available')

  const parserChecks = await page.evaluate(async () => {
    const { checkoutDeliveryDetails } = await import('/src/lib/deliveryAddress.ts')
    const { LAOS_ADMIN_DIVISIONS } = await import('/src/data/laosAdministrativeDivisions.ts')
    const province = LAOS_ADMIN_DIVISIONS[0]
    const district = province.districts[0]
    return {
      lao: checkoutDeliveryDetails(`ບໍລິສັດຂົນສົ່ງ: HAL Logistics\nແຂວງ: ${province.name_lo}\nເມືອງ: ${district.name_lo}\nທີ່ຢູ່ຈັດສົ່ງ: Test Village`),
      legacy: checkoutDeliveryDetails('An older unstructured address'),
      unknown: checkoutDeliveryDetails('Province: Unknown\nDistrict: Unknown\nDelivery Address: Test Village'),
    }
  })
  assert.equal(parserChecks.lao.province, 'vientiane-prefecture')
  assert.equal(parserChecks.lao.district, '1-01')
  assert.equal(parserChecks.legacy.delivery_address, 'An older unstructured address')
  assert.equal(parserChecks.unknown.province, '')
  assert.equal(parserChecks.unknown.district, '')
  pass('Lao labels, legacy addresses and unknown locations map safely')
} finally {
  await browser.close()
}
