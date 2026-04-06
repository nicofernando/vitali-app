<script setup lang="ts">
import type { Role, UserWithRoles } from '@/types'
import { toTypedSchema } from '@vee-validate/zod'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
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
import { supabase } from '@/lib/supabase'
import { useUsersStore } from '@/stores/users'

const usersStore = useUsersStore()
const { users, loading, error } = storeToRefs(usersStore)

const roles = ref<Role[]>([])
const search = ref('')
const showCreateSheet = ref(false)
const editingUserId = ref<string | null>(null)
const selectedRole = ref<Record<string, string>>({})
const assigning = ref<Record<string, boolean>>({})
const creating = ref(false)
const saving = ref(false)

const editingUser = computed<UserWithRoles | null>(
  () => users.value.find(u => u.id === editingUserId.value) ?? null,
)

const filteredUsers = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q)
    return users.value
  return users.value.filter(u =>
    u.email.toLowerCase().includes(q)
    || (u.full_name?.toLowerCase().includes(q) ?? false),
  )
})

onMounted(async () => {
  await usersStore.fetchAll()
  const { data } = await supabase.from('roles').select('id, name, description, created_at').order('name')
  roles.value = data ?? []
})

// ── Formulario crear usuario ──────────────────────────────────
const createSchema = toTypedSchema(z.object({
  email: z.string().email('Email inválido'),
  full_name: z.string().optional(),
  phone: z.string().optional(),
}))

const { handleSubmit: handleCreateSubmit, resetForm: resetCreateForm } = useForm({
  validationSchema: createSchema,
})

function openCreate() {
  resetCreateForm()
  showCreateSheet.value = true
}

const onCreateSubmit = handleCreateSubmit(async (values) => {
  creating.value = true
  try {
    await usersStore.createUser({
      email: values.email,
      full_name: values.full_name ?? null,
      phone: values.phone ?? null,
    })
    toast.success(`Invitación enviada a ${values.email}`)
    showCreateSheet.value = false
  }
  catch (err: any) {
    toast.error(err?.message ?? 'No se pudo crear el usuario')
  }
  finally {
    creating.value = false
  }
})

// ── Formulario editar perfil ──────────────────────────────────
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

// ── Gestión de roles ──────────────────────────────────────────
function availableRoles(userId: string): Role[] {
  const user = users.value.find(u => u.id === userId)
  if (!user)
    return roles.value
  const assignedIds = new Set(user.roles.map(r => r.id))
  return roles.value.filter(r => !assignedIds.has(r.id))
}

async function handleAssignRole(userId: string) {
  const roleId = selectedRole.value[userId]
  if (!roleId)
    return
  const role = roles.value.find(r => r.id === roleId)
  if (!role)
    return
  assigning.value[userId] = true
  try {
    await usersStore.assignRole(userId, roleId, role)
    selectedRole.value[userId] = ''
    toast.success(`Rol "${role.name}" asignado`)
  }
  catch {
    toast.error('No se pudo asignar el rol')
  }
  finally {
    assigning.value[userId] = false
  }
}

