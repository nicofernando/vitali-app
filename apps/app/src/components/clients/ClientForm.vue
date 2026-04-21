<script setup lang="ts">
import type { Client } from '@/types'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const props = defineProps<{
  client?: Client | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  submit: [values: { full_name: string, rut: string | null, address: string | null, commune: string | null, phone: string | null, email: string | null }]
  cancel: []
}>()

const schema = toTypedSchema(z.object({
  full_name: z.string().min(1, 'El nombre es requerido'),
  rut: z.string().optional().transform(v => v || null),
  email: z.string().email('Email inválido').optional().or(z.literal('')).transform(v => v || null),
  phone: z.string().optional().transform(v => v || null),
  address: z.string().optional().transform(v => v || null),
  commune: z.string().optional().transform(v => v || null),
}))

const { handleSubmit, resetForm, setValues } = useForm({ validationSchema: schema })

function init(client?: Client | null) {
  if (client) {
    setValues({
      full_name: client.full_name,
      rut: client.rut ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      address: client.address ?? '',
      commune: client.commune ?? '',
    })
  }
  else {
    resetForm()
  }
}

defineExpose({ init })

const onSubmit = handleSubmit((values) => {
  emit('submit', values)
})
</script>

<template>
  <form class="space-y-4" @submit.prevent="onSubmit">
    <FormField v-slot="{ componentField }" name="full_name">
      <FormItem>
        <FormLabel>Nombre completo *</FormLabel>
        <FormControl>
          <Input v-bind="componentField" placeholder="Juan Pérez González" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <div class="grid grid-cols-2 gap-4">
      <FormField v-slot="{ componentField }" name="rut">
        <FormItem>
          <FormLabel>RUT</FormLabel>
          <FormControl>
            <Input v-bind="componentField" placeholder="12.345.678-9" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ componentField }" name="phone">
        <FormItem>
          <FormLabel>Teléfono</FormLabel>
          <FormControl>
            <Input v-bind="componentField" placeholder="+56 9 1234 5678" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>

    <FormField v-slot="{ componentField }" name="email">
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input v-bind="componentField" type="email" placeholder="juan@ejemplo.com" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="address">
      <FormItem>
        <FormLabel>Dirección</FormLabel>
        <FormControl>
          <Input v-bind="componentField" placeholder="Av. Providencia 1234" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="commune">
      <FormItem>
        <FormLabel>Comuna</FormLabel>
        <FormControl>
          <Input v-bind="componentField" placeholder="Providencia" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <div class="flex gap-2 pt-2">
      <Button type="submit" :disabled="submitting" class="flex-1">
        {{ submitting ? 'Guardando...' : props.client ? 'Guardar cambios' : 'Crear cliente' }}
      </Button>
      <Button type="button" variant="outline" @click="emit('cancel')">
        Cancelar
      </Button>
    </div>
  </form>
</template>
