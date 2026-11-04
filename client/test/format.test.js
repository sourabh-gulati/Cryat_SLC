import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatConversionNumber, formatRateTime, isValidAmount } from '../src/format.js'

test('rate source timestamp formats without throwing', () => {
  const formatted = formatRateTime('2026-06-29T00:00:00.000Z')
  assert.match(formatted, /Jun 29, 2026/)
  assert.match(formatted, /\d{1,2}:\d{2}/)
})

test('amount validation accepts decimal text and rejects invalid input', () => {
  assert.equal(isValidAmount('0.0000000001'), true)
  assert.equal(isValidAmount('100'), true)
  assert.equal(isValidAmount('0'), false)
  assert.equal(isValidAmount('abc'), false)
})

test('tiny nonzero results remain visible', () => {
  assert.notEqual(formatConversionNumber(0.000000000000001), '0')
})
