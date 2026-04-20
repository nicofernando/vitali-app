<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useUnitsStore } from '@/stores/units'

const unitsStore = useUnitsStore()
const { allUnits, loadingAll, error } = storeToRefs(unitsStore)

// Centinela para "sin filtro" — string vacío no funciona bien en reka-ui Select
const ALL = '__all__'

// Filtros
const filterProjectId = ref<string>('')
const filterTypologyId = ref<string>('')
const filterFloor = ref<string>('')
const filterSearch = ref<string>('')

// Ordenamiento
type SortKey = 'project' | 'tower' | 'floor' | 'unit_number' | 'typology' | 'surface' | 'price'
const sortKey = ref<SortKey | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')

onMounted(() => unitsStore.fetchAll())

// Opciones únicas derivadas del inventario completo
const projectOptions = computed(() => {
  const seen = new Map<string, string>()
  for (const u of allUnits.value) {
    if (!seen.has(u.tower.project.id))
      seen.set(u.tower.project.id, u.tower.project.name)
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name }))
})

const typologyOptions = computed(() => {
  const seen = new Map<string, string>()
  for (const u of allUnits.value) {
    if (u.typology && !seen.has(u.typology.id))
      seen.set(u.typology.id, u.typology.name)
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name }))
})

const hasActiveFilters = computed(() =>
  !!filterProjectId.value || !!filterTypologyId.value || !!filterFloor.value || !!filterSearch.value,
)

const filteredUnits = computed(() =>
  allUnits.value.filter((u) => {
    if (filterProjectId.value && u.tower.project.id !== filterProjectId.value)
      return false
    if (filterTypologyId.value && u.typology_id !== filterTypologyId.value)
      return false
    if (filterFloor.value) {
      const f = Number(filterFloor.value)
      if (!Number.isNaN(f) && u.floor !== f)
        return false
    }
    if (filterSearch.value) {
      const q = filterSearch.value.toLowerCase()
      if (!u.unit_number.toLowerCase().includes(q))
        return false
    }
    return true
  }),
)

const displayedUnits = computed(() => {
  if (!sortKey.value)
    return filteredUnits.value

  return [...filteredUnits.value].sort((a, b) => {
    let av: string | number | null = null
    let bv: string | number | null = null

    switch (sortKey.value) {
      case 'project': av = a.tower.project.name; bv = b.tower.project.name; break
      case 'tower': av = a.tower.name; bv = b.tower.name; break
      case 'floor': av = a.floor; bv = b.floor; break
      case 'unit_number': av = a.unit_number; bv = b.unit_number; break
      case 'typology': av = a.typology?.name ?? null; bv = b.typology?.name ?? null; break
      case 'surface': av = a.typology?.surface_m2 ?? null; bv = b.typology?.surface_m2 ?? null; break
      case 'price': av = a.list_price; bv = b.list_price; break
    }

    if (av === null && bv === null) return 0
    if (av === null) return 1
    if (bv === null) return -1
    if (av < bv) return sortDir.value === 'asc' ? -1 : 1
    if (av > bv) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })
})

function setProjectFilter(v: unknown) {
  filterProjectId.value = (v as string) === ALL ? '' : (v as string)
}

function setTypologyFilter(v: unknown) {
  filterTypologyId.value = (v as string) === ALL ? '' : (v as string)
}

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  }
  else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function sortIcon(key: SortKey) {
  if (sortKey.value !== key)
    return ChevronsUpDown
  return sortDir.value === 'asc' ? ChevronUp : ChevronDown
}

function clearFilters() {
  filterProjectId.value = ''
  filterTypologyId.value = ''
  filterFloor.value = ''
  filterSearch.value = ''
}

