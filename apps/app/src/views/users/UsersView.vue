<script setup lang="ts">
import type { UserWithRoles } from '@/types'
import { toTypedSchema } from '@vee-validate/zod'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { z } from 'zod'
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
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CreateUserForm from '@/components/users/CreateUserForm.vue'
import { extractErrorMessage } from '@/lib/utils'
import { usePermissionsStore } from '@/stores/permissions'
import { useRolesStore } from '@/stores/roles'
import { useUsersStore } from '@/stores/users'

const usersStore = useUsersStore()
const rolesStore = useRolesStore()
const permissionsStore = usePermissionsStore()
const { users, loading, error } = storeToRefs(usersStore)

interface PendingRoleChange { user: UserWithRoles, newRoleId: string }
const pendingRoleChange = ref<PendingRoleChange | null>(null)
const pendingDeleteUser = ref<UserWithRoles | null>(null)
const pendingToggleUser = ref<UserWithRoles | null>(null)
const toggling = ref(false)
const deleting = ref(false)

const search = ref('')
const filterStatus = ref('active')
const sortKey = ref<'name' | 'email' | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const pageSize = ref(25)
const showCreateSheet = ref(false)
const editingUserId = ref<string | null>(null)
const assigning = ref<Record<string, boolean>>({})
const creating = ref(false)
const saving = ref(false)

const editingUser = computed<UserWithRoles | null>(
  () => users.value.find(u => u.id === editingUserId.value) ?? null,
)

const filteredUsers = computed(() => {
  let list = users.value

  if (filterStatus.value === 'active')
    list = list.filter(u => u.is_active)
  else if (filterStatus.value === 'disabled')
    list = list.filter(u => !u.is_active)

  const q = search.value.toLowerCase().trim()
  if (q)
    list = list.filter(u => u.email.toLowerCase().includes(q) || (u.full_name?.toLowerCase().includes(q) ?? false))

  if (sortKey.value) {
    const key = sortKey.value
    list = [...list].sort((a, b) => {
      const av = key === 'name' ? (a.full_name ?? a.email) : a.email
      const bv = key === 'name' ? (b.full_name ?? b.email) : b.email
      const cmp = av.localeCompare(bv, 'es')
      return sortDir.value === 'asc' ? cmp : -cmp
    })
  }

  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredUsers.value.length / pageSize.value)))

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredUsers.value.slice(start, start + pageSize.value)
})

watch([search, filterStatus, pageSize], () => {
  currentPage.value = 1
})

function toggleSort(key: string) {
  const k = key as 'name' | 'email'
  if (sortKey.value === k) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  }
  else {
    sortKey.value = k
    sortDir.value = 'asc'
  }
  currentPage.value = 1
}

onMounted(async () => {
  await Promise.all([usersStore.fetchAll(), rolesStore.fetchAll()])
})

// ── Crear usuario ─────────────────────────────────────────────
function openCreate() {
  showCreateSheet.value = true
}

async function handleCreateSubmit(values: { email: string, full_name: string | null, phone: string | null }) {
  creating.value = true
  try {
    await usersStore.createUser(values)
    toast.success(`Invitación enviada a ${values.email}`)
    showCreateSheet.value = false
  }
  catch (err) {
    toast.error(extractErrorMessage(err, 'No se pudo crear el usuario'))
  }
  finally {
    creating.value = false
  }
}

// ── Editar perfil ─────────────────────────────────────────────
const editSchema = toTypedSchema(z.object({
  full_name: z.string().optional(),
  phone: z.string().optional(),
}))

const { handleSubmit: handleEditSubmit, setValues: setEditValues } = useForm({
  validationSchema: editSchema,
})

function openEdit(user: UserWithRoles) {
  editingUserId.value = user.id
  setEditValues({
    full_name: user.full_name ?? '',
    phone: user.phone ?? '',
  })
}

