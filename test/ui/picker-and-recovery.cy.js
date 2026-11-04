import { ConverterPage } from '../pages/ConverterPage.js'
import { conversion, currencies } from '../fixtures/data.js'
import { mockUi } from '../support/mock-ui.js'

describe('currency picker and recovery', () => {
  it('supports keyboard selection, Escape, and focus leaving the picker', () => {
    mockUi()
    const page = new ConverterPage()
    page.visit()
    cy.wait('@convert')
    page.picker('to').search('bit{enter}')
    page.to().should('contain', 'BTC').and('be.focused')
    const picker = page.picker('to')
    picker.search('{esc}')
    picker.dialog().should('not.exist')
    page.to().should('be.focused')
    page.picker('to').search('no-match{enter}')
    cy.get('[data-cy="picker"]').should('exist')
    cy.get('[data-cy="convert"]').focus()
    cy.get('[data-cy="picker"]').should('not.exist')
  })

  it('keeps the mobile picker inside the viewport and closes it', () => {
    cy.viewport(390, 844)
    mockUi()
    const page = new ConverterPage()
    page.visit()
    cy.wait('@convert')
    const picker = page.picker('to')
    cy.get('[data-cy="picker-backdrop"]').should('be.visible')
    cy.get('body').should('have.css', 'overflow', 'hidden')
    picker.dialog().should($dialog => {
      const rect = $dialog[0].getBoundingClientRect()
      expect(rect.top).to.be.at.least(0)
      expect(rect.bottom).to.be.at.most(844)
      expect(rect.left).to.be.at.least(0)
      expect(rect.right).to.be.at.most(390)
    })
    picker.close()
    picker.dialog().should('not.exist')
    cy.get('body').should('not.have.css', 'overflow', 'hidden')
  })

  it('retries after the catalog fails and does not show an empty picker', () => {
    let attempts = 0
    cy.intercept('GET', '**/api/currencies', req => {
      attempts++
      req.reply(attempts === 1
        ? { statusCode: 502, body: { error: 'Provider unavailable' } }
        : { body: { currencies } })
    }).as('catalog')
    cy.intercept('GET', '**/api/convert?*', { body: conversion('USD', 'EUR', 100) }).as('convert')
    const page = new ConverterPage()
    page.visit()
    cy.wait('@catalog')
    page.error().should('contain', 'Provider unavailable')
    page.from().should('be.disabled')
    page.to().should('be.disabled')
    cy.get('[data-cy="result-panel"]').should('not.exist')
    cy.get('[data-cy="retry"]').click()
    cy.wait('@catalog')
    cy.wait('@convert')
    page.result().should('contain', '90').and('contain', 'EUR')
  })
})
