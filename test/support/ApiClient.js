export class ApiClient {
  baseUrl() { return cy.env(['apiBaseUrl']).then(({ apiBaseUrl }) => apiBaseUrl) }
  reset(scenario = 'normal') {
    return this.baseUrl().then(baseUrl => cy.request({
      method: 'POST', url: `${baseUrl}/__test/reset`, body: { scenario }
    }))
  }
  state() { return this.baseUrl().then(baseUrl => cy.request(`${baseUrl}/__test/state`)) }
  health() { return this.baseUrl().then(baseUrl => cy.request(`${baseUrl}/api/health`)) }
  currencies(options = {}) {
    return this.baseUrl().then(baseUrl => cy.request({
      url: `${baseUrl}/api/currencies`, failOnStatusCode: false, ...options
    }))
  }
  convert(query, options = {}) {
    return this.baseUrl().then(baseUrl => cy.request({
      url: `${baseUrl}/api/convert`, qs: query, failOnStatusCode: false, ...options
    }))
  }
}
