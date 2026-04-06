<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUsersStore } from '@/stores/users'
import { supabase } from '@/lib/supabase'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'vue-sonner'
import type { Role } from '@/types'

const usersStore = useUsersStore()
const { users, loading, error } = storeToRefs(usersStore)

const roles = ref<Role[]>([])
const selectedRole = ref<Record<string, string>>({})
const assigning = ref<Record<string, boolean>>({})

onMounted(async () => {
  await usersStore.fetchAll()
  const { data } = await supabase.from('roles').select('id, name, description, created_at').order('name')
  roles.value = data ?? []
})

async function handleAssignRole(userId: string) {
  const roleId = selectedRole.value[userId]
  if (!roleId) return

  const role = roles.value.find(r => r.id === roleId)
  if (!role) return

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

function availableRoles(userId: string): Role[] {
  const user = users.value.find(u => u.id === userId)
  if (!user) return roles.value
  const assignedIds = new Set(user.roles.map(r => r.id))
  return roles.value.filter(r => !assignedIds.has(r.id))
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-heading font-bold text-foreground">Usuarios y Roles</h1>
      <p class="text-sm text-muted-foreground mt-1">Gestioná los roles de acceso de cada usuario</p>
    </div>

    <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

    <!-- Skeletons -->
    <template v-if="loading">
      <Card v-for="i in 3" :key="i">
        <CardContent class="p-6 space-y-3">
          <Skeleton class="h-5 w-1/3" />
          <Skeleton class="h-4 w-1/2" />
          <Skeleton class="h-8 w-full" />
        </CardContent>
      </Card>
    </template>

    <!-- Lista de usuarios -->
    <template v-else>
      <Card v-for="user in users" :key="user.id">
        <CardHeader class="pb-3">
          <CardTitle class="text-base">{{ user.full_name ?? '—' }}</CardTitle>
          <CardDescription>{{ user.email }}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- Roles actuales -->
          <div>
            <p class="text-xs text-muted-foreground mb-2">Roles asignados</p>
            <div v-if="user.roles.length === 0" class="text-sm text-muted-foreground italic">
              Sin roles asignados
            </div>
            <div v-else class="flex flex-wrap gap-2">
              <Badge
                v-for="role in user.roles"
                :key="role.id"
                variant="secondary"
                class="gap-1.5 pr-1.5"
              >
                {{ role.name }}
                <button
                  class="rounded-sm opacity-70 hover:opacity-100 transition-opacity ml-0.5"
                  :disabled="assigning[user.id]"
                  @click="handleRemoveRole(user.id, role.id, role.name)"
                >
                  ×
                </button>
              </Badge>
            </div>
          </div>

          <!-- Asignar rol -->
          <div v-if="availableRoles(user.id).length > 0" class="flex gap-2">
            <Select v-model="selectedRole[user.id]">
              <SelectTrigger class="flex-1">
                <SelectValue placeholder="Agregar rol..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="role in availableRoles(user.id)"
                  :key="role.id"
                  :value="role.id"
                >
                  {{ role.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              :disabled="!selectedRole[user.id] || assigning[user.id]"
              @click="handleAssignRole(user.id)"
            >
              Asignar
            </Button>
          </div>
        </CardContent>
      </Card>

      <p v-if="!loading && users.length === 0" class="text-center text-muted-foreground text-sm py-8">
        No hay usuarios registrados
      </p>
    </template>
  </div>
</template>
