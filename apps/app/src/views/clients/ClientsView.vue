<script setup lang="ts">
import type { Client } from '@/types'
import { storeToRefs } from 'pinia'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import ClientForm from '@/components/clients/ClientForm.vue'
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
import { Button } from '@/components/ui/button'
import DataTableColumnHeader from '@/components/ui/data-table/DataTableColumnHeader.vue'
import DataTablePagination from '@/components/ui/data-table/DataTablePagination.vue'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useClientsStore } from '@/stores/clients'

const clientsStore = useClientsStore()
const { clients, loading } = storeToRefs(clientsStore)

const showForm = ref(false)
const editingClient = ref<Client | null>(null)
const pendingDelete = ref<Client | null>(null)
const submitting = ref(false)
const searchQuery = ref('')
const sortKey = ref<'full_name' | 'rut' | 'email' | 'phone' | 'commune'>('full_name')
const sortDir = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const limit = ref(25)
const formRef = ref<InstanceType<typeof ClientForm> | null>(null)

onMounted(() => clientsStore.fetchAll())

function openNew() {
  editingClient.value = null
  showForm.value = true
  nextTick(() => formRef.value?.init(null))
}

function openEdit(client: Client) {
  editingClient.value = client
  showForm.value = true
  nextTick(() => formRef.value?.init(client))
}

function closeForm() {
  showForm.value = false
  editingClient.value = null
}

async function handleSubmit(values: Parameters<typeof clientsStore.create>[0]) {
  submitting.value = true
  try {
    if (editingClient.value) {
      await clientsStore.update(editingClient.value.id, values)
      toast.success('Cliente actualizado')
    }
    else {
      await clientsStore.create(values)
      toast.success('Cliente creado')
    }
    closeForm()
  }
  catch {
    toast.error('Error al guardar el cliente')
  }
  finally {
    submitting.value = false
  }
}

async function handleDelete() {
  if (!pendingDelete.value)
    return
  try {
    await clientsStore.remove(pendingDelete.value.id)
    toast.success('Cliente eliminado')
  }
  catch {
    toast.error('Error al eliminar el cliente')
  }
  finally {
    pendingDelete.value = null
  }
}

const filteredClients = computed(() => {
  const q = searchQuery.value.toLowerCase()
  if (!q)
    return clients.value
  return clients.value.filter(c =>
    c.full_name.toLowerCase().includes(q)
    || (c.rut ?? '').toLowerCase().includes(q)
    || (c.email ?? '').toLowerCase().includes(q)
    || (c.phone ?? '').toLowerCase().includes(q)
    || (c.commune ?? '').toLowerCase().includes(q),
  )
})

const sortedClients = computed(() => {
  return [...filteredClients.value].sort((a, b) => {
    const av = a[sortKey.value] || ''
    const bv = b[sortKey.value] || ''
    if (av < bv)
      return sortDir.value === 'asc' ? -1 : 1
    if (av > bv)
      return sortDir.value === 'asc' ? 1 : -1
    return 0
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedClients.value.length / limit.value)))

const paginatedClients = computed(() => {
  const start = (currentPage.value - 1) * limit.value
  return sortedClients.value.slice(start, start + limit.value)
})

watch([searchQuery, sortKey, sortDir, limit], () => {
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
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-heading font-bold text-foreground">
          Clientes
        </h1>
        <p class="text-sm text-muted-foreground mt-1">
          Gestioná el registro de clientes
        </p>
      </div>
      <Button @click="openNew">
        Nuevo cliente
      </Button>
    </div>

    <Input
      v-model="searchQuery"
      placeholder="Buscar por nombre, RUT, email, teléfono o comuna..."
      class="max-w-sm"
    />

    <!-- Skeleton -->
    <div v-if="loading" class="space-y-2">
      <Skeleton v-for="i in 5" :key="i" class="h-10 w-full" />
    </div>

    <!-- Tabla -->
    <Table v-else>
      <TableHeader>
        <TableRow class="bg-muted/60 hover:bg-muted/60 border-b-2">
          <TableHead class="font-semibold text-foreground">
            <DataTableColumnHeader sort-key="full_name" :current-sort-key="sortKey" :current-sort-order="sortDir" label="Nombre" @sort="toggleSort" />
          </TableHead>
          <TableHead class="font-semibold text-foreground">
            <DataTableColumnHeader sort-key="rut" :current-sort-key="sortKey" :current-sort-order="sortDir" label="RUT" @sort="toggleSort" />
          </TableHead>
          <TableHead class="font-semibold text-foreground">
            <DataTableColumnHeader sort-key="email" :current-sort-key="sortKey" :current-sort-order="sortDir" label="Email" @sort="toggleSort" />
          </TableHead>
          <TableHead class="font-semibold text-foreground">
            <DataTableColumnHeader sort-key="phone" :current-sort-key="sortKey" :current-sort-order="sortDir" label="Teléfono" @sort="toggleSort" />
          </TableHead>
          <TableHead class="font-semibold text-foreground">
            <DataTableColumnHeader sort-key="commune" :current-sort-key="sortKey" :current-sort-order="sortDir" label="Comuna" @sort="toggleSort" />
          </TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="paginatedClients.length === 0">
          <TableCell colspan="6" class="text-center text-muted-foreground py-8">
            {{ searchQuery ? 'Sin resultados para esa búsqueda' : 'No hay clientes registrados' }}
          </TableCell>
        </TableRow>
        <TableRow v-for="client in paginatedClients" :key="client.id">
          <TableCell class="font-medium">
            {{ client.full_name }}
          </TableCell>
          <TableCell class="text-muted-foreground">
            {{ client.rut ?? '—' }}
          </TableCell>
          <TableCell class="text-muted-foreground">
            {{ client.email ?? '—' }}
          </TableCell>
          <TableCell class="text-muted-foreground">
            {{ client.phone ?? '—' }}
          </TableCell>
          <TableCell class="text-muted-foreground">
            {{ client.commune ?? '—' }}
          </TableCell>
          <TableCell class="text-right">
            <div class="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" @click="openEdit(client)">
                Editar
              </Button>
              <Button variant="destructive" size="sm" @click="pendingDelete = client">
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
      :total-items="sortedClients.length"
      :total-pages="totalPages"
      :page-size-options="[10, 25, 50, 100]"
    />

    <!-- Sheet de formulario -->
    <Sheet :open="showForm" @update:open="v => !v && closeForm()">
      <SheetContent class="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{{ editingClient ? 'Editar cliente' : 'Nuevo cliente' }}</SheetTitle>
          <SheetDescription>
            {{ editingClient ? 'Modificá los datos del cliente' : 'Completá los datos para registrar un nuevo cliente' }}
          </SheetDescription>
        </SheetHeader>
        <div class="mt-6">
          <ClientForm
            ref="formRef"
            :client="editingClient"
            :submitting="submitting"
            @submit="handleSubmit"
            @cancel="closeForm"
          />
        </div>
      </SheetContent>
    </Sheet>

    <!-- Confirm delete -->
    <AlertDialog :open="!!pendingDelete">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
          <AlertDialogDescription>
            Vas a eliminar a <strong>{{ pendingDelete?.full_name }}</strong>. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleDelete">
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
