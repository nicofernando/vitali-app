<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import SaveQuoteDialog from '@/components/quotes/SaveQuoteDialog.vue'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectsStore } from '@/stores/projects'
import { useSimulatorStore } from '@/stores/simulator'
import { useTowersStore } from '@/stores/towers'
import { useUnitsStore } from '@/stores/units'

const simulatorStore = useSimulatorStore()
const projectsStore = useProjectsStore()
const towersStore = useTowersStore()
const unitsStore = useUnitsStore()

const { result, loading: calculating, error: calcError } = storeToRefs(simulatorStore)
const { projects, loading: loadingProjects } = storeToRefs(projectsStore)
const { towers, loading: loadingTowers } = storeToRefs(towersStore)
const { units, loading: loadingUnits } = storeToRefs(unitsStore)

const selectedProjectId = ref<string>('')
const selectedTowerId = ref<string>('')
const selectedUnitId = ref<string>('')
const piePercentage = ref<number>(20)
const termYears = ref<number>(20)
const creditType = ref<'french' | 'smart' | 'both'>('both')
const smartCuotasPercentage = ref<number>(30)

const selectedProject = computed(() => projects.value.find(p => p.id === selectedProjectId.value) ?? null)
const selectedTower = computed(() => towers.value.find(t => t.id === selectedTowerId.value) ?? null)
const selectedUnit = computed(() => units.value.find(u => u.id === selectedUnitId.value) ?? null)

const minPie = computed(() => selectedTower.value?.min_pie_percentage ?? 0)
const maxTerm = computed(() => selectedTower.value?.max_financing_years ?? 30)
const pieError = computed(() => piePercentage.value < minPie.value ? `El PIE mínimo es ${minPie.value}%` : null)

const showSmartParams = computed(() => creditType.value === 'smart' || creditType.value === 'both')

const balloonError = computed(() => {
  if (!showSmartParams.value)
    return null
  const balloon = 100 - piePercentage.value - smartCuotasPercentage.value
  if (balloon <= 0)
    return `La suma de PIE (${piePercentage.value}%) + cuotas (${smartCuotasPercentage.value}%) no puede superar 99%`
  return null
})

const canCalculate = computed(() =>
  selectedUnitId.value
  && !pieError.value
  && !balloonError.value
  && termYears.value > 0,
)

onMounted(() => projectsStore.fetchAll())

watch(selectedProject, (project) => {
  if (!project)
    return
  if (project.french_credit_enabled && project.smart_credit_enabled)
    creditType.value = 'both'
  else if (project.french_credit_enabled)
    creditType.value = 'french'
  else
    creditType.value = 'smart'
})

function onProjectChange(value: unknown) {
  const projectId = value as string
  selectedProjectId.value = projectId
  selectedTowerId.value = ''
  selectedUnitId.value = ''
  unitsStore.units = []
  simulatorStore.reset()
  if (projectId)
    towersStore.fetchByProject(projectId)
}

function onTowerChange(value: unknown) {
  const towerId = value as string
  selectedTowerId.value = towerId
  selectedUnitId.value = ''
  simulatorStore.reset()

  if (towerId) {
    unitsStore.fetchByTower(towerId)
    const tower = towers.value.find(t => t.id === towerId)
    if (tower) {
      piePercentage.value = tower.min_pie_percentage
      termYears.value = tower.max_financing_years
    }
  }
}

function onUnitChange(value: unknown) {
  selectedUnitId.value = value as string
  simulatorStore.reset()
}

function handleReset() {
  selectedProjectId.value = ''
  selectedTowerId.value = ''
  selectedUnitId.value = ''
  towersStore.towers = []
  unitsStore.units = []
  simulatorStore.reset()
}

async function handleCalculate() {
  if (!canCalculate.value)
    return

  await simulatorStore.calculate({
    unit_id: selectedUnitId.value,
    pie_percentage: piePercentage.value,
    term_years: termYears.value,
    credit_type: creditType.value,
    smart_cuotas_percentage: showSmartParams.value ? smartCuotasPercentage.value : undefined,
  })
}

const saveDialogOpen = ref(false)