const onEditSubmit = handleEditSubmit(async (values) => {
  if (!editingUserId.value)
    return
  saving.value = true
  try {
    await usersStore.updateProfile(editingUserId.value, {
      full_name: values.full_name || null,
      phone: values.phone || null,
    })
    toast.success('Perfil actualizado')
    editingUserId.value = null
  }
  catch {
    toast.error('No se pudo actualizar el perfil')
  }
  finally {
    saving.value = false
  }
})

// ── Deshabilitar / Habilitar ──────────────────────────────────
async function confirmToggleUser() {
  const user = pendingToggleUser.value
  pendingToggleUser.value = null
  if (!user)
    return
  toggling.value = true
  try {
    await usersStore.toggleUser(user.id, !user.is_active)
    toast.success(user.is_active ? `"${user.email}" deshabilitado` : `"${user.email}" habilitado`)
  }
  catch {
    toast.error('No se pudo cambiar el estado del usuario')
  }
  finally {
    toggling.value = false
  }
}

// ── Eliminar usuario ──────────────────────────────────────────
async function confirmDeleteUser() {
  const user = pendingDeleteUser.value
  pendingDeleteUser.value = null
  if (!user)
    return
  deleting.value = true
  try {
    await usersStore.deleteUser(user.id)
    toast.success(`Usuario "${user.email}" eliminado`)
    if (editingUserId.value === user.id)
      editingUserId.value = null
  }
  catch (err) {
    const msg = extractErrorMessage(err, '').includes('violates foreign key')
      ? 'No se puede eliminar — el usuario tiene registros asociados'
      : 'No se pudo eliminar el usuario'
    toast.error(msg)
  }
  finally {
    deleting.value = false
  }
}

// ── Gestión de rol único ──────────────────────────────────────
function requestRoleChange(user: UserWithRoles, newRoleId: string) {
  if (newRoleId === (user.roles[0]?.id ?? ''))
    return
  pendingRoleChange.value = { user, newRoleId }
}

async function confirmRoleChange() {
  const pending = pendingRoleChange.value
  pendingRoleChange.value = null
  if (!pending)
    return
  const { user, newRoleId } = pending
  assigning.value[user.id] = true
  try {
    if (newRoleId) {
      const role = rolesStore.roles.find(r => r.id === newRoleId)
      await usersStore.assignRole(user.id, newRoleId, role)
      toast.success(`Rol "${role?.name}" asignado`)
    }
    else {
      if (user.roles[0])
        await usersStore.removeRole(user.id, user.roles[0].id)
      toast.success('Rol removido')
    }
  }
  catch {
    toast.error('No se pudo cambiar el rol')
  }
  finally {
    assigning.value[user.id] = false
  }
}

function pendingRoleNewName(): string {
  if (!pendingRoleChange.value?.newRoleId)
    return 'Sin rol'
  return rolesStore.roles.find(r => r.id === pendingRoleChange.value!.newRoleId)?.name ?? 'Sin rol'
}

