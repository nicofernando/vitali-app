<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
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

// Filtros
const filterProjectId = ref<string>('')
const filterTypologyId = ref<string>('')
const filterFloor = ref<string>('')
const filterSearch = ref<string>('')

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

const filteredUnits = computed(() => {
  return allUnits.value.filter((u) => {
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
  })
})

function formatPrice(amount: number, symbol = '$') {
  return `${symbol} ${amount.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function clearFilters() {
  filterProjectId.value = ''
  filterTypologyId.value = ''
  filterFloor.value = ''
  filterSearch.value = ''
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-6">
    <div>
      <h1 class="text-2xl font-heading font-bold text-foreground">
        Stock
      </h1>
      <p class="text-sm text-muted-foreground mt-1">
        Inventario completo de departamentos
      </p>
    </div>

    <!-- Filtros -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="space-y-1.5">
        <Label class="text-xs">Proyecto</Label>
        <Select :model-value="filterProjectId" @update:model-value="v => filterProjectId = v as string">
          <SelectTrigger class="h-9">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">
              Todos
            </SelectItem>
            <SelectItem v-for="p in projectOptions" :key="p.id" :value="p.id">
              {{ p.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-1.5">
        <Label class="text-xs">Tipología</Label>
        <Select :model-value="filterTypologyId" @update:model-value="v => filterTypologyId = v as string">
          <SelectTrigger class="h-9">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">
              Todas
            </SelectItem>
            <SelectItem v-for="t in typologyOptions" :key="t.id" :value="t.id">
              {{ t.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-1.5">
        <Label class="text-xs">Piso</Label>
        <Input
          v-model="filterFloor"
          type="number"
          placeholder="Todos"
          class="h-9"
          min="1"
        />
      </div>

      <div class="space-y-1.5">
        <Label class="text-xs">N° Depto</Label>
        <Input
          v-model="filterSearch"
          placeholder="Buscar..."
          class="h-9"
        />
      </div>
    </div>

    <!-- Contador + limpiar filtros -->
    <div class="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        <template v-if="!loadingAll">
          {{ filteredUnits.length }} de {{ allUnits.length }} departamentos
        </template>
      </span>
      <button
        v-if="filterProjectId || filterTypologyId || filterFloor || filterSearch"
        class="text-primary underline-offset-4 hover:underline"
        @click="clearFilters"
      >
        Limpiar filtros
      </button>
    </div>

    <!-- Error -->
    <p v-if="error" class="text-sm text-destructive">
      {{ error }}
    </p>

    <!-- Tabla -->
    <div class="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Proyecto</TableHead>
            <TableHead>Torre</TableHead>
            <TableHead class="text-center">
              Piso
            </TableHead>
            <TableHead>N° Depto</TableHead>
            <TableHead>Tipología</TableHead>
            <TableHead class="text-right">
              Superficie
            </TableHead>
            <TableHead class="text-right">
              Precio de lista
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
          <TableRow v-else-if="filteredUnits.length === 0">
            <TableCell colspan="7" class="text-center text-muted-foreground py-12">
              No hay departamentos que coincidan con los filtros
            </TableCell>
          </TableRow>

          <!-- Datos -->
          <TableRow v-for="unit in filteredUnits" :key="unit.id">
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
