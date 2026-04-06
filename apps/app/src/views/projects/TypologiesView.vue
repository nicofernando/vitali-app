<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useTypologiesStore } from '@/stores/typologies'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { Typology } from '@/types'

const typologiesStore = useTypologiesStore()
const { typologies, loading } = storeToRefs(typologiesStore)

const showForm = ref(false)
const editingTypology = ref<Typology | null>(null)
const submitting = ref(false)

const schema = toTypedSchema(z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  surface_m2: z.number().positive('La superficie debe ser mayor a 0'),
  description: z.string().nullable().optional(),
}))

const { handleSubmit, resetForm, setValues } = useForm({ validationSchema: schema })

onMounted(() => typologiesStore.fetchAll())

function openNew() {
  editingTypology.value = null
  resetForm({ values: { name: '', surface_m2: 0, description: '' } })
  showForm.value = true
}

function openEdit(typology: Typology) {
  editingTypology.value = typology
  setValues({ name: typology.name, surface_m2: typology.surface_m2, description: typology.description ?? '' })
  showForm.value = true
}

async function deleteTypology(typology: Typology) {
  if (!confirm(`¿Eliminar tipología "${typology.name}"?`)) return
  try {
    await typologiesStore.remove(typology.id)
    toast.success('Tipología eliminada')
  }
  catch {
    toast.error('Error al eliminar la tipología')
  }
}

const onSubmit = handleSubmit(async (values) => {
  submitting.value = true
  try {
    const payload = { ...values, description: values.description || null }
    if (editingTypology.value) {
      await typologiesStore.update(editingTypology.value.id, payload)
      toast.success('Tipología actualizada')
    }
    else {
      await typologiesStore.create(payload)
      toast.success('Tipología creada')
    }
    showForm.value = false
  }
  catch {
    toast.error('Error al guardar la tipología')
  }
  finally {
    submitting.value = false
  }
})
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-heading font-bold text-foreground">Tipologías</h1>
        <p class="text-sm text-muted-foreground mt-1">Catálogo global de tipos de departamento</p>
      </div>
      <Button @click="openNew">+ Nueva tipología</Button>
    </div>

    <div class="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Superficie (m²)</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead class="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="loading">
            <TableRow v-for="i in 3" :key="i">
              <TableCell colspan="4"><Skeleton class="h-4 w-full" /></TableCell>
            </TableRow>
          </template>
          <template v-else-if="typologies.length === 0">
            <TableRow>
              <TableCell colspan="4" class="text-center text-muted-foreground py-8">
                Sin tipologías. Creá la primera.
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow v-for="typology in typologies" :key="typology.id">
              <TableCell class="font-medium">{{ typology.name }}</TableCell>
              <TableCell>{{ typology.surface_m2 }}</TableCell>
              <TableCell>{{ typology.description ?? '—' }}</TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-2">
                  <Button size="sm" variant="outline" @click="openEdit(typology)">Editar</Button>
                  <Button size="sm" variant="destructive" @click="deleteTypology(typology)">Eliminar</Button>
                </div>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>

    <!-- Sheet form -->
    <Sheet v-model:open="showForm">
      <SheetContent class="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{{ editingTypology ? 'Editar tipología' : 'Nueva tipología' }}</SheetTitle>
          <SheetDescription>
            {{ editingTypology ? 'Modificá los datos de la tipología' : 'Completá los datos para crear la tipología' }}
          </SheetDescription>
        </SheetHeader>

        <form class="space-y-4 mt-6" @submit="onSubmit">
          <FormField v-slot="{ componentField }" name="name">
            <FormItem>
              <FormLabel>Nombre *</FormLabel>
              <FormControl>
                <Input placeholder="Ej: 2 Dormitorios" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="surface_m2">
            <FormItem>
              <FormLabel>Superficie (m²) *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  step="0.5"
                  placeholder="Ej: 65"
                  v-bind="componentField"
                  :value="componentField.modelValue"
                  @input="componentField['onUpdate:modelValue']?.(parseFloat(($event.target as HTMLInputElement).value))"
                />
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

          <div class="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" @click="showForm = false">Cancelar</Button>
            <Button type="submit" :disabled="submitting">
              {{ submitting ? 'Guardando...' : editingTypology ? 'Guardar cambios' : 'Crear tipología' }}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  </div>
</template>
