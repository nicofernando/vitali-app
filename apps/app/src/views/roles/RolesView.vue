<script setup lang="ts">
import type { RoleWithPermissions } from '@/types'
import { Plus, Shield, ShieldCheck, Trash2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import RoleForm from '@/components/roles/RoleForm.vue'
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
import { usePermissionsStore } from '@/stores/permissions'
import { useRolesStore } from '@/stores/roles'

const router = useRouter()
const rolesStore = useRolesStore()
const permissionsStore = usePermissionsStore()
const { roles, loading, error } = storeToRefs(rolesStore)

const showSheet = ref(false)
const editingRole = ref<RoleWithPermissions | null>(null)
const pendingDelete = ref<RoleWithPermissions | null>(null)
const deleting = ref(false)

// ── Búsqueda, orden y paginación (patrón UsersView) ────────────
const search = ref('')
const sortKey = ref<'name' | 'permissions' | 'active_users' | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const pageSize = ref(25)

const filteredRoles = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q)
    return roles.value
  return roles.value.filter(
    r => r.name.toLowerCase().includes(q) || (r.description?.toLowerCase().includes(q) ?? false),
  )
})

const sortedRoles = computed(() => {
  const list = filteredRoles.value
  if (!sortKey.value)
    return list
  const key = sortKey.value
  return [...list].sort((a, b) => {
    let cmp = 0
    if (key === 'name')
      cmp = a.name.localeCompare(b.name, 'es')
    else if (key === 'permissions')
      cmp = a.permission_ids.length - b.permission_ids.length
    else if (key === 'active_users')
      cmp = a.active_user_count - b.active_user_count
    return sortDir.value === 'asc' ? cmp : -cmp
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedRoles.value.length / pageSize.value)))

const paginatedRoles = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedRoles.value.slice(start, start + pageSize.value)
})

watch([search, pageSize], () => {
  currentPage.value = 1
})

function toggleSort(key: string) {
  const k = key as 'name' | 'permissions' | 'active_users'
  if (sortKey.value === k) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  }
  else {
    sortKey.value = k
    sortDir.value = 'asc'
  }
  currentPage.value = 1
}

// ── Navegación a Users con filtro por rol ─────────────────────
function goToUsers(role: RoleWithPermissions) {
  router.push({ name: 'users', query: { role: role.id, roleName: role.name } })
}

onMounted(async () => {
  await Promise.all([
    rolesStore.fetchAll(),
    rolesStore.fetchPermissions(),
  ])
})

function openCreate() {
  editingRole.value = null
  showSheet.value = true
}

function openEdit(role: RoleWithPermissions) {
  editingRole.value = role
  showSheet.value = true
}

function onSaved() {
  const wasEditing = !!editingRole.value
  showSheet.value = false
  editingRole.value = null
  toast.success(wasEditing ? 'Rol actualizado' : 'Rol creado')
}

async function confirmDelete() {
  // Capturar antes del await — reka-ui emite update:open=false al clickear
  // AlertDialogAction, lo que nulifica pendingDelete antes de que este handler
  // pueda leerlo si se hace el check después.
  const role = pendingDelete.value
  if (!role)
    return
  deleting.value = true
  try {
    await rolesStore.deleteRole(role.id)
    toast.success('Rol eliminado')
  }
  catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Error al eliminar')
  }
  finally {
    deleting.value = false
    pendingDelete.value = null
  }
}

