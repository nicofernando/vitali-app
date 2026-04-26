<script setup lang="ts">
import type { RoleWithPermissions } from '@/types'
import { Plus, Shield, ShieldCheck, Trash2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
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

const rolesStore = useRolesStore()
const permissionsStore = usePermissionsStore()
const { roles, loading, error } = storeToRefs(rolesStore)

const showSheet = ref(false)
const editingRole = ref<RoleWithPermissions | null>(null)
const pendingDelete = ref<RoleWithPermissions | null>(null)
const deleting = ref(false)

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
  showSheet.value = false
  editingRole.value = null
  toast.success(editingRole.value ? 'Rol actualizado' : 'Rol creado')
}

async function confirmDelete() {
  if (!pendingDelete.value)
    return
  deleting.value = true
  try {
    await rolesStore.deleteRole(pendingDelete.value.id)
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

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead class="text-center">
            Permisos
          </TableHead>
          <TableHead class="text-center">
            Usuarios
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
            <TableCell><Skeleton class="h-4 w-12 mx-auto" /></TableCell>
            <TableCell />
          </TableRow>
        </template>
        <template v-else>
          <TableRow v-for="role in roles" :key="role.id">
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
              <Badge variant="outline">
                {{ role.user_count }}
              </Badge>
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
          <TableRow v-if="roles.length === 0">
            <TableCell colspan="5" class="text-center text-muted-foreground py-8">
              No hay roles configurados
            </TableCell>
          </TableRow>
        </template>
      </TableBody>
    </Table>

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
            <template v-if="(pendingDelete?.user_count ?? 0) > 0">
              <br>
              <span class="text-destructive font-medium">
                Este rol tiene {{ pendingDelete?.user_count }} usuario(s) asignado(s) y no puede eliminarse.
              </span>
            </template>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="pendingDelete = null">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            :disabled="(pendingDelete?.user_count ?? 0) > 0 || deleting"
            @click="confirmDelete"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
