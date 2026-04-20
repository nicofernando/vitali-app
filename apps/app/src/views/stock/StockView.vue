<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Download } from 'lucide-vue-next'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
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
import FilterCombobox from '@/components/ui/filter-combobox/FilterCombobox.vue'
import { useUnitsStore } from '@/stores/units'

const unitsStore = useUnitsStore()
const { allUnits, allUnitsDirty, loadingAll, error } = storeToRefs(unitsStore)

const PAGE_SIZE = 25

// Filtros
const filterProjectId = ref<string>('')
const filterTowerId = ref<string>('')
const filterTypologyId = ref<string>('')
const filterFloor = ref<string>('')
const filterSearch = ref<string>('')

// Ordenamiento
type SortKey = 'project' | 'tower' | 'floor' | 'unit_number' | 'typology' | 'surface' | 'price'
const sortKey = ref<SortKey | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')

// Paginación
const currentPage = ref(1)
const limit = ref(25)

onMounted(() => {
  if (allUnitsDirty.value || allUnits.value.length === 0)
    unitsStore.fetchAll()
})

// Reset de página al cambiar filtros, orden o límite
watch([filterProjectId, filterTowerId, filterTypologyId, filterFloor, filterSearch, sortKey, sortDir, limit], () => {
  currentPage.value = 1
})

// Si cambia el proyecto, resetear torre si ya no pertenece al nuevo proyecto
watch(filterProjectId, (newProjectId) => {
  if (!newProjectId) {
    filterTowerId.value = ''
    return
  }
  const towerBelongsToProject = allUnits.value.some(
    u => u.tower.id === filterTowerId.value && u.tower.project.id === newProjectId,
  )
  if (!towerBelongsToProject)
    filterTowerId.value = ''
})

