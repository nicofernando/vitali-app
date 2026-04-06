<script setup lang="ts">
import type { Unit } from '@/types'
import { toTypedSchema } from '@vee-validate/zod'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { computed, onMounted, ref, watch } from 'vue'
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
  unit?: Unit | null
  decimalPlaces?: number
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const unitsStore = useUnitsStore()
const typologiesStore = useTypologiesStore()
const { typologies } = storeToRefs(typologiesStore)
const submitting = ref(false)

const isEditing = computed(() => !!props.unit)

const priceStep = computed(() => {
  const d = props.decimalPlaces ?? 2
  return d === 0 ? '1' : `0.${'0'.repeat(d - 1)}1`
})

const schema = toTypedSchema(z.object({
  unit_number: z.string().min(1, 'El número es requerido'),
  floor: z.number().int().nullable().optional(),
  typology_id: z.string().uuid('Seleccioná una tipología'),
  list_price: z.number().positive('El precio debe ser mayor a 0'),
}))

const { handleSubmit, resetForm } = useForm({ validationSchema: schema })

onMounted(() => typologiesStore.fetchAll())

watch(() => props.open, (open) => {
  if (open) {
    if (props.unit) {
      resetForm({
        values: {
          unit_number: props.unit.unit_number,
          floor: props.unit.floor ?? null,
          typology_id: props.unit.typology_id,
          list_price: props.unit.list_price,
        },
      })
    }
    else {
      resetForm({ values: { unit_number: '', floor: null, typology_id: '', list_price: 0 } })
    }
  }
})

const onSubmit = handleSubmit(async (values) => {
  submitting.value = true
  try {
    if (isEditing.value && props.unit) {
      await unitsStore.update(props.unit.id, values)
      toast.success('Departamento actualizado')
    }
    else {
      await unitsStore.create({
        tower_id: props.towerId,
        typology_id: values.typology_id,
        unit_number: values.unit_number,
        floor: values.floor ?? null,
        list_price: values.list_price,
      })
      toast.success('Departamento creado')
    }
    emit('update:open', false)
  }
  catch {
    toast.error(isEditing.value ? 'Error al actualizar el departamento' : 'Error al crear el departamento')
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
        <SheetTitle>{{ isEditing ? 'Editar departamento' : 'Nuevo departamento' }}</SheetTitle>
        <SheetDescription>{{ isEditing ? 'Modificá los datos del departamento' : 'Completá los datos del departamento' }}</SheetDescription>
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
                :step="priceStep"
                :placeholder="(props.decimalPlaces ?? 2) === 0 ? 'Ej: 5000000' : 'Ej: 2455.50'"
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
            {{ submitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear departamento' }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
