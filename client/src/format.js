export function formatRateTime(asOf) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(new Date(asOf))
}

export function isValidAmount(value) {
  const text = String(value).trim()
  const number = Number(text)
  return /^(?:\d+\.?\d*|\.\d+)$/.test(text) && Number.isFinite(number) && number > 0 && number <= 1_000_000_000_000
}

export function formatConversionNumber(value, digits = 2) {
  if (value !== 0 && Math.abs(value) < 0.00000001) {
    return new Intl.NumberFormat('en-US', { notation: 'scientific', maximumFractionDigits: 6 }).format(value)
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value)
}
