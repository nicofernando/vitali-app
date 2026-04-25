<script setup lang="ts">
import type { DocumentTemplate } from '@/types'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import FilterCombobox from '@/components/ui/filter-combobox/FilterCombobox.vue'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { needsClient, needsQuote, needsUnit } from '@/lib/document-variables'
import { useClientsStore } from '@/stores/clients'
import { useDocumentTemplatesStore } from '@/stores/documentTemplates'
import { useProjectsStore } from '@/stores/projects'
import { useQuotesStore } from '@/stores/quotes'
import { useTowersStore } from '@/stores/towers'
import { useUnitsStore } from '@/stores/units'

const props = defineProps<{
  template: DocumentTemplate | null
  open: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const docStore = useDocumentTemplatesStore()
const quotesStore = useQuotesStore()
const clientsStore = useClientsStore()
const projectsStore = useProjectsStore()
const towersStore = useTowersStore()
const unitsStore = useUnitsStore()

const { quotes } = storeToRefs(quotesStore)
const { clients } = storeToRefs(clientsStore)
const { projects } = storeToRefs(projectsStore)
const { towers, loading: loadingTowers } = storeToRefs(towersStore)
const { units, loading: loadingUnits } = storeToRefs(unitsStore)

const quoteId = ref('')
const clientId = ref('')
const projectId = ref('')
const towerId = ref('')
const unitId = ref('')
const generating = ref(false)

const contextNeeds = computed(() => props.template?.context_needs ?? [])
const requiresQuote = computed(() => needsQuote(contextNeeds.value))
const requiresUnit = computed(() => needsUnit(contextNeeds.value))
const requiresClient = computed(() => needsClient(contextNeeds.value))
const hasNoContext = computed(() => !requiresQuote.value && !requiresUnit.value && !requiresClient.value)

const quoteOptions = computed(() =>
  quotes.value.map(q => ({
    id: q.id,
    name: `Depto ${q.unit_number} — ${q.client_name} (${q.project_name})`,
  })),
)

const clientOptions = computed(() =>
  clients.value.map(c => ({
    id: c.id,
    name: c.rut ? `${c.full_name} — ${c.rut}` : c.full_name,
  })),
)

const projectOptions = computed(() =>
  [...projects.value]
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map(p => ({ id: p.id, name: p.name })),
)

const isReady = computed(() => {
  if (requiresQuote.value && !quoteId.value)
    return false
  if (requiresUnit.value && !unitId.value)
    return false
  if (requiresClient.value && !clientId.value)
    return false
  return true
})

watch(() => props.open, (open) => {
  if (!open) {
    reset()
    return
  }
  if (requiresQuote.value)
    quotesStore.fetchAll()
  if (requiresUnit.value)
    projectsStore.fetchAll()
  if (requiresClient.value)
    clientsStore.fetchAll()
})

watch(projectId, (id) => {
  towerId.value = ''
  unitId.value = ''
  towersStore.clearTowers()
  if (id)
    towersStore.fetchByProject(id)
})

watch(towerId, (id) => {
  unitId.value = ''
  unitsStore.clearUnits()
  if (id)
    unitsStore.fetchByTower(id)
})

function reset() {
  quoteId.value = ''
  clientId.value = ''
  projectId.value = ''
  towerId.value = ''
  unitId.value = ''
}

async function generate() {
  if (!props.template)
    return
  generating.value = true
  const context: { quote_id?: string, unit_id?: string, client_id?: string } = {}
  if (requiresQuote.value && quoteId.value)
    context.quote_id = quoteId.value
  if (requiresUnit.value && unitId.value)
    context.unit_id = unitId.value
  if (requiresClient.value && clientId.value)
    context.client_id = clientId.value

  const url = await docStore.generateTest(props.template.id, context)
  generating.value = false

  if (url) {
    window.open(url, '_blank')
    toast.success('PDF generado — se abrió en una nueva pestaña')
  }
  else {
    toast.error(docStore.error ?? 'Error al generar el PDF')
  }
}

function handleOpenChange(open: boolean) {
  if (!open)
    emit('close')
}
</script>

<template>
  <Sheet :open="props.open" @update:open="handleOpenChange">
    <SheetContent class="sm:max-w-md overflow-y-auto">
      <SheetHeader>
        <SheetTitle>Probar: {{ template?.name }}</SheetTitle>
        <SheetDescription>
          Generá un PDF de prueba con datos reales para verificar el template.
        </SheetDescription>
      </SheetHeader>

      <div class="mt-6 space-y-5">
        <!-- Sin contexto necesario -->
        <p v-if="hasNoContext" class="text-sm text-muted-foreground">
          Este template no necesita datos externos para generarse.
        </p>

        <!-- Selector de cotización -->
        <div v-if="requiresQuote" class="space-y-1.5">
          <Label>Cotización *</Label>
          <FilterCombobox
            v-model="quoteId"
            :options="quoteOptions"
            placeholder="Seleccioná una cotización..."
            all-label="Sin selección"
          />
        </div>

        <!-- Cascade: Proyecto → Torre → Departamento -->
        <template v-if="requiresUnit">
          <div class="space-y-1.5">
            <Label>Proyecto *</Label>
            <Select v-model="projectId">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Seleccioná un proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="p in projectOptions" :key="p.id" :value="p.id">
                  {{ p.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1.5">
            <Label>Torre *</Label>
            <Select v-model="towerId" :disabled="!projectId || loadingTowers">
              <SelectTrigger class="w-full">
                <SelectValue
                  :placeholder="projectId ? (loadingTowers ? 'Cargando...' : 'Seleccioná una torre') : 'Primero seleccioná un proyecto'"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="t in towers" :key="t.id" :value="t.id">
                  {{ t.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1.5">
            <Label>Departamento *</Label>
            <Select v-model="unitId" :disabled="!towerId || loadingUnits">
              <SelectTrigger class="w-full">
                <SelectValue
                  :placeholder="towerId ? (loadingUnits ? 'Cargando...' : 'Seleccioná un depto') : 'Primero seleccioná una torre'"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="u in units" :key="u.id" :value="u.id">
                  Depto {{ u.unit_number }}{{ u.floor != null ? ` — Piso ${u.floor}` : '' }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </template>

        <!-- Selector de cliente (sin cotización) -->
        <div v-if="requiresClient" class="space-y-1.5">
          <Label>Cliente *</Label>
          <FilterCombobox
            v-model="clientId"
            :options="clientOptions"
            placeholder="Seleccioná un cliente..."
            all-label="Sin selección"
          />
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="handleOpenChange(false)">
            Cancelar
          </Button>
          <Button :disabled="!isReady || generating" @click="generate">
            {{ generating ? 'Generando...' : 'Generar PDF de prueba' }}
          </Button>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
