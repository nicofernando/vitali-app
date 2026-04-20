<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { ref } from 'vue'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const emit = defineEmits<{
  submit: [values: { email: string, full_name: string | null, phone: string | null }]
  cancel: []
}>()

defineProps<{
  loading?: boolean
}>()

const schema = toTypedSchema(z.object({
  email: z.string().email('Email inválido'),
  full_name: z.string().optional(),
  phone: z.string().optional(),
}))

const { handleSubmit, resetForm } = useForm({
  validationSchema: schema,
})

const onSubmit = handleSubmit((values) => {
  emit('submit', {
    email: values.email,
    full_name: values.full_name ?? null,
    phone: values.phone ?? null,
  })
})

defineExpose({ resetForm })
</script>

<template>
  <form class="space-y-4 mt-6" @submit="onSubmit">
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
      <Button type="button" variant="outline" @click="emit('cancel')">
        Cancelar
      </Button>
      <Button type="submit" :disabled="loading">
        {{ loading ? 'Enviando...' : 'Enviar invitación' }}
      </Button>
    </div>
  </form>
</template>
