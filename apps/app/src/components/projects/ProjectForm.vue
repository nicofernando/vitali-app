<script setup lang="ts">
import type { Project } from '@/types'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase'
import { useProjectsStore } from '@/stores/projects'

interface Currency { id: string, code: string, name: string }

const props = defineProps<{
  project: Project | null
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const projectsStore = useProjectsStore()
const currencies = ref<Currency[]>([])
const submitting = ref(false)

const schema = toTypedSchema(z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  currency_id: z.string().uuid('Seleccioná una moneda'),
  annual_interest_rate: z.number().min(0).max(100, 'Debe ser un porcentaje entre 0 y 100'),
  french_credit_enabled: z.boolean(),
  smart_credit_enabled: z.boolean(),
}))

const { handleSubmit, resetForm, setValues } = useForm({ validationSchema: schema })

onMounted(async () => {
  const { data } = await supabase.from('currencies').select('id, code, name')
  currencies.value = (data as Currency[]) ?? []
})

watch(() => props.open, (open) => {
  if (open) {
    if (props.project) {
      setValues({
        name: props.project.name,
        description: props.project.description ?? '',
        location: props.project.location ?? '',
        currency_id: props.project.currency_id,
        annual_interest_rate: props.project.annual_interest_rate * 100,
        french_credit_enabled: props.project.french_credit_enabled,
        smart_credit_enabled: props.project.smart_credit_enabled,
      })
    }
    else {
      resetForm({
        values: {
          name: '',
          description: '',
          location: '',
          currency_id: '',
          annual_interest_rate: 8,
          french_credit_enabled: true,
          smart_credit_enabled: true,
        },
      })
    }
  }
})

const onSubmit = handleSubmit(async (values) => {
  submitting.value = true
  try {
    const payload = {
      ...values,
      description: values.description || null,
      location: values.location || null,
      annual_interest_rate: values.annual_interest_rate / 100,
    }
    if (props.project) {
      await projectsStore.update(props.project.id, payload)
      toast.success('Proyecto actualizado')
    }
    else {
      await projectsStore.create(payload)
      toast.success('Proyecto creado')
    }
    emit('update:open', false)
  }
  catch {
    toast.error('Error al guardar el proyecto')
  }
  finally {
    submitting.value = false
  }
})
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="overflow-y-auto">
      <SheetHeader>
        <SheetTitle>{{ project ? 'Editar proyecto' : 'Nuevo proyecto' }}</SheetTitle>
        <SheetDescription>
          {{ project ? 'Modificá los datos del proyecto' : 'Completá los datos para crear el proyecto' }}
        </SheetDescription>
      </SheetHeader>

      <form class="space-y-4 mt-6" @submit="onSubmit">
        <FormField v-slot="{ componentField }" name="name">
          <FormItem>
            <FormLabel>Nombre *</FormLabel>
            <FormControl>
              <Input placeholder="Ej: Torre Vitali Santiago" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="description">
          <FormItem>
            <FormLabel>Descripción</FormLabel>
            <FormControl>
              <Input placeholder="Descripción opcional" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="location">
          <FormItem>
            <FormLabel>Ubicación</FormLabel>
            <FormControl>
              <Input placeholder="Ej: Santiago, Chile" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="currency_id">
          <FormItem>
            <FormLabel>Moneda *</FormLabel>
            <Select v-bind="componentField">
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná la moneda" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem v-for="c in currencies" :key="c.id" :value="c.id">
                  {{ c.code }} — {{ c.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="annual_interest_rate">
          <FormItem>
            <FormLabel>Tasa de interés anual *</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="Ej: 8.5 (= 8.5% anual)"
                v-bind="componentField"
                :value="componentField.modelValue"
                @input="componentField['onUpdate:modelValue']?.(parseFloat(($event.target as HTMLInputElement).value))"
              />
            </FormControl>
            <p class="text-xs text-muted-foreground mt-1">
              Ingresá el valor como porcentaje. Por ejemplo, <strong>8.5</strong> equivale a 8.5% anual.
            </p>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ value, handleChange }" name="french_credit_enabled">
          <FormItem class="flex items-center justify-between rounded-lg border p-3">
            <FormLabel class="cursor-pointer">
              Crédito francés habilitado
            </FormLabel>
            <FormControl>
              <Switch :checked="value" @update:checked="handleChange" />
            </FormControl>
          </FormItem>
        </FormField>

        <FormField v-slot="{ value, handleChange }" name="smart_credit_enabled">
          <FormItem class="flex items-center justify-between rounded-lg border p-3">
            <FormLabel class="cursor-pointer">
              Crédito inteligente habilitado
            </FormLabel>
            <FormControl>
              <Switch :checked="value" @update:checked="handleChange" />
            </FormControl>
          </FormItem>
        </FormField>

        <div class="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" @click="emit('update:open', false)">
            Cancelar
          </Button>
          <Button type="submit" :disabled="submitting">
            {{ submitting ? 'Guardando...' : project ? 'Guardar cambios' : 'Crear proyecto' }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
