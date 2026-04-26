<script setup lang="ts">
import type { Client } from '@/types'
import { toTypedSchema } from '@vee-validate/zod'
import { Loader2 } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { ref } from 'vue'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import PhoneInput from '@/components/ui/phone-input/PhoneInput.vue'
import { formatRut, normalizeRut, validateRut } from '@/lib/rut'

const props = defineProps<{
  client?: Client | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  submit: [values: {
    full_name: string
    rut: string | null
    address: string | null
    commune: string | null
    phone_country_code: string
    phone: string | null
    email: string | null
  }]
  cancel: []
}>()

// Campo de texto opcional: vacío o solo espacios → null (no guardamos strings vacíos en DB)
const optionalString = z.string().optional().transform(v => v?.trim() || null)

const schema = toTypedSchema(z.object({
  full_name: z.string().min(1, 'El nombre es requerido'),
  rut: z.string().optional().transform(v => v?.trim() ? normalizeRut(v.trim()) : null).refine(v => !v || validateRut(v), { message: 'El RUT ingresado no es válido' }),
  // Email acepta string vacío para que limpiar el campo guarde null y no falle la validación de formato
  email: z.string().email('Email inválido').optional().or(z.literal('')).transform(v => v?.trim() || null),
  phone: optionalString,
  address: optionalString,
  commune: optionalString,
}))

const phoneCC = ref('+56')

const { handleSubmit, resetForm, setValues, setFieldValue } = useForm({ validationSchema: schema })

function init(client?: Client | null) {
  if (client) {
    phoneCC.value = client.phone_country_code ?? '+56'
    setValues({
      full_name: client.full_name,
      rut: client.rut ? formatRut(client.rut) : '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      address: client.address ?? '',
      commune: client.commune ?? '',
    })
  }
  else {
    phoneCC.value = '+56'
    resetForm()
  }
}

defineExpose({ init })

function handleRutBlur(e: FocusEvent) {
  const val = (e.target as HTMLInputElement).value.trim()
  if (val && validateRut(val))
    setFieldValue('rut', formatRut(val))
}

const onSubmit = handleSubmit((values) => {
  emit('submit', { ...values, phone_country_code: phoneCC.value })
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
            <Input v-bind="componentField" placeholder="12.345.678-9" @blur="handleRutBlur" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ componentField }" name="phone">
        <FormItem>
          <FormLabel>Teléfono</FormLabel>
          <FormControl>
            <PhoneInput
              v-bind="componentField"
              :country-code="phoneCC"
              @update:country-code="phoneCC = $event"
            />
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

    <div class="flex gap-2 justify-end pt-2">
      <Button type="button" variant="outline" @click="emit('cancel')">
        Cancelar
      </Button>
      <Button type="submit" :disabled="submitting">
        <Loader2 v-if="submitting" class="size-4 mr-2 animate-spin" />
        {{ submitting ? 'Guardando...' : props.client ? 'Guardar cambios' : 'Crear cliente' }}
      </Button>
    </div>
  </form>
</template>
