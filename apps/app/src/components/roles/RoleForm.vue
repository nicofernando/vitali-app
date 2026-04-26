<script setup lang="ts">
import type { RoleWithPermissions } from '@/types'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useRolesStore } from '@/stores/roles'
import PermissionMatrix from './PermissionMatrix.vue'

const props = defineProps<{
  role?: RoleWithPermissions | null
}>()

const emit = defineEmits<{
  saved: []
  cancel: []
}>()

const rolesStore = useRolesStore()

const schema = toTypedSchema(z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().nullable().optional(),
  permission_ids: z.array(z.string()).min(1, 'Seleccioná al menos un permiso'),
}))

const { handleSubmit, setValues, values, errors, isSubmitting } = useForm({
  validationSchema: schema,
  initialValues: { name: '', description: '', permission_ids: [] },
})

const isEdit = computed(() => !!props.role)

watch(() => props.role, (role) => {
  if (role) {
    setValues({
      name: role.name,
      description: role.description ?? '',
      permission_ids: role.permission_ids,
    })
  }
  else {
    setValues({ name: '', description: '', permission_ids: [] })
  }
}, { immediate: true })

const onSubmit = handleSubmit(async (formValues) => {
  const permIds = formValues.permission_ids ?? []
  if (isEdit.value && props.role) {
    await rolesStore.updateRole(props.role.id, formValues.name, formValues.description ?? null, permIds)
  }
  else {
    await rolesStore.createRole(formValues.name, formValues.description ?? null, permIds)
  }
  emit('saved')
})
</script>

<template>
  <form class="flex flex-col gap-6" @submit.prevent="onSubmit">
    <FormField name="name">
      <FormItem>
        <FormLabel>Nombre del rol</FormLabel>
        <FormControl>
          <Input
            :model-value="values.name"
            placeholder="ej. Supervisor Regional"
            @update:model-value="(v: string) => setValues({ name: v })"
          />
        </FormControl>
        <FormMessage>{{ errors.name }}</FormMessage>
      </FormItem>
    </FormField>

    <FormField name="description">
      <FormItem>
        <FormLabel>Descripción <span class="text-muted-foreground">(opcional)</span></FormLabel>
        <FormControl>
          <Input
            :model-value="values.description ?? ''"
            placeholder="Describe brevemente el rol"
            @update:model-value="(v: string) => setValues({ description: v })"
          />
        </FormControl>
      </FormItem>
    </FormField>

    <div>
      <p class="text-sm font-medium mb-2">
        Permisos
      </p>
      <PermissionMatrix
        :permissions="rolesStore.allPermissions"
        :model-value="values.permission_ids ?? []"
        @update:model-value="(v: string[]) => setValues({ permission_ids: v })"
      />
      <p v-if="errors.permission_ids" class="text-sm text-destructive mt-1">
        {{ errors.permission_ids }}
      </p>
    </div>

    <div class="flex justify-end gap-2">
      <Button type="button" variant="outline" @click="emit('cancel')">
        Cancelar
      </Button>
      <Button type="submit" :disabled="isSubmitting">
        {{ isEdit ? 'Guardar cambios' : 'Crear rol' }}
      </Button>
    </div>
  </form>
</template>