function formatPrice(amount: number, symbol = '$') {
  return `${symbol} ${amount.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5">
    <div>
      <h1 class="text-2xl font-heading font-bold text-foreground">
        Stock
      </h1>
      <p class="text-sm text-muted-foreground mt-1">
        Inventario completo de departamentos
      </p>
    </div>

    <!-- Filtros -->
    <div class="flex flex-wrap gap-3 items-end">
      <div class="space-y-1.5 min-w-[160px]">
        <Label class="text-xs text-muted-foreground">Proyecto</Label>
        <Select
          :model-value="filterProjectId || ALL"
          @update:model-value="setProjectFilter"
        >
          <SelectTrigger class="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL">
              Todos los proyectos
            </SelectItem>
            <SelectItem v-for="p in projectOptions" :key="p.id" :value="p.id">
              {{ p.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-1.5 min-w-[160px]">
        <Label class="text-xs text-muted-foreground">Tipología</Label>
        <Select
          :model-value="filterTypologyId || ALL"
          @update:model-value="setTypologyFilter"
        >
          <SelectTrigger class="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL">
              Todas las tipologías
            </SelectItem>
            <SelectItem v-for="t in typologyOptions" :key="t.id" :value="t.id">
              {{ t.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-1.5 w-24">
        <Label class="text-xs text-muted-foreground">Piso</Label>
        <Input
          v-model="filterFloor"
          type="number"
          placeholder="Todos"
          class="h-9"
          min="1"
        />
      </div>

      <div class="space-y-1.5 min-w-[160px]">
        <Label class="text-xs text-muted-foreground">N° Depto</Label>
        <Input
          v-model="filterSearch"
          placeholder="Buscar..."
          class="h-9"
        />
      </div>

      <button
        v-if="hasActiveFilters"
        class="h-9 px-3 text-sm text-muted-foreground hover:text-foreground transition-colors self-end"
        @click="clearFilters"
      >
        Limpiar
      </button>
    </div>

    <!-- Contador -->
    <p v-if="!loadingAll" class="text-sm text-muted-foreground">
      {{ displayedUnits.length }} de {{ allUnits.length }} departamentos
    </p>

    <!-- Error -->
    <p v-if="error" class="text-sm text-destructive">
      {{ error }}
    </p>

    <!-- Tabla -->
    <div class="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button
                class="flex items-center gap-1 hover:text-foreground transition-colors"
                :class="sortKey === 'project' ? 'text-foreground font-semibold' : ''"
                @click="toggleSort('project')"
              >
                Proyecto
                <component :is="sortIcon('project')" class="h-3.5 w-3.5 shrink-0" />
              </button>
            </TableHead>
            <TableHead>
              <button
                class="flex items-center gap-1 hover:text-foreground transition-colors"
                :class="sortKey === 'tower' ? 'text-foreground font-semibold' : ''"
                @click="toggleSort('tower')"
              >
                Torre
                <component :is="sortIcon('tower')" class="h-3.5 w-3.5 shrink-0" />
              </button>
            </TableHead>
            <TableHead class="text-center">
              <button
                class="flex items-center gap-1 hover:text-foreground transition-colors mx-auto"
                :class="sortKey === 'floor' ? 'text-foreground font-semibold' : ''"
                @click="toggleSort('floor')"
              >
                Piso
                <component :is="sortIcon('floor')" class="h-3.5 w-3.5 shrink-0" />
              </button>
            </TableHead>
            <TableHead>
              <button
                class="flex items-center gap-1 hover:text-foreground transition-colors"
                :class="sortKey === 'unit_number' ? 'text-foreground font-semibold' : ''"
                @click="toggleSort('unit_number')"
              >
                N° Depto
                <component :is="sortIcon('unit_number')" class="h-3.5 w-3.5 shrink-0" />
              </button>
            </TableHead>
            <TableHead>
              <button
                class="flex items-center gap-1 hover:text-foreground transition-colors"
                :class="sortKey === 'typology' ? 'text-foreground font-semibold' : ''"
                @click="toggleSort('typology')"
              >
                Tipología
                <component :is="sortIcon('typology')" class="h-3.5 w-3.5 shrink-0" />
              </button>
            </TableHead>
            <TableHead class="text-right">
              <button
                class="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                :class="sortKey === 'surface' ? 'text-foreground font-semibold' : ''"
                @click="toggleSort('surface')"
              >
                Superficie
                <component :is="sortIcon('surface')" class="h-3.5 w-3.5 shrink-0" />
              </button>
            </TableHead>
            <TableHead class="text-right">
              <button
                class="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                :class="sortKey === 'price' ? 'text-foreground font-semibold' : ''"
                @click="toggleSort('price')"
              >
                Precio de lista
                <component :is="sortIcon('price')" class="h-3.5 w-3.5 shrink-0" />
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <!-- Skeleton -->
          <template v-if="loadingAll">
            <TableRow v-for="i in 8" :key="i">
              <TableCell v-for="j in 7" :key="j">
                <Skeleton class="h-4 w-full" />
              </TableCell>
            </TableRow>
          </template>

          <!-- Sin resultados -->
          <TableRow v-else-if="displayedUnits.length === 0">
            <TableCell colspan="7" class="text-center text-muted-foreground py-12">
              No hay departamentos que coincidan con los filtros
            </TableCell>
          </TableRow>

          <!-- Datos -->
          <TableRow v-for="unit in displayedUnits" :key="unit.id">
            <TableCell class="font-medium">
              {{ unit.tower.project.name }}
            </TableCell>
            <TableCell>{{ unit.tower.name }}</TableCell>
            <TableCell class="text-center">
              {{ unit.floor ?? '—' }}
            </TableCell>
            <TableCell>{{ unit.unit_number }}</TableCell>
            <TableCell>{{ unit.typology?.name ?? '—' }}</TableCell>
            <TableCell class="text-right">
              {{ unit.typology?.surface_m2 ? `${unit.typology.surface_m2} m²` : '—' }}
            </TableCell>
            <TableCell class="text-right font-medium">
              {{ formatPrice(unit.list_price, unit.tower.project.currency.symbol) }}
              <span class="text-xs text-muted-foreground ml-1">{{ unit.tower.project.currency.code }}</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
