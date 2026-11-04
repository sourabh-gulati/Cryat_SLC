import { ConverterPage } from '../pages/ConverterPage.js'
import { conversion, currencies } from '../fixtures/data.js'
import { mockUi } from '../support/mock-ui.js'

describe('converter flow', () => {
  it('loads the catalog and shows a sourced conversion', () => {
    mockUi()
    const page = new ConverterPage()
    page.visit()
    cy.title().should('eq', 'Cryat — Decoding the future of currency conversion.')
    cy.get('[data-cy="brand"]').should('have.attr', 'aria-label', 'Cryat home').and('contain.text', 'cryat')
    cy.get('[data-cy="tagline"]').should('have.text', 'Decoding the future of currency conversion.')
    cy.get('header, footer').should('not.contain.text', 'Decoding the future of currency conversion.')
    cy.wait('@catalog')
    cy.wait('@convert').its('request.url').should('include', 'from=USD&to=EUR&amount=100')
    page.result().should('contain', '90').and('contain', 'EUR')
    page.rate().should('contain', '1 USD = 0.9 EUR')
    page.rateTime().should('contain', 'Jun 29, 2026')
  })

  it('searches by name, selects Bitcoin, and swaps the pair', () => {
    mockUi()
    const page = new ConverterPage()
    page.visit()
    cy.wait('@convert')
    const picker = page.picker('to')
    picker.search('bitcoin')
    picker.select('BTC')
    cy.wait('@convert')
    page.result().should('contain', '0.001').and('contain', 'BTC')
    page.swap()
    cy.wait('@convert')
    page.from().should('contain', 'BTC')
    page.result().should('contain', '10,000,000').and('contain', 'USD')
  })

  it('validates amounts and keeps tiny nonzero results visible', () => {
    mockUi()
    const page = new ConverterPage()
    page.visit()
    cy.wait('@convert')
    page.setAmount('abc')
    page.amount().should('have.attr', 'aria-invalid', 'true')
    page.amountError().should('contain', 'greater than 0')
    cy.get('[data-cy="convert"]').should('be.disabled')
    page.setAmount('1000000000001')
    cy.get('[data-cy="convert"]').should('be.disabled')
    page.setAmount('0.0000000001')
    page.amount().should('have.attr', 'aria-invalid', 'false')
    page.convert()
    cy.wait('@convert')
    page.result().should('contain', '9E-11')
  })

  it('does not replace a newer conversion with a delayed response', () => {
    mockUi()
    const page = new ConverterPage()
    page.visit()
    cy.wait('@convert')
    cy.intercept('GET', '**/api/convert?*', req => {
      const params = new URL(req.url).searchParams
      const amount = Number(params.get('amount'))
      req.reply({
        delay: amount === 200 ? 700 : 0,
        body: conversion(params.get('from'), params.get('to'), amount)
      })
    }).as('editedConvert')
    page.setAmount('200')
    page.convert()
    page.setAmount('300')
    page.convert()
    cy.wait('@editedConvert')
    cy.wait('@editedConvert')
    page.result().should('contain', '270').and('contain', 'EUR')
  })

  it('shows a conversion error and allows a later retry', () => {
    let failures = 1
    cy.intercept('GET', '**/api/currencies', { currencies }).as('catalog')
    cy.intercept('GET', '**/api/convert?*', req => {
      if (failures--) req.reply({ statusCode: 502, body: { error: 'Conversion unavailable' } })
      else req.reply({ body: conversion('USD', 'EUR', 100) })
    }).as('convert')
    const page = new ConverterPage()
    page.visit()
    cy.wait('@convert')
    page.error().should('contain', 'Conversion unavailable')
    page.convert()
    cy.wait('@convert')
    page.error().should('not.exist')
    page.result().should('contain', '90').and('contain', 'EUR')
  })
})
