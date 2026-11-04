import { CurrencyPicker } from './CurrencyPicker.js'

export class ConverterPage {
  visit() { cy.visit('/') }
  amount() { return cy.get('[data-cy="amount"]') }
  amountError() { return cy.get('[data-cy="amount-error"]') }
  from() { return cy.get('[data-cy="from-currency"]') }
  to() { return cy.get('[data-cy="to-currency"]') }
  swap() { return cy.get('[data-cy="swap"]').click() }
  convert() { return cy.get('[data-cy="convert"]').click() }
  result() { return cy.get('[data-cy="result-value"]') }
  rate() { return cy.get('[data-cy="rate"]') }
  rateTime() { return cy.get('[data-cy="rate-time"]') }
  error() { return cy.get('[data-cy="error"]') }
  setAmount(value) { return this.amount().clear().type(value) }
  picker(side) {
    cy.get(`[data-cy="${side}-currency"]`).click()
    return new CurrencyPicker()
  }
}
