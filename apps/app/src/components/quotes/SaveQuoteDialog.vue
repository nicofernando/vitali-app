<script setup lang="ts">
import type { CalculateQuoteResponse, Client } from '@/types'
import type { QuoteInsert } from '@/types'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ChevronDown, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import ClientForm from '@/components/clients/ClientForm.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useClientsStore } from '@/stores/clients'
import { useQuotesStore } from '@/stores/quotes'

const props = defineProps<{
  open: boolean
  result: CalculateQuoteResponse | null
  smartCuotasPercentage?: number
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': [quoteId: string]
}>()

const clientsStore = useClientsStore()
const quotesStore = useQuotesStore()
const { clients, loading: loadingClients } = storeToRefs(clientsStore)

const step = ref<'select' | 'create'>('select')
const searchQuery = ref('')
const comboOpen = ref(false)
const selectedClient = ref<Client | null>(null)
const saving = ref(false)
const generatingPdf = ref(false)
const newClientFormRef = ref<InstanceType<typeof ClientForm> | null>(null)
const creatingClient = ref(false)
const containerRef = ref<HTMLDivElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q)
    return clients.value.slice(0, 8)
  return clients.value.filter(c =>
    c.full_name.toLowerCase().includes(q)
    || (c.rut ?? '').toLowerCase().includes(q)
    || (c.email ?? '').toLowerCase().includes(q),
  ).slice(0, 8)
})

const buttonLabel = computed(() => {
  if (generatingPdf.value)
    return 'Generando PDF...'
  if (saving.value)
    return 'Guardando...'
  return 'Guardar y generar PDF'
})

watch(() => props.open, (v) => {
  if (v)
    clientsStore.fetchAll()
  else
    reset()
})

function reset() {
  step.value = 'select'
  searchQuery.value = ''
  comboOpen.value = false
  selectedClient.value = null
  saving.value = false
  generatingPdf.value = false
}

function openCombo() {
  comboOpen.value = true
  searchQuery.value = ''
  nextTick(() => searchInputRef.value?.focus())
}

function selectClient(client: Client) {
  selectedClient.value = client
  comboOpen.value = false
  searchQuery.value = ''
}

function clearClient() {
  selectedClient.value = null
  openCombo()
}

function goToCreate() {
  comboOpen.value = false
  step.value = 'create'
  nextTick(() => newClientFormRef.value?.init(null))
}

