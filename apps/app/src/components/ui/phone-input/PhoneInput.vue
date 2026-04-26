<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { PHONE_COUNTRIES, PRIORITY_DIAL_CODES } from '@/lib/phone-countries'

const props = defineProps<{
  countryCode: string
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  id?: string
  name?: string
}>()

const emit = defineEmits<{
  'update:countryCode': [string]
  'update:modelValue': [string]
  'blur': [FocusEvent]
  'change': [Event]
}>()

const open = ref(false)
const search = ref('')
const containerRef = ref<HTMLDivElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)

// US y Canadá comparten el código +1. Excluimos CA para que el selector
// muestre la bandera de EEUU cuando el código activo es +1.
const selected = computed(() =>
  PHONE_COUNTRIES.find(c => c.dial_code === props.countryCode && c.code !== 'CA')
  ?? PHONE_COUNTRIES[0],
)

function matchesSearch(country: { name: string, dial_code: string }, q: string): boolean {
  // También busca sin el "+" para que "56" encuentre "+56"
  return country.name.toLowerCase().includes(q)
    || country.dial_code.includes(q)
    || country.dial_code.replace('+', '').startsWith(q)
}

function filterCountryList(isPriority: boolean, q: string) {
  return PHONE_COUNTRIES
    .filter(c => PRIORITY_DIAL_CODES.has(c.dial_code) === isPriority)
    .filter(c => !q || matchesSearch(c, q))
}

const priorityList = computed(() => {
  const q = search.value.toLowerCase().trim()
  return filterCountryList(true, q)
})

const otherList = computed(() => {
  const q = search.value.toLowerCase().trim()
  return filterCountryList(false, q)
})

const hasResults = computed(() => priorityList.value.length > 0 || otherList.value.length > 0)

function openDropdown() {
  if (props.disabled)
    return
  open.value = true
  search.value = ''
  setTimeout(() => searchRef.value?.focus(), 0)
}

function selectCountry(dialCode: string) {
  emit('update:countryCode', dialCode)
  open.value = false
  search.value = ''
}

function handleClickOutside(e: MouseEvent) {
  if (!containerRef.value?.contains(e.target as Node)) {
    open.value = false
    search.value = ''
  }
}

function onSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    open.value = false
    search.value = ''
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<template>
  <div ref="containerRef" class="relative flex">
    <!-- Selector de código de país -->
    <button
      type="button"
      :disabled="disabled"
      class="flex items-center gap-1 shrink-0 h-9 px-2.5 rounded-l-md border border-r-0 border-input
             bg-background text-sm hover:bg-accent hover:text-accent-foreground
             focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50
             disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
      @click="openDropdown"
    >
      <span class="text-base leading-none">{{ selected.flag }}</span>
      <span class="text-muted-foreground font-mono text-xs tabular-nums">{{ selected.dial_code }}</span>
      <ChevronDown class="size-3 text-muted-foreground shrink-0 ml-0.5" />
    </button>

    <!-- Input del número local -->
    <input
      :id="id"
      :name="name"
      :value="modelValue"
      :placeholder="placeholder ?? '9 1234 5678'"
      :disabled="disabled"
      type="tel"
      class="flex-1 h-9 min-w-0 rounded-r-md border border-input bg-transparent px-3 py-1 text-base
             shadow-xs transition-[color,box-shadow] outline-none
             placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground
             focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
             aria-invalid:ring-destructive/20 aria-invalid:border-destructive
             disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="emit('blur', $event)"
      @change="emit('change', $event)"
    >

    <!-- Dropdown -->
    <div
      v-if="open"
      class="absolute left-0 top-full z-50 mt-1 w-72 rounded-md border bg-popover shadow-md
             text-sm text-popover-foreground overflow-hidden"
    >
      <!-- Buscador -->
      <div class="p-2 border-b">
        <input
          ref="searchRef"
          v-model="search"
          type="text"
          class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none
                 placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          placeholder="Buscar país o código..."
          @keydown="onSearchKeydown"
        >
      </div>

      <div class="max-h-60 overflow-y-auto">
        <!-- Sin resultados -->
        <p v-if="!hasResults" class="px-3 py-4 text-center text-xs text-muted-foreground">
          Sin resultados
        </p>

        <!-- Países prioritarios -->
        <template v-if="priorityList.length > 0">
          <button
            v-for="country in priorityList"
            :key="country.code"
            type="button"
            class="flex w-full items-center gap-3 px-3 py-2 hover:bg-accent hover:text-accent-foreground
                   transition-colors text-left"
            :class="country.dial_code === countryCode ? 'bg-accent/40' : ''"
            @click="selectCountry(country.dial_code)"
          >
            <span class="text-base w-6 text-center leading-none shrink-0">{{ country.flag }}</span>
            <span class="font-mono text-xs text-muted-foreground w-10 shrink-0">{{ country.dial_code }}</span>
            <span class="truncate">{{ country.name }}</span>
          </button>
        </template>

        <!-- Separador -->
        <template v-if="priorityList.length > 0 && otherList.length > 0">
          <div class="my-1 h-px bg-border mx-2" />
        </template>

        <!-- Resto de países -->
        <button
          v-for="country in otherList"
          :key="country.code"
          type="button"
          class="flex w-full items-center gap-3 px-3 py-2 hover:bg-accent hover:text-accent-foreground
                 transition-colors text-left"
          :class="country.dial_code === countryCode ? 'bg-accent/40' : ''"
          @click="selectCountry(country.dial_code)"
        >
          <span class="text-base w-6 text-center leading-none shrink-0">{{ country.flag }}</span>
          <span class="font-mono text-xs text-muted-foreground w-10 shrink-0">{{ country.dial_code }}</span>
          <span class="truncate">{{ country.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
