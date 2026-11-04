<script setup>
import { computed, onMounted, ref } from 'vue'
import CurrencySelect from './CurrencySelect.vue'
import { formatConversionNumber, formatRateTime, isValidAmount } from './format.js'
import homeImage from './assets/Cryat.png'

const currencies = ref([])
const from = ref('USD')
const to = ref('EUR')
const amount = ref('100')
const result = ref(null)
const loadingCatalog = ref(true)
const loadingRate = ref(false)
const error = ref('')
const amountTouched = ref(false)
let requestId = 0

const amountValid = computed(() => isValidAmount(amount.value))
const amountError = computed(() => amountTouched.value && !amountValid.value
  ? 'Enter an amount greater than 0 and no more than 1 trillion.'
  : '')
const formattedResult = computed(() => {
  if (!result.value) return '—'
  const value = result.value.result
  return formatConversionNumber(value, value < 0.01 ? 10 : value < 1 ? 6 : 2)
})
const formattedRate = computed(() => result.value ? formatConversionNumber(result.value.rate, result.value.rate < 0.01 ? 10 : 6) : '—')
const rateTime = computed(() => result.value ? formatRateTime(result.value.asOf) : '')

async function loadCurrencies() {
  loadingCatalog.value = true
  error.value = ''
  try {
    const response = await fetch('/api/currencies')
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Could not load currencies.')
    currencies.value = data.currencies
    if (!currencies.value.some(item => item.code === from.value)) from.value = currencies.value[0]?.code || ''
    if (!currencies.value.some(item => item.code === to.value)) to.value = currencies.value.find(item => item.code !== from.value)?.code || from.value
    await convert()
  } catch (cause) {
    error.value = cause.message || 'Could not load currencies.'
  } finally {
    loadingCatalog.value = false
  }
}

async function convert() {
  const current = ++requestId
  if (!amountValid.value) {
    error.value = 'Enter an amount greater than 0 and no more than 1 trillion.'
    result.value = null
    loadingRate.value = false
    return
  }
  if (!from.value || !to.value) return
  loadingRate.value = true
  error.value = ''
  result.value = null
  try {
    const params = new URLSearchParams({ from: from.value, to: to.value, amount: String(amount.value).trim() })
    const response = await fetch(`/api/convert?${params}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Could not get a rate.')
    if (current === requestId) result.value = data
  } catch (cause) {
    if (current === requestId) error.value = cause.message || 'Could not get a rate.'
  } finally {
    if (current === requestId) loadingRate.value = false
  }
}

function swap() {
  ;[from.value, to.value] = [to.value, from.value]
  result.value = null
  convert()
}

function selectionChanged() {
  result.value = null
  convert()
}

function amountChanged() {
  amountTouched.value = true
  requestId++
  loadingRate.value = false
  result.value = null
}

onMounted(loadCurrencies)
</script>

<template>
  <div class="site-shell">
    <header class="topbar">
      <a class="brand" data-cy="brand" href="/" aria-label="Cryat home"><span class="brand-mark" aria-hidden="true">C</span><span>cryat<span class="brand-dot">.</span></span></a>
    </header>

    <main>
      <section class="hero">
        <h1 data-cy="tagline" class="visually-hidden">Decoding the future of currency conversion.</h1>
        <a class="hero-image-link" href="#converter-title" aria-label="Go to currency converter">
          <img class="hero-image" :src="homeImage" alt="Cryat currency conversion illustration with fiat and cryptocurrency symbols" width="1536" height="1024" fetchpriority="high" />
        </a>
        <p>Move between currencies with confidence. Simple conversions for everyday money and crypto, with the source time in plain sight.</p>
      </section>

      <section class="converter" aria-labelledby="converter-title">
        <div class="card-topline"><span id="converter-title">CONVERT CURRENCY</span><span class="card-sparkle" aria-hidden="true">✳</span></div>
        <form @submit.prevent="convert">
          <label class="field-label" for="amount">Amount</label>
          <div class="amount-wrap" :class="{ 'field-invalid': amountError }"><input id="amount" data-cy="amount" v-model="amount" type="text" inputmode="decimal" autocomplete="off" placeholder="Enter amount" :aria-invalid="!!amountError" :aria-describedby="amountError ? 'amount-error' : undefined" @input="amountChanged" /><span class="amount-code">{{ from }}</span></div>
          <p v-if="amountError" id="amount-error" data-cy="amount-error" class="field-error">{{ amountError }}</p>

          <div class="currency-row">
            <CurrencySelect id="from" v-model="from" label="From" :currencies="currencies" :disabled="!currencies.length" @update:model-value="selectionChanged" />
            <button class="swap-button" data-cy="swap" type="button" aria-label="Swap currencies" title="Swap currencies" :disabled="!currencies.length" @click="swap"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 6h12m0 0-3-3m3 3-3 3M16 14H4m0 0 3-3m-3 3 3 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <CurrencySelect id="to" v-model="to" label="To" :currencies="currencies" :disabled="!currencies.length" @update:model-value="selectionChanged" />
          </div>

          <button class="convert-button" data-cy="convert" type="submit" :disabled="loadingCatalog || loadingRate || !currencies.length || !amountValid"><span>{{ loadingRate ? 'Getting rate…' : 'Convert now' }}</span><span aria-hidden="true">↗</span></button>
        </form>

        <p v-if="loadingCatalog" data-cy="catalog-status" class="catalog-status" role="status">Loading currencies…</p>
        <div v-if="error" data-cy="error" class="error-box" role="alert"><span>{{ error }}</span><button v-if="!currencies.length" data-cy="retry" type="button" @click="loadCurrencies">Retry</button></div>

        <div v-if="currencies.length" data-cy="result-panel" class="result-panel" aria-live="polite">
          <div data-cy="result-label" class="result-label">{{ loadingRate ? 'CALCULATING' : 'CONVERTED AMOUNT' }}</div>
          <div data-cy="result-value" class="result-value"><span>{{ formattedResult }}</span><small>{{ result?.to?.code || to }}</small></div>
          <div class="result-divider"></div>
          <div class="rate-line"><span>Exchange rate</span><strong data-cy="rate">1 {{ result?.from?.code || from }} = {{ formattedRate }} {{ result?.to?.code || to }}</strong></div>
          <div class="rate-line"><span>Rate sourced</span><strong data-cy="rate-time">{{ rateTime || '—' }}</strong></div>
        </div>
      </section>

      <div class="below-card"><span><span class="tiny-star">✳</span> {{ currencies.length ? `${currencies.length} supported currency codes` : 'Fiat and crypto conversions' }}</span><span>Rates may vary by provider update time</span></div>
    </main>
    <footer><span>© {{ new Date().getFullYear() }} Cryat</span></footer>
  </div>
</template>

