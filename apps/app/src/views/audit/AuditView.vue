<script setup lang="ts">
import type { AuditLookups } from '@/lib/audit-format'
import type { AuditFilters } from '@/stores/audit'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, shallowRef } from 'vue'
import AuditEntryDetail from '@/components/audit/AuditEntryDetail.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { actionLabel, entityLabel, formatPayloadSummary } from '@/lib/audit-format'
import { PAGE_SIZE, useAuditStore } from '@/stores/audit'
import { useRolesStore } from '@/stores/roles'
import { useUsersStore } from '@/stores/users'

const auditStore = useAuditStore()
const { entries, loading, error, total, page } = storeToRefs(auditStore)

const rolesStore = useRolesStore()
const usersStore = useUsersStore()

const filterEntity = ref('all')
const filterAction = ref('all')
const expandedIds = shallowRef(new Set<string>())

function toggleRow(id: string) {
  if (expandedIds.value.has(id))
    expandedIds.value.delete(id)
  else
    expandedIds.value.add(id)
  // Forzar reactividad en el Set (Vue no trackea mutaciones de Set directamente)
  expandedIds.value = new Set(expandedIds.value)
}

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

// Construye los tres Maps de lookup desde los stores cargados
const lookups = computed<AuditLookups>(() => {
  const rolesById = new Map<string, string>(
    rolesStore.roles.map(r => [r.id, r.name]),
  )
  const permissionsById = new Map<string, { module: string, action: string }>(
    rolesStore.allPermissions.map(p => [p.id, { module: p.module, action: p.action }]),
  )
  const usersById = new Map<string, string>(
    usersStore.users
      .filter(u => u.full_name !== null)
      .map(u => [u.id, u.full_name as string]),
  )
  return { rolesById, permissionsById, usersById }
})

function buildFilters(): AuditFilters {
  const f: AuditFilters = {}
  if (filterEntity.value !== 'all')
    f.entity_type = filterEntity.value
  if (filterAction.value !== 'all')
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

const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE))

onMounted(() => Promise.all([
  loadPage(0),
  rolesStore.fetchAll(),
  rolesStore.fetchPermissions(),
  usersStore.fetchAll(),
]))
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
          <SelectItem value="all">
            Todas las entidades
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
          <SelectItem value="all">
            Todas las acciones
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
          <SelectItem value="role_assigned">
            Asignó rol
          </SelectItem>
          <SelectItem value="role_removed">
            Removió rol
          </SelectItem>
          <SelectItem value="permission_added">
            Agregó permiso
          </SelectItem>
          <SelectItem value="permission_removed">
            Removió permiso
          </SelectItem>
          <SelectItem value="assignment_added">
            Asignó cliente
          </SelectItem>
          <SelectItem value="assignment_removed">
            Removió asignación
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div v-if="error" class="text-destructive text-sm">
      {{ error }}
    </div>

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead class="w-8" />
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
            <TableCell v-for="j in 6" :key="j">
              <Skeleton class="h-4 w-full" />
            </TableCell>
          </TableRow>
        </template>
        <template v-else>
          <template v-for="entry in entries" :key="entry.id">
            <TableRow
              class="cursor-pointer hover:bg-muted/50"
              @click="toggleRow(entry.id)"
            >
              <TableCell class="w-8 pr-0">
                <ChevronRight
                  class="size-4 text-muted-foreground transition-transform duration-200"
                  :class="{ 'rotate-90': expandedIds.has(entry.id) }"
                />
              </TableCell>
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
              <TableCell class="text-sm text-muted-foreground max-w-xs truncate">
                {{ formatPayloadSummary(entry, lookups) }}
              </TableCell>
            </TableRow>
            <TableRow v-if="expandedIds.has(entry.id)" class="bg-muted/20 hover:bg-muted/20">
              <TableCell :colspan="6" class="py-0">
                <AuditEntryDetail :entry="entry" :lookups="lookups" />
              </TableCell>
            </TableRow>
          </template>
          <TableRow v-if="entries.length === 0 && !loading">
            <TableCell colspan="6" class="text-center text-muted-foreground py-8">
              No hay entradas de auditoría
            </TableCell>
          </TableRow>
        </template>
      </TableBody>
    </Table>

    <!-- Paginación -->
    <div v-if="totalPages > 1" class="flex items-center justify-end gap-2">
      <span class="text-sm text-muted-foreground">
        Página {{ page + 1 }} de {{ totalPages }} ({{ total }} entradas)
      </span>
      <Button variant="outline" size="sm" :disabled="page === 0" @click="loadPage(page - 1)">
        <ChevronLeft class="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" :disabled="page + 1 >= totalPages" @click="loadPage(page + 1)">
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>
