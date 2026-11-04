import { expect, test } from '@playwright/test'

const currencies = [
  { code: 'USD', name: 'United States dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'BTC', name: 'Bitcoin', symbol: '₿' }
]
const rates = { 'USD:EUR': 0.9, 'USD:BTC': 0.00001, 'BTC:USD': 100000 }

async function mockApi(page) {
  await page.route('**/api/currencies', route => route.fulfill({ json: { currencies } }))
  await page.route('**/api/convert?*', route => {
    const url = new URL(route.request().url())
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const amount = Number(url.searchParams.get('amount'))
    const rate = from === to ? 1 : rates[`${from}:${to}`] ?? 0.9
    return route.fulfill({ json: {
      from: currencies.find(item => item.code === from),
      to: currencies.find(item => item.code === to),
      amount, rate, result: amount * rate,
      asOf: '2026-06-29T00:00:00.000Z'
    } })
  })
}

test('search, select crypto, and swap without a page error', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await mockApi(page)
  await page.goto('/')
  await expect(page).toHaveTitle('Cryat — Decoding the future of currency conversion.')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Decoding the future of currency conversion.')
  await expect(page.locator('header')).not.toContainText('Decoding the future of currency conversion.')
  await expect(page.locator('footer')).not.toContainText('Decoding the future of currency conversion.')
  await expect(page.locator('.result-value')).toContainText('90')
  await page.getByRole('button', { name: 'To' }).click()
  await page.getByRole('combobox', { name: 'Search To currencies' }).fill('bitcoin')
  await page.getByRole('option', { name: /BTC Bitcoin/ }).click()
  await expect(page.locator('.result-value')).toContainText('0.001')
  await page.getByRole('button', { name: 'Swap currencies' }).click()
  await expect(page.getByRole('button', { name: 'From' })).toContainText('BTC')
  await expect(page.locator('.result-value')).toContainText('10,000,000')
  expect(errors).toEqual([])
})

test('amount validation and tiny results work after editing', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  const amount = page.getByRole('textbox', { name: 'Amount' })
  await amount.fill('abc')
  await expect(page.getByRole('button', { name: 'Convert now' })).toBeDisabled()
  await expect(page.getByText('Enter an amount greater than 0 and no more than 1 trillion.')).toBeVisible()
  await expect(amount).toHaveAttribute('aria-invalid', 'true')
  await amount.fill('25.5')
  await expect(amount).toHaveAttribute('aria-invalid', 'false')
  await page.getByRole('button', { name: 'Convert now' }).click()
  await expect(page.locator('.result-value')).toContainText('22.95')
  await amount.fill('0.0000000001')
  await page.getByRole('button', { name: 'Convert now' }).click()
  await expect(page.locator('.result-value')).toContainText('9E-11')
})

test('picker keyboard and one-click switching work', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  const to = page.getByRole('button', { name: 'To' })
  await to.click()
  await page.getByRole('combobox', { name: 'Search To currencies' }).fill('bit')
  await page.keyboard.press('Enter')
  await expect(to).toContainText('BTC')
  await expect(to).toBeFocused()
  await to.click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Choose To currency' })).toHaveCount(0)
  await expect(to).toBeFocused()
  await to.click()
  await page.getByRole('button', { name: 'From' }).click()
  await expect(page.getByRole('dialog', { name: 'Choose From currency' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Choose To currency' })).toHaveCount(0)
})

test('empty picker search does not submit conversion and tabbing away closes it', async ({ page }) => {
  let conversions = 0
  await page.route('**/api/currencies', route => route.fulfill({ json: { currencies } }))
  await page.route('**/api/convert?*', route => {
    conversions++
    return route.fulfill({ json: {
      from: currencies[0], to: currencies[1], amount: 100, rate: 0.9,
      result: 90, asOf: '2026-06-29T00:00:00.000Z'
    } })
  })
  await page.goto('/')
  await expect(page.locator('.result-value')).toContainText('90')
  const before = conversions
  await page.getByRole('button', { name: 'To' }).click()
  const search = page.getByRole('combobox', { name: 'Search To currencies' })
  await search.fill('no-match')
  await search.press('Enter')
  expect(conversions).toBe(before)
  await page.getByRole('button', { name: 'Convert now' }).focus()
  await expect(page.getByRole('dialog', { name: 'Choose To currency' })).toHaveCount(0)
})

test('mobile picker stays inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockApi(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'To' }).click()
  const geometry = await page.evaluate(() => {
    const rect = document.querySelector('.picker').getBoundingClientRect()
    return { top: rect.top, bottom: rect.bottom, width: document.documentElement.scrollWidth, viewport: innerWidth, height: innerHeight }
  })
  expect(geometry.top).toBeGreaterThanOrEqual(0)
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.height)
  expect(geometry.width).toBeLessThanOrEqual(geometry.viewport)
  await expect(page.locator('.picker-backdrop')).toBeVisible()
  await page.getByRole('button', { name: 'Close To currency picker' }).click()
  await expect(page.getByRole('dialog', { name: 'Choose To currency' })).toHaveCount(0)
})

test('catalog error can be retried', async ({ page }) => {
  let requests = 0
  await page.route('**/api/currencies', route => {
    requests++
    return requests === 1
      ? route.fulfill({ status: 502, json: { error: 'Provider unavailable' } })
      : route.fulfill({ json: { currencies } })
  })
  await page.route('**/api/convert?*', route => route.fulfill({ json: {
    from: currencies[0], to: currencies[1], amount: 100, rate: 0.9,
    result: 90, asOf: '2026-06-29T00:00:00.000Z'
  } }))
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Provider unavailable')
  await expect(page.getByRole('button', { name: 'From' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'To' })).toBeDisabled()
  await expect(page.locator('.result-panel')).toHaveCount(0)
  await page.getByRole('button', { name: 'Retry' }).click()
  await expect(page.locator('.result-value')).toContainText('90')
})
