<script setup lang="ts">
import type { Permission } from '@/types'
import { computed } from 'vue'
import { groupPermissionsByModule, isModuleFullySelected, toggleModule } from '@/lib/roles-permissions'

const props = defineProps<{
  permissions: Permission[]
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const grouped = computed(() => groupPermissionsByModule(props.permissions))
const modules = computed(() => Object.keys(grouped.value).sort())

function isFullModule(module: string) {
  return isModuleFullySelected(module, props.modelValue, props.permissions)
}

function isPartialModule(module: string) {
  const modulePerms = grouped.value[module] ?? []
  const count = modulePerms.filter(p => props.modelValue.includes(p.id)).length
  return count > 0 && count < modulePerms.length
}

function onModuleToggle(module: string, checked: boolean) {
  emit('update:modelValue', toggleModule(module, props.modelValue, props.permissions, checked))
}

function onPermissionToggle(permId: string, checked: boolean) {
  if (checked) {
    emit('update:modelValue', [...new Set([...props.modelValue, permId])])
  }
  else {
    emit('update:modelValue', props.modelValue.filter(id => id !== permId))
  }
}

const MODULE_LABELS: Record<string, string> = {
  simulator: 'Simulador',
  projects: 'Proyectos',
  towers: 'Torres',
  typologies: 'Tipologías',
  units: 'Unidades',
  clients: 'Clientes',
  quotes: 'Cotizaciones',
  users: 'Usuarios',
  roles: 'Roles',
  settings: 'Configuración',
  audit: 'Auditoría',
}

function moduleLabel(module: string) {
  return MODULE_LABELS[module] ?? module
}
</script>

<template>
  <div class="space-y-4">
    <div
      v-for="module in modules"
      :key="module"
      class="border rounded-lg p-4"
    >
      <label class="flex items-center gap-2 cursor-pointer mb-3">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 accent-[#002B5B]"
          :checked="isFullModule(module)"
          :indeterminate="isPartialModule(module)"
          @change="onModuleToggle(module, ($event.target as HTMLInputElement).checked)"
        >
        <span class="font-semibold text-sm text-[#002B5B]">{{ moduleLabel(module) }}</span>
      </label>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
        <label
          v-for="perm in grouped[module]"
          :key="perm.id"
          class="flex items-start gap-2 cursor-pointer"
        >
          <input
            type="checkbox"
            class="h-4 w-4 mt-0.5 rounded border-gray-300 accent-[#002B5B]"
            :checked="modelValue.includes(perm.id)"
            @change="onPermissionToggle(perm.id, ($event.target as HTMLInputElement).checked)"
          >
          <div>
            <span class="text-sm font-medium">{{ perm.action }}</span>
            <p v-if="perm.description" class="text-xs text-muted-foreground">
              {{ perm.description }}
            </p>
          </div>
        </label>
      </div>
    </div>
  </div>
</template>
