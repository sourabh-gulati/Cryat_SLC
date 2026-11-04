import { ApiClient } from '../support/ApiClient.js'

describe('provider failure handling', () => {
  const api = new ApiClient()

  beforeEach(() => api.reset())

  for (const scenario of ['auth', 'forbidden']) {
    it(`maps ${scenario} to a useful authentication error`, () => {
      api.reset(scenario)
      api.currencies().then(response => {
        expect(response.status).to.eq(502)
        expect(response.body.error).to.include('rejected the API key')
      })
    })
  }

  it('preserves the rate limit status and message', () => {
    api.reset('rateLimit')
    api.convert({ from: 'USD', to: 'EUR', amount: '100' }).then(response => {
      expect(response.status).to.eq(429)
      expect(response.body.error).to.include('busy')
    })
  })

  it('returns the provider message for a rejected currency', () => {
    api.reset('badRequest')
    api.convert({ from: 'USD', to: 'EUR', amount: '100' }).then(response => {
      expect(response.status).to.eq(400)
      expect(response.body.error).to.eq('Unavailable currency.')
    })
  })

  for (const scenario of ['network', 'malformedJson', 'invalidCatalog']) {
    it(`handles ${scenario} without exposing internals`, () => {
      api.reset(scenario)
      api.currencies().then(response => {
        expect(response.status).to.eq(502)
        expect(response.body.error).to.be.a('string').and.not.be.empty
        expect(JSON.stringify(response.body)).not.to.include('fixture-key')
      })
    })
  }

  for (const scenario of ['wrongPair', 'invalidTime']) {
    it(`rejects conversion response with ${scenario}`, () => {
      api.reset(scenario)
      api.convert({ from: 'USD', to: 'EUR', amount: '100' }).then(response => {
        expect(response.status).to.eq(502)
        expect(response.body.error).to.include('invalid response')
      })
    })
  }
})
