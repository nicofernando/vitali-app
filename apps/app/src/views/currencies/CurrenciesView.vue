<script setup lang="ts">
import type { Currency } from '@/types'
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
import { useCurrenciesStore } from '@/stores/currencies'

const currenciesStore = useCurrenciesStore()
const { currencies, loading } = storeToRefs(currenciesStore)

const showForm = ref(false)
const editingCurrency = ref<Currency | null>(null)
const pendingDelete = ref<Currency | null>(null)
const submitting = ref(false)

const schema = toTypedSchema(z.object({
  code: z.string().min(1).max(10, 'Máx. 10 caracteres').transform(v => v.toUpperCase()),
  name: z.string().min(1, 'El nombre es requerido'),
  symbol: z.string().min(1, 'El símbolo es requerido').max(5),
  decimal_places: z.number().int().min(0).max(8),
}))

const { handleSubmit, resetForm, setValues } = useForm({ validationSchema: schema })

onMounted(() => currenciesStore.fetchAll())

function openNew() {
  editingCurrency.value = null
  resetForm({ values: { code: '', name: '', symbol: '', decimal_places: 2 } })
  showForm.value = true
}

function openEdit(currency: Currency) {
  editingCurrency.value = currency
  setValues({
    code: currency.code,
    name: currency.name,
    symbol: currency.symbol,
    decimal_places: currency.decimal_places,
  })
  showForm.value = true
}

const onSubmit = handleSubmit(async (values) => {
  submitting.value = true
  try {
    if (editingCurrency.value) {
      await currenciesStore.update(editingCurrency.value.id, values)
      toast.success('Moneda actualizada')
    }
    else {
      await currenciesStore.create(values)
      toast.success('Moneda creada')
    }
    showForm.value = false
  }
  catch {
    toast.error('Error al guardar la moneda')
  }
  finally {
    submitting.value = false
  }
})

async function confirmDelete() {
  const pending = pendingDelete.value
  pendingDelete.value = null
  if (!pending)
    return
  try {
    await currenciesStore.remove(pending.id)
    toast.success('Moneda eliminada')
  }
  catch {
    toast.error('No se puede eliminar — puede estar en uso por algún proyecto')
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-heading font-bold text-foreground">
          Monedas
        </h1>
        <p class="text-sm text-muted-foreground mt-1">
          Divisas disponibles para los proyectos
        </p>
      </div>
      <Button @click="openNew">
        + Nueva moneda
      </Button>
    </div>

    <div class="rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/60 hover:bg-muted/60 border-b-2">
            <TableHead class="font-semibold text-foreground">
              Código
            </TableHead>
            <TableHead class="font-semibold text-foreground">
              Nombre
            </TableHead>
            <TableHead class="font-semibold text-foreground">
              Símbolo
            </TableHead>
            <TableHead class="font-semibold text-foreground">
              Decimales
            </TableHead>
            <TableHead class="text-right font-semibold text-foreground">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="loading">
            <TableRow v-for="i in 4" :key="i">
              <TableCell colspan="5">
                <Skeleton class="h-4 w-full" />
              </TableCell>
            </TableRow>
          </template>
          <template v-else-if="currencies.length === 0">
            <TableRow>
              <TableCell colspan="5" class="text-center text-muted-foreground py-8">
                Sin monedas. Creá la primera.
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow v-for="currency in currencies" :key="currency.id">
              <TableCell class="font-mono font-semibold">
                {{ currency.code }}
              </TableCell>
              <TableCell>{{ currency.name }}</TableCell>
              <TableCell class="font-mono">
                {{ currency.symbol }}
              </TableCell>
              <TableCell>{{ currency.decimal_places }}</TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-2">
                  <Button size="sm" variant="outline" @click="openEdit(currency)">
                    Editar
                  </Button>
                  <Button size="sm" variant="destructive" @click="pendingDelete = currency">
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
          <SheetTitle>{{ editingCurrency ? 'Editar moneda' : 'Nueva moneda' }}</SheetTitle>
          <SheetDescription>
            {{ editingCurrency ? 'Modificá los datos de la moneda' : 'Completá los datos para crear la moneda' }}
          </SheetDescription>
        </SheetHeader>

        <form class="space-y-4 mt-6" @submit="onSubmit">
          <FormField v-slot="{ componentField }" name="code">
            <FormItem>
              <FormLabel>Código * <span class="text-muted-foreground text-xs">(ej: USD, CLP)</span></FormLabel>
              <FormControl>
                <Input placeholder="USD" class="uppercase" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="name">
            <FormItem>
              <FormLabel>Nombre *</FormLabel>
              <FormControl>
                <Input placeholder="Dólar estadounidense" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="symbol">
            <FormItem>
              <FormLabel>Símbolo * <span class="text-muted-foreground text-xs">(ej: $, US$, €)</span></FormLabel>
              <FormControl>
                <Input placeholder="$" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="decimal_places">
            <FormItem>
              <FormLabel>Decimales * <span class="text-muted-foreground text-xs">(0 para CLP, 2 para USD)</span></FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="8"
                  step="1"
                  v-bind="componentField"
                  :value="componentField.modelValue"
                  @input="componentField['onUpdate:modelValue']?.(parseInt(($event.target as HTMLInputElement).value))"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <div class="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" @click="showForm = false">
              Cancelar
            </Button>
            <Button type="submit" :disabled="submitting">
              {{ submitting ? 'Guardando...' : editingCurrency ? 'Guardar cambios' : 'Crear moneda' }}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>

    <!-- Confirmación eliminación -->
    <AlertDialog :open="!!pendingDelete">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar moneda?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará "{{ pendingDelete?.code }} — {{ pendingDelete?.name }}".
            Si algún proyecto la usa, la operación fallará.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="pendingDelete = null">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="confirmDelete"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
