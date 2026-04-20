<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Check, ChevronDown, X } from 'lucide-vue-next'

interface Option {
  id: string
  name: string
}

const props = defineProps<{
  modelValue: string        // '' = sin filtro
  options: Option[]
  placeholder?: string      // texto cuando no hay selección
  allLabel?: string         // etiqueta de "Todos" en el dropdown
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)
const search = ref('')
const containerRef = ref<HTMLDivElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

const selectedOption = computed(() =>
  props.options.find(o => o.id === props.modelValue) ?? null,
)

// Cuando el panel está cerrado muestra el nombre seleccionado; abierto, el texto buscado
const inputDisplay = computed(() =>
  open.value ? search.value : (selectedOption.value?.name ?? ''),
)

const filteredOptions = computed(() => {
  if (!search.value.trim())
    return props.options
  const q = search.value.toLowerCase()
  return props.options.filter(o => o.name.toLowerCase().includes(q))
})

function openPanel() {
  if (props.disabled)
    return
  open.value = true
  search.value = ''
  // Foco al input tras el tick de renderizado
  setTimeout(() => inputRef.value?.focus(), 0)
}

function selectOption(id: string) {
  emit('update:modelValue', id)
  open.value = false
  search.value = ''
}

function clearSelection(e: MouseEvent) {
  e.stopPropagation()
  emit('update:modelValue', '')
  open.value = false
  search.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    open.value = false
    search.value = ''
  }
}

function handleClickOutside(e: MouseEvent) {
  if (!containerRef.value?.contains(e.target as Node)) {
    open.value = false
    search.value = ''
  }
}

// Resetear búsqueda al cerrar
watch(open, (v) => {
  if (!v)
    search.value = ''
})

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<template>
  <div ref="containerRef" class="relative">
    <!-- Trigger (cerrado) -->
    <button
      v-if="!open"
      type="button"
      :disabled="disabled"
      class="
        flex h-9 w-full items-center justify-between rounded-md border border-input
        bg-background px-3 py-2 text-sm shadow-xs ring-offset-background
        transition-colors
        hover:bg-accent hover:text-accent-foreground
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
      "
      @click="openPanel"
    >
      <span :class="selectedOption ? 'text-foreground' : 'text-muted-foreground'">
        {{ selectedOption?.name ?? placeholder ?? 'Seleccionar...' }}
      </span>
      <span class="flex items-center gap-0.5 shrink-0 ml-2">
        <X
          v-if="modelValue"
          class="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors"
          @click="clearSelection"
        />
        <ChevronDown class="h-4 w-4 text-muted-foreground" />
      </span>
    </button>

    <!-- Input de búsqueda (abierto) -->
    <div v-else class="relative">
      <input
        ref="inputRef"
        v-model="search"
        type="text"
        class="
          flex h-9 w-full rounded-md border border-ring bg-background px-3 py-2
          text-sm shadow-xs ring-offset-background outline-none
          placeholder:text-muted-foreground
        "
        :placeholder="placeholder ?? 'Buscar...'"
        @keydown="onKeydown"
      >
      <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>

    <!-- Dropdown -->
    <div
      v-if="open"
      class="
        absolute z-50 mt-1 w-full min-w-[160px] rounded-md border bg-popover
        py-1 shadow-md text-sm text-popover-foreground
        max-h-60 overflow-y-auto
      "
    >
      <!-- Opción "Todos" -->
      <button
        type="button"
        class="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors text-left"
        @click="selectOption('')"
      >
        <Check
          class="h-3.5 w-3.5 shrink-0 transition-opacity"
          :class="!modelValue ? 'opacity-100 text-primary' : 'opacity-0'"
        />
        <span class="text-muted-foreground italic">{{ allLabel ?? 'Todos' }}</span>
      </button>

      <div class="my-1 h-px bg-border" />

      <!-- Sin resultados -->
      <p v-if="filteredOptions.length === 0" class="px-3 py-2 text-muted-foreground text-center text-xs">
        Sin resultados
      </p>

      <!-- Opciones filtradas -->
      <button
        v-for="opt in filteredOptions"
        :key="opt.id"
        type="button"
        class="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors text-left"
        @click="selectOption(opt.id)"
      >
        <Check
          class="h-3.5 w-3.5 shrink-0 transition-opacity"
          :class="modelValue === opt.id ? 'opacity-100 text-primary' : 'opacity-0'"
        />
        {{ opt.name }}
      </button>
    </div>
  </div>
</template>
