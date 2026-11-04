import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createApp } from '../src/app.js'

let server
let base
const calls = []
const fakeFetch = async (url, options) => {
  calls.push({ url, options })
  if (url.endsWith('/symbols')) {
    return Response.json({ data: { objects: [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'BTC', name: 'Bitcoin', symbol: '₿' }
    ] } })
  }
  return Response.json({ data: { objects: [{
    from: { code: 'USD', name: 'US Dollar', symbol: '$' },
    to: { code: 'BTC', name: 'Bitcoin', symbol: '₿' },
    amount: 100,
    rate: 0.00001,
    result: 0.001,
    as_of: 1782691200
  }] } })
}

before(async () => {
  server = createApp({ apiKey: 'test-key', fetchImpl: fakeFetch }).listen(0)
  await new Promise(resolve => server.once('listening', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})
after(() => server.close())

test('catalog is loaded and cached without exposing the key', async () => {
  const first = await fetch(`${base}/api/currencies`)
  const second = await fetch(`${base}/api/currencies`)
  assert.equal(first.status, 200)
  assert.equal((await first.json()).currencies[1].code, 'BTC')
  assert.equal(second.status, 200)
  assert.equal(calls.filter(call => call.url.endsWith('/symbols')).length, 1)
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-key')
})

test('conversion returns provider rate and normalized timestamp', async () => {
  const response = await fetch(`${base}/api/convert?from=usd&to=btc&amount=100`)
  const data = await response.json()
  assert.equal(response.status, 200)
  assert.equal(data.result, 0.001)
  assert.equal(data.asOf, '2026-06-29T00:00:00.000Z')
  assert.match(calls.at(-1).url, /from=USD&to=BTC&amount=100/)
})

test('invalid amount is rejected before calling provider', async () => {
  const count = calls.length
  const response = await fetch(`${base}/api/convert?from=USD&to=BTC&amount=wat`)
  assert.equal(response.status, 400)
  assert.equal((await fetch(`${base}/api/convert?from=USD&to=BTC&amount=0xFF`)).status, 400)
  assert.equal(calls.length, count)
})

test('provider authentication error survives a non-JSON response', async () => {
  const app = createApp({ apiKey: 'bad-key', fetchImpl: async () => new Response('Denied', { status: 401 }) })
  const instance = app.listen(0)
  await new Promise(resolve => instance.once('listening', resolve))
  try {
    const response = await fetch(`http://127.0.0.1:${instance.address().port}/api/currencies`)
    assert.equal(response.status, 502)
    assert.match((await response.json()).error, /rejected the API key/)
  } finally {
    instance.close()
  }
})

test('conversion rejects a provider row with the wrong pair or invalid time', async () => {
  let row = { from: { code: 'USD' }, to: { code: 'GBP' }, rate: 1, result: 100, as_of: 1782691200 }
  const app = createApp({ apiKey: 'test-key', fetchImpl: async () => Response.json({ data: { objects: [row] } }) })
  const instance = app.listen(0)
  await new Promise(resolve => instance.once('listening', resolve))
  try {
    const url = `http://127.0.0.1:${instance.address().port}/api/convert?from=USD&to=EUR&amount=100`
    assert.equal((await fetch(url)).status, 502)
    row = { ...row, to: { code: 'EUR' }, as_of: 1e20 }
    assert.equal((await fetch(url)).status, 502)
  } finally {
    instance.close()
  }
})

