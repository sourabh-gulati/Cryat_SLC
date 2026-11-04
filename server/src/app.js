import express from 'express'

const UPSTREAM = 'https://api.restcountries.com/currencies/v1'
const CATALOG_TTL_MS = 60 * 60 * 1000
const CODE_RE = /^[A-Z0-9]{3,5}$/
const AMOUNT_RE = /^(?:\d+\.?\d*|\.\d+)$/
const MAX_AMOUNT = 1_000_000_000_000

export function createApp({ apiKey = process.env.RESTCOUNTRIES_API_KEY, fetchImpl = fetch, now = Date.now } = {}) {
  const app = express()
  let catalogCache = null

  async function getUpstream(path) {
    if (!apiKey) {
      const error = new Error('REST Countries API key is not configured.')
      error.status = 503
      throw error
    }

    let response
    try {
      response = await fetchImpl(`${UPSTREAM}${path}`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000)
      })
    } catch {
      const error = new Error('The rate provider is unavailable. Please try again.')
      error.status = 502
      throw error
    }

    if (!response.ok) {
      let payload
      try { payload = await response.json() } catch { payload = null }
      const error = new Error(
        response.status === 401 || response.status === 403
          ? 'The rate provider rejected the API key or account.'
          : response.status === 429
            ? 'The rate provider is busy. Please try again shortly.'
            : response.status === 400
              ? payload?.errors?.[0]?.message || 'The requested currency is unavailable.'
              : 'The rate provider could not complete the request.'
      )
      error.status = response.status === 400 ? 400 : response.status === 429 ? 429 : 502
      throw error
    }

    let payload
    try {
      payload = await response.json()
    } catch {
      const error = new Error('The rate provider returned an invalid response.')
      error.status = 502
      throw error
    }

    return payload
  }

  app.get('/api/health', (_req, res) => res.json({ ok: true }))

  app.get('/api/currencies', async (_req, res, next) => {
    try {
      if (catalogCache && now() < catalogCache.expiresAt) {
        return res.json({ currencies: catalogCache.currencies })
      }
      const payload = await getUpstream('/symbols')
      const currencies = payload?.data?.objects
      if (!Array.isArray(currencies)) throw new Error('Invalid currency catalog.')
      const clean = currencies.filter(item =>
        typeof item?.code === 'string' && typeof item?.name === 'string' &&
        (typeof item?.symbol === 'string' || item?.symbol === null)
      ).map(({ code, name, symbol }) => ({ code, name, symbol }))
      if (!clean.length) throw new Error('Empty currency catalog.')
      catalogCache = { currencies: clean, expiresAt: now() + CATALOG_TTL_MS }
      res.json({ currencies: clean })
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/convert', async (req, res, next) => {
    try {
      const from = String(req.query.from ?? '').trim().toUpperCase()
      const to = String(req.query.to ?? '').trim().toUpperCase()
      const amountText = String(req.query.amount ?? '').trim()
      const amount = Number(amountText)
      if (!CODE_RE.test(from) || !CODE_RE.test(to)) {
        return res.status(400).json({ error: 'Choose valid From and To currencies.' })
      }
      if (!AMOUNT_RE.test(amountText) || !Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
        return res.status(400).json({ error: 'Enter an amount greater than 0 and no more than 1 trillion.' })
      }
      const params = new URLSearchParams({ from, to, amount: amountText })
      const payload = await getUpstream(`/convert?${params}`)
      const row = payload?.data?.objects?.[0]
      if (!row || row.from?.code !== from || row.to?.code !== to ||
          !Number.isFinite(row.rate) || !Number.isFinite(row.result) || !Number.isFinite(row.as_of) ||
          !Number.isFinite(new Date(row.as_of * 1000).getTime())) {
        throw new Error('Invalid conversion response.')
      }
      res.json({
        from: row.from,
        to: row.to,
        amount: row.amount,
        rate: row.rate,
        result: row.result,
        asOf: new Date(row.as_of * 1000).toISOString()
      })
    } catch (error) {
      next(error)
    }
  })

  app.use((error, _req, res, _next) => {
    const status = error.status || 502
    res.status(status).json({ error: status === 502 && !error.status ? 'The rate provider returned an invalid response.' : error.message })
  })

  return app
}