function handleClickOutside(e: MouseEvent) {
  if (!containerRef.value?.contains(e.target as Node))
    comboOpen.value = false
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', handleClickOutside))

async function handleCreateClient(values: Parameters<typeof clientsStore.create>[0]) {
  creatingClient.value = true
  try {
    const created = await clientsStore.create(values)
    selectedClient.value = created
    step.value = 'select'
    toast.success('Cliente creado')
  }
  catch {
    toast.error('Error al crear el cliente')
  }
  finally {
    creatingClient.value = false
  }
}

async function handleSave() {
  if (!selectedClient.value || !props.result)
    return

  saving.value = true
  try {
    const r = props.result
    if (!r.french && !r.smart)
      throw new Error('Resultado de simulación inválido')
    if (!r.unit.list_price)
      throw new Error('Precio de lista inválido')
    if (typeof r.pie_amount !== 'number' || !Number.isFinite(r.pie_amount))
      throw new Error('Monto de PIE inválido')

    const payload: QuoteInsert = {
      client_id: selectedClient.value.id,
      unit_id: r.unit.id,
      pie_percentage: (r.pie_amount / r.unit.list_price) * 100,
      pie_amount: r.pie_amount,
      financing_amount: r.financing_amount,
      credit_type: r.french && r.smart ? 'both' : r.french ? 'french' : 'smart',
      term_years: Math.round(r.french?.term_months ? r.french.term_months / 12 : (r.smart?.term_months ?? 240) / 12),
      monthly_rate: r.french?.monthly_rate ?? 0,
      monthly_payment: r.french?.monthly_payment ?? r.smart?.cuotas_payment ?? null,
      balloon_payment: r.smart?.balloon_payment ?? null,
      smart_cuotas_percentage: props.smartCuotasPercentage ?? null,
      quote_data_snapshot: r as unknown as Record<string, unknown>,
    }

    const quoteId = await quotesStore.create(payload)
    saving.value = false
    generatingPdf.value = true

    const pdfResult = await quotesStore.generatePdf(quoteId)
    window.open(pdfResult.url, '_blank')
    toast.success('Cotización guardada — PDF listo')
    emit('update:open', false)
    emit('saved', quoteId)
  }
  catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    toast.error(msg)
  }
  finally {
    saving.value = false
    generatingPdf.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Guardar cotización</DialogTitle>
        <DialogDescription>
          Asociá un cliente para guardar esta cotización
        </DialogDescription>
      </DialogHeader>

      <!-- Selección / búsqueda de cliente -->
      <div v-if="step === 'select'" class="space-y-3">
        <div ref="containerRef" class="relative">
          <!-- Cliente seleccionado -->
          <div
            v-if="selectedClient && !comboOpen"
            class="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <div>
              <span class="font-medium">{{ selectedClient.full_name }}</span>
              <span v-if="selectedClient.rut" class="text-muted-foreground ml-2 text-xs">{{ selectedClient.rut }}</span>
            </div>
            <button
              type="button"
              class="text-muted-foreground hover:text-foreground transition-colors ml-2 shrink-0"
              @click="clearClient"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Trigger sin selección -->
          <button
            v-else-if="!comboOpen"
            type="button"
            class="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            @click="openCombo"
          >
            <span>{{ loadingClients ? 'Cargando clientes...' : 'Buscar cliente...' }}</span>
            <ChevronDown class="h-4 w-4 shrink-0" />
          </button>

          <!-- Input de búsqueda -->
          <input
            v-else
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            class="flex h-9 w-full rounded-md border border-ring bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Buscar por nombre, RUT o email..."
            @keydown.escape="comboOpen = false"
          >

          <!-- Dropdown -->
          <div
            v-if="comboOpen"
            class="absolute z-50 mt-1 w-full rounded-md border bg-popover py-1 shadow-md text-sm text-popover-foreground max-h-64 overflow-y-auto"
          >
            <p v-if="loadingClients" class="px-3 py-2 text-muted-foreground text-center text-xs">
              Cargando...
            </p>
            <template v-else>
              <p v-if="searchResults.length === 0 && searchQuery.trim()" class="px-3 py-2 text-muted-foreground text-center text-xs">
                Sin resultados
              </p>
              <button
                v-for="client in searchResults"
                :key="client.id"
                type="button"
                class="flex w-full flex-col items-start px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                @click="selectClient(client)"
              >
                <span class="font-medium leading-tight">{{ client.full_name }}</span>
                <span class="text-xs text-muted-foreground leading-tight">
                  {{ client.rut ?? 'Sin RUT' }} · {{ client.email ?? 'Sin email' }}
                </span>
              </button>

              <div class="my-1 h-px bg-border" />

              <button
                type="button"
                class="flex w-full items-center gap-1.5 px-3 py-2 text-primary hover:bg-accent transition-colors text-left text-xs font-medium"
                @click="goToCreate"
              >
                + Crear cliente nuevo
              </button>
            </template>
          </div>
        </div>
      </div>

      <!-- Formulario de nuevo cliente -->
      <div v-else>
        <p class="text-sm text-muted-foreground mb-4">
          Completá los datos del nuevo cliente.
        </p>
        <ClientForm
          ref="newClientFormRef"
          :submitting="creatingClient"
          @submit="handleCreateClient"
          @cancel="step = 'select'"
        />
      </div>

      <DialogFooter v-if="step === 'select'">
        <Button variant="outline" @click="emit('update:open', false)">
          Cancelar
        </Button>
        <Button :disabled="!selectedClient || saving || generatingPdf" @click="handleSave">
          {{ buttonLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
