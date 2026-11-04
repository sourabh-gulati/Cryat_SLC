<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, required: true },
  currencies: { type: Array, required: true },
  label: { type: String, required: true },
  id: { type: String, required: true },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])
const open = ref(false)
const query = ref('')
const activeIndex = ref(0)
const searchInput = ref(null)
const root = ref(null)
const trigger = ref(null)
const picker = ref(null)
const selected = computed(() => props.currencies.find(item => item.code === props.modelValue))
const filtered = computed(() => {
  const term = query.value.trim().toLowerCase()
  return props.currencies.filter(item => !term || `${item.code} ${item.name}`.toLowerCase().includes(term))
})
const crypto = new Set(['BTC', 'ETH'])
const metals = new Set(['XAU', 'XAG', 'XPT', 'XPD'])
const units = new Set(['XDR', 'MXV'])
function category(code) {
  if (crypto.has(code)) return 'Crypto'
  if (metals.has(code)) return 'Metal'
  if (units.has(code)) return 'Unit'
  return ''
}
function show() {
  if (props.disabled) return
  open.value = true
  query.value = ''
  activeIndex.value = 0
  nextTick(() => searchInput.value?.focus())
}
function close(restoreFocus = false) {
  open.value = false
  query.value = ''
  if (restoreFocus) nextTick(() => trigger.value?.focus())
}
function choose(item) {
  emit('update:modelValue', item.code)
  close(true)
}
function handleKey(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close(true)
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, Math.max(filtered.value.length - 1, 0))
    nextTick(() => picker.value?.querySelector('.picker-option.active')?.scrollIntoView({ block: 'nearest' }))
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
    nextTick(() => picker.value?.querySelector('.picker-option.active')?.scrollIntoView({ block: 'nearest' }))
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    if (filtered.value[activeIndex.value]) choose(filtered.value[activeIndex.value])
  }
}
watch(query, () => { activeIndex.value = 0 })
watch(open, value => { document.body.style.overflow = value ? 'hidden' : '' })
function handleOutside(event) {
  if (open.value && !root.value?.contains(event.target)) close()
}
function handleFocusOutside(event) {
  if (open.value && !root.value?.contains(event.target)) close()
}
onMounted(() => {
  document.addEventListener('pointerdown', handleOutside)
  document.addEventListener('focusin', handleFocusOutside)
})
onBeforeUnmount(() => {
  document.body.style.overflow = ''
  document.removeEventListener('pointerdown', handleOutside)
  document.removeEventListener('focusin', handleFocusOutside)
})
</script>

<template>
  <div ref="root" class="currency-field">
    <span class="field-label" :id="`${id}-label`">{{ label }}</span>
    <button ref="trigger" class="currency-trigger" :data-cy="`${id}-currency`" type="button" :disabled="disabled" :aria-labelledby="`${id}-label`" :aria-expanded="open" aria-haspopup="dialog" @click="show">
      <span class="currency-sign">{{ selected?.symbol || selected?.code?.slice(0, 1) || '¤' }}</span>
      <span class="currency-identity"><strong>{{ selected?.code || 'Select' }}</strong><small>{{ selected?.name || 'Choose currency' }}</small></span>
      <svg class="chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3.5 6 4.5 4 4.5-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div v-if="open" data-cy="picker-backdrop" class="picker-backdrop" @click="close(true)"></div>
    <div v-if="open" ref="picker" data-cy="picker" class="picker" role="dialog" :aria-label="`Choose ${label} currency`" @keydown="handleKey">
      <div class="picker-search-wrap">
        <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.7" cy="8.7" r="5.7" stroke="currentColor" stroke-width="1.7"/><path d="m13 13 4.3 4.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
        <input ref="searchInput" data-cy="picker-search" v-model="query" type="search" role="combobox" aria-autocomplete="list" aria-expanded="true" :aria-controls="`${id}-options`" :aria-activedescendant="filtered[activeIndex] ? `${id}-option-${filtered[activeIndex].code}` : undefined" placeholder="Search code or name" :aria-label="`Search ${label} currencies`" />
        <button class="picker-close" data-cy="picker-close" type="button" :aria-label="`Close ${label} currency picker`" @click="close(true)">×</button>
      </div>
      <div :id="`${id}-options`" class="picker-list" role="listbox" :aria-label="`${label} currencies`">
        <button v-for="(item, index) in filtered" :id="`${id}-option-${item.code}`" :key="item.code" :data-cy="`currency-option-${item.code}`" class="picker-option" :class="{ active: index === activeIndex, chosen: item.code === modelValue }" type="button" role="option" :aria-selected="item.code === modelValue" @mouseenter="activeIndex = index" @click="choose(item)">
          <span class="option-sign">{{ item.symbol || '¤' }}</span>
          <span class="option-text"><strong>{{ item.code }}</strong><small>{{ item.name }}</small></span>
          <span v-if="category(item.code)" class="option-badge">{{ category(item.code) }}</span>
        </button>
        <p v-if="!filtered.length" class="empty-search">No currencies match “{{ query }}”.</p>
      </div>
    </div>
  </div>
</template>

