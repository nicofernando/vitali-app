<script setup lang="ts">
import type { DocumentTemplate } from '@/types'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import DocumentTestSheet from '@/components/documents/DocumentTestSheet.vue'
import DocumentUploadSheet from '@/components/documents/DocumentUploadSheet.vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import DataTableColumnHeader from '@/components/ui/data-table/DataTableColumnHeader.vue'
import DataTablePagination from '@/components/ui/data-table/DataTablePagination.vue'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DATA_BLOCKS } from '@/lib/document-variables'
import { useDocumentTemplatesStore } from '@/stores/documentTemplates'

const store = useDocumentTemplatesStore()
const { templates, loading } = storeToRefs(store)

const showUpload = ref(false)
const testTarget = ref<DocumentTemplate | null>(null)
const pendingDelete = ref<DocumentTemplate | null>(null)

const searchQuery = ref('')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
const sortKey = ref<'name' | 'context_needs' | 'created_at'>('created_at')
const sortDir = ref<'asc' | 'desc'>('desc')
const currentPage = ref(1)
const limit = ref(25)

onMounted(() => store.fetchAll())

function labelFor(need: string): string {
  return DATA_BLOCKS.find(b => b.id === need)?.label ?? need
}

const filteredByStatus = computed(() => {
  if (statusFilter.value === 'active')
    return templates.value.filter(t => t.is_active)
  if (statusFilter.value === 'inactive')
    return templates.value.filter(t => !t.is_active)
  return templates.value
})

const filteredBySearch = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q)
    return filteredByStatus.value
  return filteredByStatus.value.filter(t =>
    t.name.toLowerCase().includes(q)
    || (t.description ?? '').toLowerCase().includes(q),
  )
})

const filtered = computed(() => {
  return [...filteredBySearch.value].sort((a, b) => {
    let av: string | number
    let bv: string | number
    if (sortKey.value === 'name') {
      av = a.name.toLowerCase()
      bv = b.name.toLowerCase()
    }
    else if (sortKey.value === 'context_needs') {
      av = a.context_needs.length
      bv = b.context_needs.length
    }
    else {
      av = a.created_at
      bv = b.created_at
    }
    if (av < bv)
      return sortDir.value === 'asc' ? -1 : 1
    if (av > bv)
      return sortDir.value === 'asc' ? 1 : -1
    return 0
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / limit.value)))

const paginated = computed(() => {
  const start = (currentPage.value - 1) * limit.value
  return filtered.value.slice(start, start + limit.value)
})

watch([searchQuery, statusFilter, sortKey, sortDir, limit], () => {
  currentPage.value = 1
})

function toggleSort(key: string) {
  const k = key as typeof sortKey.value
  if (sortKey.value === k) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  }
  else {
    sortKey.value = k
    sortDir.value = 'asc'
  }
}

async function handleToggle(id: string) {
  await store.toggleActive(id)
  if (store.error)
    toast.error(store.error)
}

async function handleDelete() {
  const item = pendingDelete.value
  if (!item)
    return
  try {
    await store.remove(item.id)
    if (store.error)
      toast.error(store.error)
    else
      toast.success(`"${item.name}" eliminado`)
  }
  catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Error al eliminar')
  }
  finally {
    pendingDelete.value = null
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-heading font-bold text-foreground">
          Documentos
        </h1>
        <p class="text-sm text-muted-foreground mt-1">
          Templates de documentos configurables con Carbone
        </p>
      </div>
      <Button @click="showUpload = true">
        + Nuevo documento
      </Button>
    </div>

    <!-- Filtros -->
    <div class="flex flex-wrap items-center gap-3">
      <Input
        v-model="searchQuery"
        placeholder="Buscar por nombre o descripción..."
        class="max-w-sm"
      />
      <Select v-model="statusFilter">
        <SelectTrigger class="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            Todos
          </SelectItem>
          <SelectItem value="active">
            Activos
          </SelectItem>
          <SelectItem value="inactive">
            Inactivos
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="space-y-2">
      <Skeleton v-for="i in 5" :key="i" class="h-10 w-full" />
    </div>

    <!-- Tabla -->
    <Table v-else>
      <TableHeader>
        <TableRow class="bg-muted/60 hover:bg-muted/60 border-b-2">
          <TableHead class="font-semibold text-foreground">
            <DataTableColumnHeader
              sort-key="name"
              :current-sort-key="sortKey"
              :current-sort-order="sortDir"
              label="Nombre"
              @sort="toggleSort"
            />
          </TableHead>
          <TableHead class="font-semibold text-foreground">
            Bloques de datos
          </TableHead>
          <TableHead class="font-semibold text-foreground">
            <DataTableColumnHeader
              sort-key="created_at"
              :current-sort-key="sortKey"
              :current-sort-order="sortDir"
              label="Creado"
              @sort="toggleSort"
            />
          </TableHead>
          <TableHead class="font-semibold text-foreground text-center w-24">
            Activo
          </TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="paginated.length === 0">
          <TableCell colspan="5" class="text-center text-muted-foreground py-8">
            {{ searchQuery || statusFilter !== 'all' ? 'Sin resultados para ese filtro' : 'No hay documentos registrados' }}
          </TableCell>
        </TableRow>
        <TableRow v-for="tpl in paginated" :key="tpl.id">
          <TableCell>
            <p class="font-medium text-sm">
              {{ tpl.name }}
            </p>
            <p v-if="tpl.description" class="text-xs text-muted-foreground mt-0.5">
              {{ tpl.description }}
            </p>
          </TableCell>
          <TableCell>
            <div class="flex flex-wrap gap-1">
              <Badge
                v-for="need in tpl.context_needs"
                :key="need"
                variant="secondary"
                class="text-[10px]"
              >
                {{ labelFor(need) }}
              </Badge>
              <span v-if="tpl.context_needs.length === 0" class="text-xs text-muted-foreground italic">
                Sin bloques
              </span>
            </div>
          </TableCell>
          <TableCell class="text-sm text-muted-foreground whitespace-nowrap">
            {{ new Date(tpl.created_at).toLocaleDateString('es-CL') }}
          </TableCell>
          <TableCell class="text-center">
            <Switch
              :checked="tpl.is_active"
              :title="tpl.is_active ? 'Desactivar' : 'Activar'"
              @update:checked="handleToggle(tpl.id)"
            />
          </TableCell>
          <TableCell class="text-right">
            <div class="flex items-center justify-end gap-2">
              <span :title="!tpl.is_active ? 'Activá el template para poder probarlo' : undefined">
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="!tpl.is_active"
                  @click="testTarget = tpl"
                >
                  Probar
                </Button>
              </span>
              <Button
                variant="destructive"
                size="sm"
                @click="pendingDelete = tpl"
              >
                Eliminar
              </Button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <DataTablePagination
      v-if="!loading"
      v-model:current-page="currentPage"
      v-model:page-size="limit"
      :total-items="filtered.length"
      :total-pages="totalPages"
      :page-size-options="[10, 25, 50]"
    />

    <!-- Sheet: subir nuevo template -->
    <DocumentUploadSheet
      :open="showUpload"
      @close="showUpload = false"
    />

    <!-- Sheet: probar template -->
    <DocumentTestSheet
      :template="testTarget"
      :open="!!testTarget"
      @close="testTarget = null"
    />

    <!-- Confirm delete -->
    <AlertDialog :open="!!pendingDelete">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
          <AlertDialogDescription>
            Vas a eliminar <strong>{{ pendingDelete?.name }}</strong>. El archivo .docx y los PDFs de prueba generados serán eliminados permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="pendingDelete = null">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="handleDelete"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