async function handleRemoveRole(userId: string, roleId: string, roleName: string) {
  assigning.value[userId] = true
  try {
    await usersStore.removeRole(userId, roleId)
    toast.success(`Rol "${roleName}" removido`)
  }
  catch {
    toast.error('No se pudo remover el rol')
  }
  finally {
    assigning.value[userId] = false
  }
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
  <div class="p-6 max-w-5xl mx-auto space-y-6">
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

    <!-- Búsqueda -->
    <Input
      v-model="search"
      placeholder="Buscar por nombre o email..."
      class="max-w-sm"
    />

    <!-- Tabla -->
    <div class="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-10" />
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead class="text-right">
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
              <TableCell />
            </TableRow>
          </template>

          <!-- Sin resultados de búsqueda -->
          <template v-else-if="filteredUsers.length === 0">
            <TableRow>
              <TableCell colspan="5" class="text-center text-muted-foreground py-10">
                {{ search ? 'Sin resultados para esa búsqueda.' : 'No hay usuarios registrados.' }}
              </TableCell>
            </TableRow>
          </template>

          <!-- Filas -->
          <template v-else>
            <TableRow
              v-for="user in filteredUsers"
              :key="user.id"
              class="cursor-default"
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

              <!-- Roles -->
              <TableCell>
                <div v-if="user.roles.length === 0" class="text-sm text-muted-foreground italic">
                  Sin roles
                </div>
                <div v-else class="flex flex-wrap gap-1">
                  <Badge
                    v-for="role in user.roles.slice(0, 2)"
                    :key="role.id"
                    variant="secondary"
                    class="text-xs"
                  >
                    {{ role.name }}
                  </Badge>
                  <Badge
                    v-if="user.roles.length > 2"
                    variant="outline"
                    class="text-xs"
                  >
                    +{{ user.roles.length - 2 }}
                  </Badge>
                </div>
              </TableCell>

              <!-- Acciones -->
              <TableCell class="text-right">
                <Button size="sm" variant="outline" @click="openEdit(user)">
                  Editar
                </Button>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>

    <!-- Contador -->
    <p v-if="!loading && users.length > 0" class="text-xs text-muted-foreground">
      Mostrando {{ filteredUsers.length }} de {{ users.length }} usuario{{ users.length !== 1 ? 's' : '' }}
    </p>

    <!-- Sheet: nuevo usuario -->
    <Sheet v-model:open="showCreateSheet">
      <SheetContent class="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Invitar usuario</SheetTitle>
          <SheetDescription>
            Se enviará un email de invitación. El usuario elige su contraseña al aceptar.
          </SheetDescription>
        </SheetHeader>

        <form class="space-y-4 mt-6" @submit="onCreateSubmit">
          <FormField v-slot="{ componentField }" name="email">
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input type="email" placeholder="usuario@vitalisuites.com" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

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

          <div class="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" @click="showCreateSheet = false">
              Cancelar
            </Button>
            <Button type="submit" :disabled="creating">
              {{ creating ? 'Enviando...' : 'Enviar invitación' }}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>

    <!-- Sheet: editar usuario -->
    <Sheet :open="!!editingUserId" @update:open="(v) => { if (!v) editingUserId = null }">
      <SheetContent class="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{{ editingUser?.full_name ?? editingUser?.email ?? 'Editar usuario' }}</SheetTitle>
          <SheetDescription>{{ editingUser?.email }}</SheetDescription>
        </SheetHeader>

        <!-- Datos del perfil -->
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

        <!-- Roles -->
        <div v-if="editingUser" class="space-y-3">
          <p class="text-sm font-medium">
            Roles asignados
          </p>

          <div v-if="editingUser.roles.length === 0" class="text-sm text-muted-foreground italic">
            Sin roles asignados
          </div>
          <div v-else class="flex flex-wrap gap-2">
            <Badge
              v-for="role in editingUser.roles"
              :key="role.id"
              variant="secondary"
              class="gap-1.5 pr-1.5"
            >
              {{ role.name }}
              <button
                class="rounded-sm opacity-70 hover:opacity-100 transition-opacity ml-0.5"
                :disabled="assigning[editingUser.id]"
                type="button"
                @click="handleRemoveRole(editingUser.id, role.id, role.name)"
              >
                ×
              </button>
            </Badge>
          </div>

          <div v-if="availableRoles(editingUser.id).length > 0" class="flex gap-2 pt-1">
            <Select v-model="selectedRole[editingUser.id]">
              <SelectTrigger class="flex-1">
                <SelectValue placeholder="Agregar rol..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="role in availableRoles(editingUser.id)"
                  :key="role.id"
                  :value="role.id"
                >
                  {{ role.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              :disabled="!selectedRole[editingUser.id] || assigning[editingUser.id]"
              @click="handleAssignRole(editingUser.id)"
            >
              Asignar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  </div>
</template>
