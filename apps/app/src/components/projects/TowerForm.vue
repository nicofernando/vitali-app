<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTowersStore } from '@/stores/towers'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { toast } from 'vue-sonner'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Tower } from '@/types'

const props = defineProps<{
  tower: Tower | null
  projectId: string
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const towersStore = useTowersStore()
const submitting = ref(false)

const schema = toTypedSchema(z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().nullable().optional(),
  delivery_date: z.string().nullable().optional(),
  max_financing_years: z.number().int().min(1, 'Debe ser al menos 1 año').max(50),
  min_pie_percentage: z.number().min(0).max(100, 'Debe estar entre 0 y 100'),
}))

const { handleSubmit, resetForm, setValues } = useForm({ validationSchema: schema })

watch(() => props.open, (open) => {
  if (open) {
    if (props.tower) {
      setValues({
        name: props.tower.name,
        description: props.tower.description ?? '',
        delivery_date: props.tower.delivery_date ?? '',
        max_financing_years: props.tower.max_financing_years,
        min_pie_percentage: props.tower.min_pie_percentage,
      })
    }
    else {
      resetForm({
        values: {
          name: '',
          description: '',
          delivery_date: '',
          max_financing_years: 20,
          min_pie_percentage: 20,
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
      project_id: props.projectId,
      description: values.description || null,
      delivery_date: values.delivery_date || null,
    }
    if (props.tower) {
      await towersStore.update(props.tower.id, payload)
      toast.success('Torre actualizada')
    }
    else {
      await towersStore.create(payload)
      toast.success('Torre creada')
    }
    emit('update:open', false)
  }
  catch {
    toast.error('Error al guardar la torre')
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
        <SheetTitle>{{ tower ? 'Editar torre' : 'Nueva torre' }}</SheetTitle>
        <SheetDescription>
          {{ tower ? 'Modificá los datos de la torre' : 'Completá los datos para crear la torre' }}
        </SheetDescription>
      </SheetHeader>

      <form class="space-y-4 mt-6" @submit="onSubmit">
        <FormField v-slot="{ componentField }" name="name">
          <FormItem>
            <FormLabel>Nombre *</FormLabel>
            <FormControl>
              <Input placeholder="Ej: Torre A" v-bind="componentField" />
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

        <FormField v-slot="{ componentField }" name="delivery_date">
          <FormItem>
            <FormLabel>Fecha de entrega</FormLabel>
            <FormControl>
              <Input type="date" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="max_financing_years">
          <FormItem>
            <FormLabel>Plazo máximo de financiamiento (años) *</FormLabel>
            <FormControl>
              <Input
                type="number"
                min="1"
                max="50"
                v-bind="componentField"
                :value="componentField.modelValue"
                @input="componentField['onUpdate:modelValue']?.(parseInt(($event.target as HTMLInputElement).value))"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="min_pie_percentage">
          <FormItem>
            <FormLabel>% mínimo de PIE *</FormLabel>
            <FormControl>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                v-bind="componentField"
                :value="componentField.modelValue"
                @input="componentField['onUpdate:modelValue']?.(parseFloat(($event.target as HTMLInputElement).value))"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <div class="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" @click="emit('update:open', false)">
            Cancelar
          </Button>
          <Button type="submit" :disabled="submitting">
            {{ submitting ? 'Guardando...' : tower ? 'Guardar cambios' : 'Crear torre' }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