function formatCurrency(amount: number, symbol = '$') {
  return `${symbol} ${amount.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-heading font-bold text-foreground">
        Cotizador
      </h1>
      <p class="text-sm text-muted-foreground mt-1">
        Simulá opciones de financiamiento para un departamento
      </p>
    </div>

    <!-- Selección de proyecto → torre → depto -->
    <Card>
      <CardHeader>
        <CardTitle class="text-base">
          Selección de departamento
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Proyecto -->
          <div class="space-y-2">
            <Label>Proyecto</Label>
            <Select :model-value="selectedProjectId" :disabled="loadingProjects" @update:model-value="onProjectChange">
              <SelectTrigger>
                <SelectValue :placeholder="loadingProjects ? 'Cargando...' : 'Seleccioná el proyecto'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="p in projects" :key="p.id" :value="p.id">
                  {{ p.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Torre -->
          <div class="space-y-2">
            <Label>Torre</Label>
            <Select
              :model-value="selectedTowerId"
              :disabled="!selectedProjectId || loadingTowers"
              @update:model-value="onTowerChange"
            >
              <SelectTrigger>
                <SelectValue :placeholder="!selectedProjectId ? 'Primero seleccioná proyecto' : loadingTowers ? 'Cargando...' : 'Seleccioná la torre'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="t in towers" :key="t.id" :value="t.id">
                  {{ t.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Departamento -->
          <div class="space-y-2">
            <Label>Departamento</Label>
            <Select
              :model-value="selectedUnitId"
              :disabled="!selectedTowerId || loadingUnits"
              @update:model-value="onUnitChange"
            >
              <SelectTrigger>
                <SelectValue :placeholder="!selectedTowerId ? 'Primero seleccioná torre' : loadingUnits ? 'Cargando...' : 'Seleccioná el depto'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="u in units" :key="u.id" :value="u.id">
                  Dpto {{ u.unit_number }}{{ u.floor ? ` — Piso ${u.floor}` : '' }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- Info del depto seleccionado -->
        <template v-if="selectedUnit">
          <Separator />
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p class="text-muted-foreground">
                Tipología
              </p>
              <p class="font-medium">
                {{ selectedUnit.typology?.name ?? '—' }}
              </p>
            </div>
            <div>
              <p class="text-muted-foreground">
                Superficie
              </p>
              <p class="font-medium">
                {{ selectedUnit.typology?.surface_m2 ?? '—' }} m²
              </p>
            </div>
            <div>
              <p class="text-muted-foreground">
                Piso
              </p>
              <p class="font-medium">
                {{ selectedUnit.floor ?? '—' }}
              </p>
            </div>
            <div>
              <p class="text-muted-foreground">
                Entrega
              </p>
              <p class="font-medium">
                {{ selectedTower?.delivery_date ?? '—' }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div>
              <p class="text-muted-foreground text-sm">
                Precio de lista
              </p>
              <p class="text-xl font-semibold font-heading">
                {{ formatCurrency(selectedUnit.list_price, selectedProject?.currency?.symbol) }}
                <span class="text-sm font-normal text-muted-foreground ml-1">{{ selectedProject?.currency?.code }}</span>
              </p>
            </div>
          </div>
        </template>
      </CardContent>
    </Card>

    <!-- Parámetros de financiamiento -->
    <Card v-if="selectedUnit">
      <CardHeader>
        <CardTitle class="text-base">
          Parámetros de financiamiento
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="space-y-2">
            <Label>PIE (%) <span class="text-muted-foreground text-xs">mín. {{ minPie }}%</span></Label>
            <Input
              v-model.number="piePercentage"
              type="number"
              :min="minPie"
              max="99"
              step="0.5"
              :class="pieError ? 'border-destructive' : ''"
            />
            <p v-if="pieError" class="text-xs text-destructive">
              {{ pieError }}
            </p>
            <p v-else-if="selectedUnit" class="text-xs text-muted-foreground">
              = {{ formatCurrency(selectedUnit.list_price * piePercentage / 100, selectedProject?.currency?.symbol) }}
            </p>
          </div>

          <div class="space-y-2">
            <Label>Plazo (años) <span class="text-muted-foreground text-xs">máx. {{ maxTerm }}</span></Label>
            <Input
              v-model.number="termYears"
              type="number"
              min="1"
              :max="maxTerm"
            />
          </div>

          <div class="space-y-2">
            <Label>Tipo de crédito</Label>
            <Select v-model="creditType">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-if="selectedProject?.french_credit_enabled" value="french">
                  Crédito francés
                </SelectItem>
                <SelectItem v-if="selectedProject?.smart_credit_enabled" value="smart">
                  Crédito inteligente
                </SelectItem>
                <SelectItem
                  v-if="selectedProject?.french_credit_enabled && selectedProject?.smart_credit_enabled"
                  value="both"
                >
                  Ambos
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- Parámetros crédito inteligente -->
        <template v-if="showSmartParams">
          <Separator />
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="space-y-2">
              <Label>% a pagar en cuotas</Label>
              <Input
                v-model.number="smartCuotasPercentage"
                type="number"
                min="1"
                :max="Math.max(1, 99 - piePercentage)"
                step="1"
                :class="balloonError ? 'border-destructive' : ''"
              />
              <p v-if="balloonError" class="text-xs text-destructive">
                {{ balloonError }}
              </p>
              <p v-else class="text-xs text-muted-foreground">
                Balloon = {{ 100 - piePercentage - smartCuotasPercentage }}%
                ({{ formatCurrency(selectedUnit.list_price * (100 - piePercentage - smartCuotasPercentage) / 100, selectedProject?.currency?.symbol) }})
              </p>
            </div>
          </div>
        </template>

        <!-- Monto a financiar -->
        <div class="rounded-lg bg-muted/50 p-3 text-sm">
          <span class="text-muted-foreground">Monto a financiar: </span>
          <span class="font-semibold">
            {{ formatCurrency(selectedUnit.list_price * (1 - piePercentage / 100), selectedProject?.currency?.symbol) }}
            {{ selectedProject?.currency?.code }}
          </span>
        </div>

        <Button
          class="w-full"
          :disabled="!canCalculate || calculating"
          @click="handleCalculate"
        >
          {{ calculating ? 'Calculando...' : 'Calcular financiamiento' }}
        </Button>

        <p v-if="calcError" class="text-sm text-destructive text-center">
          {{ calcError }}
        </p>
      </CardContent>
    </Card>

    <!-- Acciones post-resultado -->
    <div v-if="result" class="flex items-center justify-between gap-4">
      <Button variant="outline" @click="handleReset">
        Nueva simulación
      </Button>
      <Button @click="saveDialogOpen = true">
        Guardar cotización
      </Button>
    </div>

    <SaveQuoteDialog
      v-model:open="saveDialogOpen"
      :result="result"
      :smart-cuotas-percentage="showSmartParams ? smartCuotasPercentage : undefined"
      @saved="handleReset"
    />

    <!-- Skeleton mientras calcula -->
    <template v-if="calculating">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card v-for="i in 2" :key="i">
          <CardContent class="p-6 space-y-3">
            <Skeleton class="h-5 w-1/3" />
            <Skeleton class="h-10 w-2/3" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    </template>

    <!-- Resultados -->
    <template v-else-if="result">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Crédito Francés -->
        <Card v-if="result.french">
          <CardHeader>
            <CardTitle>Crédito Francés</CardTitle>
            <CardDescription>Cuotas iguales durante todo el plazo</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div>
              <p class="text-sm text-muted-foreground">
                Cuota mensual
              </p>
              <p class="text-3xl font-bold font-heading text-primary">
                {{ formatCurrency(result.french.monthly_payment, result.project.currency.symbol) }}
              </p>
              <p class="text-xs text-muted-foreground mt-1">
                {{ result.project.currency.code }}
              </p>
            </div>
            <Separator />
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p class="text-muted-foreground">
                  Plazo
                </p>
                <p class="font-medium">
                  {{ termYears }} años ({{ result.french.term_months }} cuotas)
                </p>
              </div>
              <div>
                <p class="text-muted-foreground">
                  Tasa mensual
                </p>
                <p class="font-medium">
                  {{ (result.french.monthly_rate * 100).toFixed(4) }}%
                </p>
              </div>
              <div>
                <p class="text-muted-foreground">
                  Total pagado
                </p>
                <p class="font-medium">
                  {{ formatCurrency(result.french.total_paid, result.project.currency.symbol) }}
                </p>
              </div>
              <div>
                <p class="text-muted-foreground">
                  Intereses totales
                </p>
                <p class="font-medium">
                  {{ formatCurrency(result.french.total_paid - result.financing_amount, result.project.currency.symbol) }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Crédito Inteligente -->
        <Card v-if="result.smart">
          <CardHeader>
            <CardTitle>Crédito Inteligente</CardTitle>
            <CardDescription>Cuotas bajas + pago balloon al vencimiento</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <p class="text-sm text-muted-foreground">
                  Cuotas (meses 1–{{ result.smart.term_months - 1 }})
                </p>
                <p class="text-2xl font-bold font-heading text-primary">
                  {{ formatCurrency(result.smart.cuotas_payment, result.project.currency.symbol) }}
                </p>
              </div>
              <div>
                <p class="text-sm text-muted-foreground">
                  Cuota final (mes {{ result.smart.term_months }})
                </p>
                <p class="text-2xl font-bold font-heading">
                  {{ formatCurrency(result.smart.balloon_payment, result.project.currency.symbol) }}
                </p>
              </div>
            </div>
            <Separator />
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p class="text-muted-foreground">
                  % en cuotas
                </p>
                <p class="font-medium">
                  {{ result.smart.cuotas_percentage }}%
                </p>
              </div>
              <div>
                <p class="text-muted-foreground">
                  % balloon
                </p>
                <p class="font-medium">
                  {{ result.smart.balloon_percentage }}%
                </p>
              </div>
              <div>
                <p class="text-muted-foreground">
                  Total pagado
                </p>
                <p class="font-medium">
                  {{ formatCurrency(result.smart.total_paid, result.project.currency.symbol) }}
                </p>
              </div>
              <div>
                <p class="text-muted-foreground">
                  Plazo
                </p>
                <p class="font-medium">
                  {{ termYears }} años
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </template>
  </div>
</template>
