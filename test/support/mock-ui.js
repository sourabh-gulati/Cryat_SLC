import { asOf, conversion, currencies } from '../fixtures/data.js'

export function mockUi({ catalog = currencies, catalogStatus = 200, convertStatus = 200 } = {}) {
  cy.intercept('GET', '**/api/currencies', {
    statusCode: catalogStatus,
    body: catalogStatus === 200 ? { currencies: catalog } : { error: 'Provider unavailable' }
  }).as('catalog')
  cy.intercept('GET', '**/api/convert?*', req => {
    if (convertStatus !== 200) {
      req.reply({ statusCode: convertStatus, body: { error: 'Conversion unavailable' } })
      return
    }
    const params = new URL(req.url).searchParams
    req.reply({ body: conversion(params.get('from'), params.get('to'), Number(params.get('amount'))) })
  }).as('convert')
}

export { asOf, currencies }