// ── Helpers ────────────────────────────────────────────────────
function totalUsersForRole(role: RoleWithPermissions): number {
  return role.active_user_count + role.inactive_user_count
}
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-[#002B5B]">
          Roles
        </h1>
        <p class="text-muted-foreground text-sm">
          Gestioná los roles y sus permisos
        </p>
      </div>
      <Button
        v-if="permissionsStore.can('settings.edit')"
        @click="openCreate"
      >
        <Plus class="h-4 w-4 mr-2" />
        Nuevo rol
      </Button>
    </div>

    <div v-if="error" class="text-destructive text-sm">
      {{ error }}
    </div>

    <!-- Barra de búsqueda -->
    <Input
      v-model="search"
      placeholder="Buscar por nombre o descripción..."
      class="max-w-xs h-9"
    />

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <DataTableColumnHeader
              sort-key="name"
              :current-sort-key="sortKey"
              :current-sort-order="sortDir"
              label="Nombre"
              @sort="toggleSort"
            />
          </TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead class="text-center">
            <DataTableColumnHeader
              sort-key="permissions"
              :current-sort-key="sortKey"
              :current-sort-order="sortDir"
              label="Permisos"
              align="center"
              @sort="toggleSort"
            />
          </TableHead>
          <TableHead class="text-center">
            <DataTableColumnHeader
              sort-key="active_users"
              :current-sort-key="sortKey"
              :current-sort-order="sortDir"
              label="Usuarios"
              align="center"
              @sort="toggleSort"
            />
          </TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-if="loading">
          <TableRow v-for="i in 4" :key="i">
            <TableCell><Skeleton class="h-4 w-32" /></TableCell>
            <TableCell><Skeleton class="h-4 w-48" /></TableCell>
            <TableCell><Skeleton class="h-4 w-12 mx-auto" /></TableCell>
            <TableCell><Skeleton class="h-4 w-24 mx-auto" /></TableCell>
            <TableCell />
          </TableRow>
        </template>
        <template v-else>
          <TableRow v-for="role in paginatedRoles" :key="role.id">
            <TableCell class="font-medium">
              <div class="flex items-center gap-2">
                <ShieldCheck v-if="role.is_system" class="h-4 w-4 text-[#D4BE77]" />
                <Shield v-else class="h-4 w-4 text-muted-foreground" />
                {{ role.name }}
                <Badge v-if="role.is_system" variant="secondary" class="text-xs">
                  Sistema
                </Badge>
              </div>
            </TableCell>
            <TableCell class="text-muted-foreground">
              {{ role.description ?? '—' }}
            </TableCell>
            <TableCell class="text-center">
              <Badge variant="outline">
                {{ role.permission_ids.length }}
              </Badge>
            </TableCell>
            <TableCell class="text-center">
              <div class="flex items-center justify-center gap-1.5">
                <!-- Badge activos: clickeable si hay usuarios activos -->
                <button
                  v-if="role.active_user_count > 0"
                  class="cursor-pointer"
                  @click="goToUsers(role)"
                >
                  <Badge class="hover:opacity-80 transition-opacity">
                    {{ role.active_user_count }} activos
                  </Badge>
                </button>
                <Badge v-else variant="outline" class="opacity-50">
                  0 activos
                </Badge>
                <!-- Badge inactivos: solo informativo -->
                <Badge v-if="role.inactive_user_count > 0" variant="outline">
                  {{ role.inactive_user_count }} inactivos
                </Badge>
              </div>
            </TableCell>
            <TableCell class="text-right">
              <template v-if="!role.is_system && permissionsStore.can('settings.edit')">
                <Button variant="ghost" size="sm" @click="openEdit(role)">
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  class="text-destructive hover:text-destructive"
                  @click="pendingDelete = role"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </template>
            </TableCell>
          </TableRow>
          <TableRow v-if="paginatedRoles.length === 0">
            <TableCell colspan="5" class="text-center text-muted-foreground py-8">
              {{ search ? 'Sin resultados para esa búsqueda.' : 'No hay roles configurados' }}
            </TableCell>
          </TableRow>
        </template>
      </TableBody>
    </Table>

    <DataTablePagination
      v-if="!loading"
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :total-items="sortedRoles.length"
      :total-pages="totalPages"
      :page-size-options="[10, 25, 50]"
    />

    <!-- Sheet de creación / edición -->
    <Sheet v-model:open="showSheet">
      <SheetContent class="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{{ editingRole ? 'Editar rol' : 'Nuevo rol' }}</SheetTitle>
          <SheetDescription>
            {{ editingRole ? 'Modificá el nombre y permisos del rol' : 'Creá un nuevo rol con permisos personalizados' }}
          </SheetDescription>
        </SheetHeader>
        <div class="mt-6">
          <RoleForm
            :role="editingRole"
            @saved="onSaved"
            @cancel="showSheet = false"
          />
        </div>
      </SheetContent>
    </Sheet>

    <!-- AlertDialog de eliminación -->
    <AlertDialog :open="!!pendingDelete" @update:open="(v) => { if (!v) pendingDelete = null }">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar el rol "{{ pendingDelete?.name }}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer.
            <template v-if="pendingDelete && totalUsersForRole(pendingDelete) > 0">
              <br>
              <span class="text-destructive font-medium">
                Este rol tiene {{ pendingDelete.active_user_count }} activos, {{ pendingDelete.inactive_user_count }} inactivos y no puede eliminarse.
              </span>
            </template>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="pendingDelete = null">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            :disabled="(pendingDelete ? totalUsersForRole(pendingDelete) : 0) > 0 || deleting"
            @click="confirmDelete"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
