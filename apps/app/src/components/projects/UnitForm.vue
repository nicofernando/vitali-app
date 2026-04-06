<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { storeToRefs } from 'pinia'
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
import { useTypologiesStore } from '@/stores/typologies'
import { useUnitsStore } from '@/stores/units'

const props = defineProps<{
  towerId: string
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const unitsStore = useUnitsStore()
const typologiesStore = useTypologiesStore()
const { typologies } = storeToRefs(typologiesStore)
const submitting = ref(false)

onMounted(() => typologiesStore.fetchAll())

const schema = toTypedSchema(z.object({
  unit_number: z.string().min(1, 'El número es requerido'),
  floor: z.number().int().nullable().optional(),
  typology_id: z.string().uuid('Seleccioná una tipología'),
  list_price: z.number().positive('El precio debe ser mayor a 0'),
}))

const { handleSubmit, resetForm } = useForm({ validationSchema: schema })

watch(() => props.open, (open) => {
  if (open) {
    resetForm({
      values: { unit_number: '', floor: null, typology_id: '', list_price: 0 },
    })
  }
})

const onSubmit = handleSubmit(async (values) => {
  submitting.value = true
  try {
    await unitsStore.create({
      tower_id: props.towerId,
      typology_id: values.typology_id,
      unit_number: values.unit_number,
      floor: values.floor ?? null,
      list_price: values.list_price,
    })
    toast.success('Departamento creado')
    emit('update:open', false)
  }
  catch {
    toast.error('Error al crear el departamento')
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
        <SheetTitle>Nuevo departamento</SheetTitle>
        <SheetDescription>Completá los datos del departamento</SheetDescription>
      </SheetHeader>

      <form class="space-y-4 mt-6" @submit="onSubmit">
        <FormField v-slot="{ componentField }" name="unit_number">
          <FormItem>
            <FormLabel>Número de departamento *</FormLabel>
            <FormControl>
              <Input placeholder="Ej: 101" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="floor">
          <FormItem>
            <FormLabel>Piso</FormLabel>
            <FormControl>
              <Input
                type="number"
                min="1"
                placeholder="Ej: 1"
                v-bind="componentField"
                :value="componentField.modelValue ?? ''"
                @input="componentField['onUpdate:modelValue']?.(parseInt(($event.target as HTMLInputElement).value) || null)"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="typology_id">
          <FormItem>
            <FormLabel>Tipología *</FormLabel>
            <Select v-bind="componentField">
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná la tipología" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem v-for="t in typologies" :key="t.id" :value="t.id">
                  {{ t.name }} — {{ t.surface_m2 }} m²
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="list_price">
          <FormItem>
            <FormLabel>Precio de lista *</FormLabel>
            <FormControl>
              <Input
                type="number"
                min="0"
                step="1000"
                placeholder="Ej: 5000000"
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
            {{ submitting ? 'Guardando...' : 'Crear departamento' }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