// ── Helpers ───────────────────────────────────────────────────
function getInitials(user: UserWithRoles): string {
  if (user.full_name) {
    return user.full_name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return user.email[0].toUpperCase()
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-heading font-bold text-foreground">
          Usuarios
        </h1>
        <p class="text-sm text-muted-foreground mt-1">
          Gestioná el acceso de cada miembro del equipo
        </p>
      </div>
      <Button @click="openCreate">
        + Nuevo usuario
      </Button>
    </div>

    <p v-if="error" class="text-sm text-destructive">
      {{ error }}
    </p>

    <!-- Filtros -->
    <div class="flex flex-wrap gap-3 items-center">
      <Tabs v-model="filterStatus">
        <TabsList>
          <TabsTrigger value="active">
            Activos
          </TabsTrigger>
          <TabsTrigger value="disabled">
            Deshabilitados
          </TabsTrigger>
          <TabsTrigger value="all">
            Todos
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Input
        v-model="search"
        placeholder="Buscar por nombre o email..."
        class="max-w-xs h-9"
      />
    </div>

    <!-- Tabla -->
    <div class="rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/60 hover:bg-muted/60 border-b-2">
            <TableHead class="w-10" />
            <TableHead class="font-semibold text-foreground">
              <DataTableColumnHeader sort-key="name" :current-sort-key="sortKey" :current-sort-order="sortDir" label="Nombre" @sort="toggleSort" />
            </TableHead>
            <TableHead class="font-semibold text-foreground">
              <DataTableColumnHeader sort-key="email" :current-sort-key="sortKey" :current-sort-order="sortDir" label="Email" @sort="toggleSort" />
            </TableHead>
            <TableHead class="font-semibold text-foreground">
              Rol
            </TableHead>
            <TableHead class="font-semibold text-foreground">
              Estado
            </TableHead>
            <TableHead class="text-right font-semibold text-foreground">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <!-- Skeletons -->
          <template v-if="loading">
            <TableRow v-for="i in 5" :key="i">
              <TableCell><Skeleton class="size-8 rounded-full" /></TableCell>
              <TableCell><Skeleton class="h-4 w-32" /></TableCell>
              <TableCell><Skeleton class="h-4 w-44" /></TableCell>
              <TableCell><Skeleton class="h-5 w-24" /></TableCell>
              <TableCell><Skeleton class="h-5 w-16" /></TableCell>
              <TableCell />
            </TableRow>
          </template>

          <!-- Sin resultados -->
          <template v-else-if="paginatedUsers.length === 0">
            <TableRow>
              <TableCell colspan="6" class="text-center text-muted-foreground py-10">
                {{ search ? 'Sin resultados para esa búsqueda.' : filterStatus === 'disabled' ? 'No hay usuarios deshabilitados.' : 'No hay usuarios registrados.' }}
              </TableCell>
            </TableRow>
          </template>

          <!-- Filas -->
          <template v-else>
            <TableRow
              v-for="user in paginatedUsers"
              :key="user.id"
              class="cursor-default"
              :class="!user.is_active ? 'opacity-60' : ''"
            >
              <!-- Avatar -->
              <TableCell>
                <div class="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold select-none">
                  {{ getInitials(user) }}
                </div>
              </TableCell>

              <!-- Nombre -->
              <TableCell>
                <span v-if="user.full_name" class="font-medium">{{ user.full_name }}</span>
                <span v-else class="text-muted-foreground italic text-sm">Sin nombre</span>
              </TableCell>

              <!-- Email -->
              <TableCell class="text-muted-foreground text-sm">
                {{ user.email }}
              </TableCell>

              <!-- Rol único -->
              <TableCell>
                <Badge v-if="user.roles[0]" variant="secondary" class="text-xs">
                  {{ user.roles[0].name }}
                </Badge>
                <Badge v-else variant="destructive" class="text-xs">
                  Sin rol
                </Badge>
              </TableCell>

              <!-- Estado -->
              <TableCell>
                <Badge :variant="user.is_active ? 'default' : 'outline'" class="text-xs">
                  {{ user.is_active ? 'Activo' : 'Deshabilitado' }}
                </Badge>
              </TableCell>

              <!-- Acciones -->
              <TableCell class="text-right">
                <div class="flex justify-end gap-2">
                  <Button size="sm" variant="outline" @click="openEdit(user)">
                    Editar
                  </Button>
                  <Button
                    v-if="permissionsStore.can('users.disable')"
                    size="sm"
                    :variant="user.is_active ? 'outline' : 'default'"
                    @click="pendingToggleUser = user"
                  >
                    {{ user.is_active ? 'Deshabilitar' : 'Habilitar' }}
                  </Button>
                  <Button
                    v-if="!user.is_active"
                    size="sm"
                    variant="destructive"
                    @click="pendingDeleteUser = user"
                  >
                    Eliminar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>

    <DataTablePagination
      v-if="!loading"
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :total-items="filteredUsers.length"
      :total-pages="totalPages"
      :page-size-options="[10, 25, 50]"
    />

    <!-- Sheet: nuevo usuario -->
    <Sheet v-model:open="showCreateSheet">
      <SheetContent class="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Invitar usuario</SheetTitle>
          <SheetDescription>
            Se enviará un email de invitación. El usuario elige su contraseña al aceptar.
          </SheetDescription>
        </SheetHeader>
        <CreateUserForm
          :loading="creating"
          @submit="handleCreateSubmit"
          @cancel="showCreateSheet = false"
        />
      </SheetContent>
    </Sheet>

    <!-- Confirmación deshabilitar / habilitar -->
    <AlertDialog :open="!!pendingToggleUser">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {{ pendingToggleUser?.is_active ? '¿Deshabilitar usuario?' : '¿Habilitar usuario?' }}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <template v-if="pendingToggleUser?.is_active">
              "{{ pendingToggleUser?.email }}" no podrá iniciar sesión hasta que sea habilitado nuevamente.
            </template>
            <template v-else>
              "{{ pendingToggleUser?.email }}" podrá volver a iniciar sesión.
            </template>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="pendingToggleUser = null">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction :disabled="toggling" @click="confirmToggleUser">
            {{ pendingToggleUser?.is_active ? 'Deshabilitar' : 'Habilitar' }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Confirmación eliminar -->
    <AlertDialog :open="!!pendingDeleteUser">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar usuario permanentemente?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará "{{ pendingDeleteUser?.email }}" y todos sus datos de perfil y roles. Esta acción no se puede deshacer. Si el usuario tiene registros asociados (cotizaciones, etc.) la eliminación será bloqueada.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="pendingDeleteUser = null">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            :disabled="deleting"
            @click="confirmDeleteUser"
          >
            Eliminar permanentemente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Confirmación cambio de rol -->
    <AlertDialog :open="!!pendingRoleChange" @update:open="(v) => { if (!v) pendingRoleChange = null }">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cambiar rol?</AlertDialogTitle>
          <AlertDialogDescription>
            Se cambiará el rol de
            <span class="font-medium">"{{ pendingRoleChange?.user.roles[0]?.name ?? 'Sin rol' }}"</span>
            a
            <span class="font-medium">"{{ pendingRoleNewName() }}"</span>
            para "{{ pendingRoleChange?.user.email }}". El usuario verá los nuevos permisos en su próxima recarga.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="pendingRoleChange = null">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction @click="confirmRoleChange">
            Cambiar rol
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Sheet: editar usuario -->
    <Sheet :open="!!editingUserId" @update:open="(v) => { if (!v) editingUserId = null }">
      <SheetContent class="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{{ editingUser?.full_name ?? 'Editar usuario' }}</SheetTitle>
          <SheetDescription>{{ editingUser?.email }}</SheetDescription>
        </SheetHeader>

        <form v-if="editingUser" class="space-y-4 mt-6" @submit="onEditSubmit">
          <FormField v-slot="{ componentField }" name="full_name">
            <FormItem>
              <FormLabel>Nombre completo</FormLabel>
              <FormControl>
                <Input placeholder="Ej: María González" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="phone">
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input placeholder="+56 9 1234 5678" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <div class="flex justify-end gap-2 pt-2">
            <Button type="submit" :disabled="saving">
              {{ saving ? 'Guardando...' : 'Guardar cambios' }}
            </Button>
          </div>
        </form>

        <Separator class="my-6" />

        <div v-if="editingUser" class="space-y-3">
          <p class="text-sm font-medium">
            Rol asignado
          </p>
          <Select
            :model-value="editingUser.roles[0]?.id ?? ''"
            :disabled="assigning[editingUser.id]"
            @update:model-value="(v) => requestRoleChange(editingUser!, v)"
          >
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Sin rol asignado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">
                Sin rol
              </SelectItem>
              <SelectItem
                v-for="role in rolesStore.roles"
                :key="role.id"
                :value="role.id"
              >
                {{ role.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SheetContent>
    </Sheet>
  </div>
</template>
