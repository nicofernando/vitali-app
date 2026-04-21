<script setup lang="ts">
import type { CalculateQuoteResponse, Client } from '@/types'
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
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
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
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

const step = ref<'search' | 'new-client'>('search')
const searchQuery = ref('')
const selectedClient = ref<Client | null>(null)
const saving = ref(false)
const newClientFormRef = ref<InstanceType<typeof ClientForm> | null>(null)
const creatingClient = ref(false)

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q)
    return []
  return clients.value.filter(c =>
    c.full_name.toLowerCase().includes(q)
    || (c.rut ?? '').toLowerCase().includes(q)
    || (c.email ?? '').toLowerCase().includes(q),
  ).slice(0, 10)
})

watch(() => props.open, (v) => {
  if (v) {
    clientsStore.fetchAll()
  }
  else {
    reset()
  }
})

function reset() {
  step.value = 'search'
  searchQuery.value = ''
  selectedClient.value = null
  saving.value = false
}

function selectClient(client: Client) {
  selectedClient.value = client
}

function goToNewClient() {
  step.value = 'new-client'
  nextTick(() => newClientFormRef.value?.init(null))
}

async function handleCreateClient(values: Parameters<typeof clientsStore.create>[0]) {
  creatingClient.value = true
  try {
    const created = await clientsStore.create(values)
    selectedClient.value = created
    step.value = 'search'
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
      throw new Error('Resultado de simulación inválido: no hay datos de crédito')
    if (!r.unit.list_price)
      throw new Error('Precio de lista inválido')
    if (typeof r.pie_amount !== 'number' || !Number.isFinite(r.pie_amount))
      throw new Error('Monto de PIE inválido')
    const quoteId = await quotesStore.create({
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
    })

    toast.success('Cotización guardada')
    emit('update:open', false)
    emit('saved', quoteId)
  }
  catch {
    toast.error('Error al guardar la cotización')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Guardar cotización</DialogTitle>
        <DialogDescription>
          Asociá un cliente para guardar esta cotización
        </DialogDescription>
      </DialogHeader>

      <!-- Step: buscar cliente -->
      <template v-if="step === 'search'">
        <div class="space-y-4">
          <!-- Búsqueda -->
          <Input
            v-model="searchQuery"
            placeholder="Buscar por nombre, RUT o email..."
            autofocus
          />

          <!-- Resultados -->
          <p v-if="loadingClients" class="text-sm text-muted-foreground">
            Cargando clientes...
          </p>
          <template v-else>
            <div v-if="searchResults.length > 0" class="border rounded-lg divide-y max-h-48 overflow-y-auto">
              <button
                v-for="client in searchResults"
                :key="client.id"
                class="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors"
                :class="selectedClient?.id === client.id ? 'bg-muted' : ''"
                @click="selectClient(client)"
              >
                <p class="font-medium">
                  {{ client.full_name }}
                </p>
                <p class="text-muted-foreground text-xs">
                  {{ client.rut ?? 'Sin RUT' }} · {{ client.email ?? 'Sin email' }}
                </p>
              </button>
            </div>
            <p v-else-if="searchQuery.trim()" class="text-sm text-muted-foreground">
              Sin resultados. ¿Querés crear un cliente nuevo?
            </p>
          </template>

          <!-- Cliente seleccionado -->
          <div v-if="selectedClient" class="rounded-lg bg-muted p-3 text-sm">
            <p class="font-medium">
              Cliente seleccionado:
            </p>
            <p>{{ selectedClient.full_name }} · {{ selectedClient.rut ?? 'Sin RUT' }}</p>
          </div>

          <Separator />

          <Button variant="outline" class="w-full" @click="goToNewClient">
            + Crear cliente nuevo
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="emit('update:open', false)">
            Cancelar
          </Button>
          <Button :disabled="!selectedClient || saving" @click="handleSave">
            {{ saving ? 'Guardando...' : 'Guardar cotización' }}
          </Button>
        </DialogFooter>
      </template>

      <!-- Step: crear cliente -->
      <template v-else>
        <p class="text-sm text-muted-foreground mb-4">
          Completá los datos para registrar el nuevo cliente.
        </p>
        <ClientForm
          ref="newClientFormRef"
          :submitting="creatingClient"
          @submit="handleCreateClient"
          @cancel="step = 'search'"
        />
      </template>
    </DialogContent>
  </Dialog>
</template>
