import { ApiClient } from '../support/ApiClient.js'

describe('Cryat API routes', () => {
  const api = new ApiClient()

  beforeEach(() => api.reset())

  it('answers health checks without calling the provider', () => {
    api.health().then(response => {
      expect(response.status).to.eq(200)
      expect(response.body).to.deep.eq({ ok: true })
    })
    api.state().its('body.calls').should('have.length', 0)
  })

  it('filters and caches the currency catalog without exposing the key', () => {
    api.reset('catalogMixed')
    api.currencies().then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.currencies.map(item => item.code)).to.deep.eq(['USD', 'EUR', 'BTC', 'XAU'])
      expect(JSON.stringify(response.body)).not.to.include('fixture-key')
    })
    api.currencies().its('status').should('eq', 200)
    api.state().its('body.calls').should(calls => {
      expect(calls).to.have.length(1)
      expect(calls[0].authorization).to.eq('Bearer fixture-key')
    })
  })

  it('normalizes currency codes and returns the provider rate and source time', () => {
    api.convert({ from: 'usd', to: 'btc', amount: '100' }).then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.from.code).to.eq('USD')
      expect(response.body.to.code).to.eq('BTC')
      expect(response.body.amount).to.eq(100)
      expect(response.body.rate).to.eq(0.00001)
      expect(response.body.result).to.eq(0.001)
      expect(response.body.asOf).to.eq('2026-06-29T00:00:00.000Z')
    })
    api.state().its('body.calls.0.url').should('include', 'from=USD&to=BTC&amount=100')
  })

  it('rejects invalid codes and amounts before calling the provider', () => {
    api.convert({ from: 'US', to: 'EUR', amount: '100' }).its('status').should('eq', 400)
    for (const amount of ['0', 'wat', '0xFF', '1000000000001']) {
      api.convert({ from: 'USD', to: 'EUR', amount }).its('status').should('eq', 400)
    }
    api.state().its('body.calls').should('have.length', 0)
  })

  it('reports a missing provider key', () => {
    api.reset('missingKey')
    api.currencies().then(response => {
      expect(response.status).to.eq(503)
      expect(response.body.error).to.include('not configured')
    })
    api.state().its('body.calls').should('have.length', 0)
  })
})
