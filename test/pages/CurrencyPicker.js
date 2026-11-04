export class CurrencyPicker {
  dialog() { return cy.get('[data-cy="picker"]') }
  search(term) { return cy.get('[data-cy="picker-search"]').type(term) }
  option(code) { return cy.get(`[data-cy="currency-option-${code}"]`) }
  select(code) { return this.option(code).click() }
  close() { return cy.get('[data-cy="picker-close"]').click() }
}
