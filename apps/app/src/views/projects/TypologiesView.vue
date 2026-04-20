<script setup lang="ts">
import type { Typology } from '@/types'
import { toTypedSchema } from '@vee-validate/zod'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTypologiesStore } from '@/stores/typologies'

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

const pendingDeleteTypology = ref<Typology | null>(null)

function deleteTypology(typology: Typology) {
  pendingDeleteTypology.value = typology
}

async function confirmDeleteTypology() {
  const typology = pendingDeleteTypology.value
  pendingDeleteTypology.value = null
  if (!typology)
    return
  try {
    await typologiesStore.remove(typology.id)
    toast.success('Tipología eliminada')
  }
  catch {
    toast.error('No se puede eliminar — la tipología está siendo usada por departamentos')
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
  <div class="p-4 md:p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-heading font-bold text-foreground">
          Tipologías
        </h1>
        <p class="text-sm text-muted-foreground mt-1">
          Catálogo global de tipos de departamento
        </p>
      </div>
      <Button @click="openNew">
        + Nueva tipología
      </Button>
    </div>

    <div class="rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Superficie (m²)</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead class="text-right">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="loading">
            <TableRow v-for="i in 3" :key="i">
              <TableCell colspan="4">
                <Skeleton class="h-4 w-full" />
              </TableCell>
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
              <TableCell class="font-medium">
                {{ typology.name }}
              </TableCell>
              <TableCell>{{ Number(typology.surface_m2).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</TableCell>
              <TableCell>{{ typology.description ?? '—' }}</TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-2">
                  <Button size="sm" variant="outline" @click="openEdit(typology)">
                    Editar
                  </Button>
                  <Button size="sm" variant="destructive" @click="deleteTypology(typology)">
                    Eliminar
                  </Button>
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
                  step="0.01"
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
            <Button type="button" variant="outline" @click="showForm = false">
              Cancelar
            </Button>
            <Button type="submit" :disabled="submitting">
              {{ submitting ? 'Guardando...' : editingTypology ? 'Guardar cambios' : 'Crear tipología' }}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>

    <!-- Confirmación de eliminación -->
    <AlertDialog :open="!!pendingDeleteTypology" @update:open="(v) => { if (!v) pendingDeleteTypology = null }">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar tipología?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará "{{ pendingDeleteTypology?.name }}". Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="pendingDeleteTypology = null">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="confirmDeleteTypology"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
