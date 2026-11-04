import http from 'node:http'
import { createApp } from '../../server/src/app.js'
import { asOfSeconds, conversion, currencies } from '../fixtures/data.js'

const scenarios = new Set([
  'normal', 'catalogMixed', 'missingKey', 'auth', 'forbidden', 'rateLimit',
  'network', 'malformedJson', 'invalidCatalog', 'wrongPair', 'invalidTime', 'badRequest'
])
let scenario = 'normal'
let calls = []
let app = makeApp()

function makeApp() {
  return createApp({
    apiKey: scenario === 'missingKey' ? '' : 'fixture-key',
    now: () => Date.UTC(2026, 5, 29),
    fetchImpl: async (url, options) => {
      calls.push({ url, authorization: options.headers.Authorization })
      if (scenario === 'network') throw new Error('fixture network failure')
      if (scenario === 'auth') return new Response('Denied', { status: 401 })
      if (scenario === 'forbidden') return Response.json({ errors: [] }, { status: 403 })
      if (scenario === 'rateLimit') return Response.json({ errors: [] }, { status: 429 })
      if (scenario === 'badRequest') return Response.json({ errors: [{ message: 'Unavailable currency.' }] }, { status: 400 })
      if (scenario === 'malformedJson') return new Response('not json')

      if (url.endsWith('/symbols')) {
        if (scenario === 'invalidCatalog') return Response.json({ data: { objects: [] } })
        const objects = scenario === 'catalogMixed'
          ? [...currencies, { code: 123, name: 'Invalid', symbol: '$' }, { code: 'XAU', name: 'Gold', symbol: null }]
          : currencies
        return Response.json({ data: { objects } })
      }

      const params = new URL(url).searchParams
      const from = params.get('from')
      const to = params.get('to')
      const amount = Number(params.get('amount'))
      const row = conversion(from, to, amount)
      if (scenario === 'wrongPair') row.to = { code: 'GBP', name: 'Pound', symbol: '£' }
      return Response.json({ data: { objects: [{
        ...row,
        asOf: undefined,
        as_of: scenario === 'invalidTime' ? 1e20 : asOfSeconds
      }] } })
    }
  })
}

async function readBody(req) {
  let body = ''
  for await (const chunk of req) body += chunk
  return JSON.parse(body || '{}')
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/__test/reset' && req.method === 'POST') {
    try {
      const input = await readBody(req)
      if (!scenarios.has(input.scenario)) throw new Error('Unknown scenario')
      scenario = input.scenario
      calls = []
      app = makeApp()
      res.writeHead(204).end()
    } catch {
      res.writeHead(400).end()
    }
    return
  }
  if (req.url === '/__test/state' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ scenario, calls }))
    return
  }
  app(req, res)
})

server.listen(Number(process.env.PORT || 3001), '0.0.0.0', () => {
  console.log(`Cypress API harness listening on ${server.address().port}`)
})
