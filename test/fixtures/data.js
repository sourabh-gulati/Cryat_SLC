export const currencies = [
  { code: 'USD', name: 'United States dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'BTC', name: 'Bitcoin', symbol: '₿' }
]

export const asOf = '2026-06-29T00:00:00.000Z'
export const asOfSeconds = 1782691200

export const rates = {
  'USD:EUR': 0.9,
  'EUR:USD': 1.1,
  'USD:BTC': 0.00001,
  'BTC:USD': 100000
}

export function conversion(from, to, amount) {
  const rate = from === to ? 1 : rates[`${from}:${to}`] ?? 0.9
  return {
    from: currencies.find(item => item.code === from) || { code: from, name: from, symbol: null },
    to: currencies.find(item => item.code === to) || { code: to, name: to, symbol: null },
    amount,
    rate,
    result: amount * rate,
    asOf
  }
}
