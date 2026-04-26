<script setup lang="ts">
import type { AuditFilters } from '@/stores/audit'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { actionLabel, entityLabel, formatChangedFields } from '@/lib/audit-format'
import { useAuditStore } from '@/stores/audit'

const auditStore = useAuditStore()
const { entries, loading, error, total, page } = storeToRefs(auditStore)

const PAGE_SIZE = 50
const filterEntity = ref('')
const filterActor = ref('')
const filterAction = ref('')
const selectedEntry = ref<(typeof entries.value)[0] | null>(null)

const ENTITY_OPTIONS = [
  { value: 'clients', label: 'Clientes' },
  { value: 'quotes', label: 'Cotizaciones' },
  { value: 'users', label: 'Usuarios' },
  { value: 'roles', label: 'Roles' },
  { value: 'projects', label: 'Proyectos' },
  { value: 'towers', label: 'Torres' },
  { value: 'units', label: 'Unidades' },
  { value: 'document_templates', label: 'Plantillas' },
]

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  role_assigned: 'bg-purple-100 text-purple-700',
  role_removed: 'bg-orange-100 text-orange-700',
  permission_added: 'bg-teal-100 text-teal-700',
  permission_removed: 'bg-yellow-100 text-yellow-700',
  assignment_added: 'bg-indigo-100 text-indigo-700',
  assignment_removed: 'bg-pink-100 text-pink-700',
}

function getActionColor(action: string) {
  return ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-700'
}

function buildFilters(): AuditFilters {
  const f: AuditFilters = {}
  if (filterEntity.value)
    f.entity_type = filterEntity.value
  if (filterActor.value)
    f.actor_id = filterActor.value
  if (filterAction.value)
    f.action = filterAction.value
  return f
}

async function loadPage(p: number) {
  await auditStore.fetchAll(buildFilters(), p)
}

async function applyFilters() {
  await loadPage(0)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
}

const totalPages = () => Math.ceil(total.value / PAGE_SIZE)

onMounted(() => loadPage(0))
</script>

<template>
  <div class="p-6 space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-[#002B5B]">
        Auditoría
      </h1>
      <p class="text-muted-foreground text-sm">
        Historial de cambios del sistema
      </p>
    </div>

    <!-- Filtros -->
    <div class="flex flex-wrap gap-3">
      <Select v-model="filterEntity" @update:model-value="applyFilters">
        <SelectTrigger class="w-44">
          <SelectValue placeholder="Entidad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">
            Todas
          </SelectItem>
          <SelectItem v-for="opt in ENTITY_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="filterAction" @update:model-value="applyFilters">
        <SelectTrigger class="w-44">
          <SelectValue placeholder="Acción" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">
            Todas
          </SelectItem>
          <SelectItem value="create">
            Creó
          </SelectItem>
          <SelectItem value="update">
            Modificó
          </SelectItem>
          <SelectItem value="delete">
            Eliminó
          </SelectItem>
        </SelectContent>
      </Select>

      <Input
        v-model="filterActor"
        placeholder="UUID del actor"
        class="w-64"
        @keydown.enter="applyFilters"
      />

      <Button variant="outline" @click="applyFilters">
        Filtrar
      </Button>
    </div>

    <div v-if="error" class="text-destructive text-sm">
      {{ error }}
    </div>

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Acción</TableHead>
          <TableHead>Entidad</TableHead>
          <TableHead>Cambios</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-if="loading">
          <TableRow v-for="i in 8" :key="i">
            <TableCell v-for="j in 5" :key="j">
              <Skeleton class="h-4 w-full" />
            </TableCell>
          </TableRow>
        </template>
        <template v-else>
          <TableRow
            v-for="entry in entries"
            :key="entry.id"
            class="cursor-pointer hover:bg-muted/50"
            @click="selectedEntry = selectedEntry?.id === entry.id ? null : entry"
          >
            <TableCell class="text-sm text-muted-foreground whitespace-nowrap">
              {{ formatDate(entry.created_at) }}
            </TableCell>
            <TableCell class="text-sm">
              {{ entry.actor_name ?? entry.actor_id?.slice(0, 8) ?? 'Sistema' }}
            </TableCell>
            <TableCell>
              <Badge class="text-xs" :class="[getActionColor(entry.action)]" variant="outline">
                {{ actionLabel(entry.action) }}
              </Badge>
            </TableCell>
            <TableCell class="text-sm font-medium">
              {{ entityLabel(entry.entity_type) }}
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              <span v-if="entry.payload.changed_fields?.length">
                {{ entry.payload.changed_fields.join(', ') }}
              </span>
            </TableCell>
          </TableRow>
          <!-- Detalle expandido -->
          <TableRow v-if="selectedEntry" class="bg-muted/30">
            <TableCell colspan="5" class="py-4">
              <p class="text-xs font-mono text-muted-foreground mb-2">
                Entity ID: {{ selectedEntry.entity_id }}
              </p>
              <div v-if="selectedEntry.payload.changed_fields?.length" class="space-y-1">
                <p
                  v-for="line in formatChangedFields(selectedEntry.payload)"
                  :key="line"
                  class="text-xs font-mono"
                >
                  {{ line }}
                </p>
              </div>
              <pre
                v-else
                class="text-xs overflow-auto max-h-40 bg-muted rounded p-2"
              >{{ JSON.stringify(selectedEntry.payload, null, 2) }}</pre>
            </TableCell>
          </TableRow>
          <TableRow v-if="entries.length === 0 && !loading">
            <TableCell colspan="5" class="text-center text-muted-foreground py-8">
              No hay entradas de auditoría
            </TableCell>
          </TableRow>
        </template>
      </TableBody>
    </Table>

    <!-- Paginación -->
    <div v-if="totalPages() > 1" class="flex items-center justify-end gap-2">
      <span class="text-sm text-muted-foreground">
        Página {{ page + 1 }} de {{ totalPages() }} ({{ total }} entradas)
      </span>
      <Button variant="outline" size="sm" :disabled="page === 0" @click="loadPage(page - 1)">
        <ChevronLeft class="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" :disabled="page + 1 >= totalPages()" @click="loadPage(page + 1)">
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>