// Opciones derivadas del inventario
const projectOptions = computed(() => {
  const seen = new Map<string, string>()
  for (const u of allUnits.value) {
    if (!seen.has(u.tower.project.id))
      seen.set(u.tower.project.id, u.tower.project.name)
  }
  return [...seen.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
})

// Opciones de torre: solo las que pertenecen al proyecto filtrado (o todas si no hay filtro)
const towerOptions = computed(() => {
  const seen = new Map<string, string>()
  for (const u of allUnits.value) {
    if (filterProjectId.value && u.tower.project.id !== filterProjectId.value)
      continue
    if (!seen.has(u.tower.id))
      seen.set(u.tower.id, u.tower.name)
  }
  return [...seen.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
})

const typologyOptions = computed(() => {
  const seen = new Map<string, string>()
  for (const u of allUnits.value) {
    if (u.typology && !seen.has(u.typology.id))
      seen.set(u.typology.id, u.typology.name)
  }
  return [...seen.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
})

const hasActiveFilters = computed(() =>
  !!filterProjectId.value || !!filterTowerId.value || !!filterTypologyId.value
  || !!filterFloor.value || !!filterSearch.value,
)

const filteredUnits = computed(() =>
  allUnits.value.filter((u) => {
    if (filterProjectId.value && u.tower.project.id !== filterProjectId.value)
      return false
    if (filterTowerId.value && u.tower.id !== filterTowerId.value)
      return false
    if (filterTypologyId.value && u.typology_id !== filterTypologyId.value)
      return false
    if (filterFloor.value !== '') {
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

const sortedUnits = computed(() => {
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
    if (sortKey.value === 'unit_number')
      return (av as string).localeCompare(bv as string, undefined, { numeric: true }) * (sortDir.value === 'asc' ? 1 : -1)
    if (av < bv) return sortDir.value === 'asc' ? -1 : 1
    if (av > bv) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedUnits.value.length / limit.value)))

const paginatedUnits = computed(() => {
  const start = (currentPage.value - 1) * limit.value
  return sortedUnits.value.slice(start, start + limit.value)
})

const pageRangeLabel = computed(() => {
  const total = sortedUnits.value.length
  if (total === 0) return '0 departamentos'
  const start = (currentPage.value - 1) * limit.value + 1
  const end = Math.min(currentPage.value * limit.value, total)
  return `${start}–${end} de ${total}`
})

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
  filterTowerId.value = ''
  filterTypologyId.value = ''
  filterFloor.value = ''
  filterSearch.value = ''
}

function formatPrice(amount: number, symbol = '$', decimalPlaces = 0) {
  return `${symbol} ${amount.toLocaleString('es-CL', { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })}`
}

function formatSurface(value: number | string) {
  return `${Number(value).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`
}

function exportToExcel() {
  const data = sortedUnits.value.map(unit => ({
    'Proyecto': unit.tower.project.name,
    'Torre': unit.tower.name,
    'Piso': unit.floor ?? '',
    'N° Depto': unit.unit_number,
    'Tipología': unit.typology?.name ?? '',
    'Superficie (m2)': unit.typology?.surface_m2 ? Number(unit.typology.surface_m2) : '',
    'Precio de lista': unit.list_price,
    'Moneda': unit.tower.project.currency.code,
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock')
  
  // Ajuste de ancho de columnas
  worksheet['!cols'] = [
    { wch: 25 }, // Proyecto
    { wch: 15 }, // Torre
    { wch: 8 },  // Piso
    { wch: 12 }, // N° Depto
    { wch: 20 }, // Tipología
    { wch: 15 }, // Superficie
    { wch: 20 }, // Precio
    { wch: 10 }, // Moneda
  ]

  XLSX.writeFile(workbook, `Stock_VitaliHogar_${new Date().toISOString().split('T')[0]}.xlsx`)
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5">
    <div class="flex items-start justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-2xl font-heading font-bold text-foreground">
          Stock
        </h1>
        <p class="text-sm text-muted-foreground mt-1">
          Inventario completo de departamentos
        </p>
      </div>

      <Button variant="outline" class="shrink-0" @click="exportToExcel">
        <Download class="mr-2 h-4 w-4" />
        Exportar a Excel
      </Button>
    </div>

    <!-- Filtros -->
    <div class="flex flex-wrap gap-3 items-end">
      <!-- Proyecto -->
      <div class="space-y-1.5 min-w-[180px]">
        <Label class="text-xs text-muted-foreground">Proyecto</Label>
        <FilterCombobox
          v-model="filterProjectId"
          :options="projectOptions"
          placeholder="Todos los proyectos"
          all-label="Todos los proyectos"
        />
      </div>

      <!-- Torre (dependiente de proyecto) -->
      <div class="space-y-1.5 min-w-[160px]">
        <Label class="text-xs text-muted-foreground">Torre</Label>
        <FilterCombobox
          v-model="filterTowerId"
          :options="towerOptions"
          :placeholder="filterProjectId ? 'Todas las torres' : 'Todas las torres'"
          all-label="Todas las torres"
          :disabled="towerOptions.length === 0"
        />
      </div>

      <!-- Tipología -->
      <div class="space-y-1.5 min-w-[160px]">
        <Label class="text-xs text-muted-foreground">Tipología</Label>
        <FilterCombobox
          v-model="filterTypologyId"
          :options="typologyOptions"
          placeholder="Todas las tipologías"
          all-label="Todas las tipologías"
        />
      </div>

      <!-- Piso -->
      <div class="space-y-1.5 w-24">
        <Label class="text-xs text-muted-foreground">Piso</Label>
        <Input v-model="filterFloor" type="number" placeholder="Todos" class="h-9" min="0" />
      </div>

      <!-- N° Depto -->
      <div class="space-y-1.5 min-w-[140px]">
        <Label class="text-xs text-muted-foreground">N° Depto</Label>
        <Input v-model="filterSearch" placeholder="Ej: 101" class="h-9" />
      </div>

      <Button
        v-if="hasActiveFilters"
        variant="ghost"
        size="sm"
        class="self-end"
        @click="clearFilters"
      >
        Limpiar
      </Button>
    </div>

    <!-- Error -->
    <p v-if="error" class="text-sm text-destructive">
      {{ error }}
    </p>

    <!-- Tabla -->
    <div class="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/60 hover:bg-muted/60 border-b-2">
            <TableHead class="font-semibold text-foreground">
              <button
                class="flex items-center gap-1.5 hover:text-primary transition-colors"
                :class="sortKey === 'project' ? 'text-primary' : ''"
                @click="toggleSort('project')"
              >
                Proyecto
                <component :is="sortIcon('project')" class="h-3.5 w-3.5 shrink-0" />
              </button>
            </TableHead>
            <TableHead class="font-semibold text-foreground">
              <button
                class="flex items-center gap-1.5 hover:text-primary transition-colors"
                :class="sortKey === 'tower' ? 'text-primary' : ''"
                @click="toggleSort('tower')"
              >
                Torre
                <component :is="sortIcon('tower')" class="h-3.5 w-3.5 shrink-0" />
              </button>
            </TableHead>
            <TableHead class="font-semibold text-foreground text-center">
              <button
                class="flex items-center gap-1.5 hover:text-primary transition-colors mx-auto"
                :class="sortKey === 'floor' ? 'text-primary' : ''"
                @click="toggleSort('floor')"
              >
                Piso
                <component :is="sortIcon('floor')" class="h-3.5 w-3.5 shrink-0" />
              </button>
            </TableHead>
            <TableHead class="font-semibold text-foreground">
              <button
                class="flex items-center gap-1.5 hover:text-primary transition-colors"
                :class="sortKey === 'unit_number' ? 'text-primary' : ''"
                @click="toggleSort('unit_number')"
              >
                N° Depto
                <component :is="sortIcon('unit_number')" class="h-3.5 w-3.5 shrink-0" />
              </button>
            </TableHead>
            <TableHead class="font-semibold text-foreground">
              <button
                class="flex items-center gap-1.5 hover:text-primary transition-colors"
                :class="sortKey === 'typology' ? 'text-primary' : ''"
                @click="toggleSort('typology')"
              >
                Tipología
                <component :is="sortIcon('typology')" class="h-3.5 w-3.5 shrink-0" />
              </button>
            </TableHead>
            <TableHead class="font-semibold text-foreground text-right">
              <button
                class="flex items-center gap-1.5 hover:text-primary transition-colors ml-auto"
                :class="sortKey === 'surface' ? 'text-primary' : ''"
                @click="toggleSort('surface')"
              >
                Superficie
                <component :is="sortIcon('surface')" class="h-3.5 w-3.5 shrink-0" />
              </button>
            </TableHead>
            <TableHead class="font-semibold text-foreground text-right">
              <button
                class="flex items-center gap-1.5 hover:text-primary transition-colors ml-auto"
                :class="sortKey === 'price' ? 'text-primary' : ''"
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
          <TableRow v-else-if="paginatedUnits.length === 0">
            <TableCell colspan="7" class="text-center text-muted-foreground py-12">
              No hay departamentos que coincidan con los filtros
            </TableCell>
          </TableRow>

          <!-- Datos -->
          <TableRow v-for="unit in paginatedUnits" :key="unit.id">
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
              {{ unit.typology?.surface_m2 ? formatSurface(unit.typology.surface_m2) : '—' }}
            </TableCell>
            <TableCell class="text-right font-medium">
              {{ formatPrice(unit.list_price, unit.tower.project.currency.symbol, unit.tower.project.currency.decimal_places) }}
              <span class="text-xs text-muted-foreground ml-1">{{ unit.tower.project.currency.code }}</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Paginación -->
    <div v-if="!loadingAll" class="flex items-center justify-between flex-wrap gap-4">
      <div class="flex items-center gap-4">
        <p class="text-sm text-muted-foreground">
          {{ pageRangeLabel }}
        </p>
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground">Filas por página:</span>
          <Select :model-value="String(limit)" @update:model-value="v => limit = Number(v)">
            <SelectTrigger class="h-8 w-[70px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="500">500</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div v-if="totalPages > 1" class="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <span class="text-sm px-2 tabular-nums">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <Button
          variant="outline"
          size="sm"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</template>
