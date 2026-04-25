<script setup lang="ts">
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { DATA_BLOCKS } from '@/lib/document-variables'
import { useDocumentTemplatesStore } from '@/stores/documentTemplates'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const store = useDocumentTemplatesStore()

const name = ref('')
const description = ref('')
const selectedNeeds = ref<string[]>([])
const file = ref<File | null>(null)
const fileError = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const submitting = ref(false)

watch(() => props.open, (open) => {
  if (!open)
    reset()
})

function onFileChange(e: Event) {
  fileError.value = ''
  const input = e.target as HTMLInputElement
  const picked = input.files?.[0]
  if (!picked)
    return
  if (!picked.name.endsWith('.docx')) {
    fileError.value = 'El archivo debe ser un .docx'
    file.value = null
    return
  }
  file.value = picked
}

function toggleNeed(id: string) {
  const idx = selectedNeeds.value.indexOf(id)
  if (idx === -1)
    selectedNeeds.value.push(id)
  else
    selectedNeeds.value.splice(idx, 1)
}

function reset() {
  name.value = ''
  description.value = ''
  selectedNeeds.value = []
  file.value = null
  fileError.value = ''
  if (fileInputRef.value)
    fileInputRef.value.value = ''
}

async function submit() {
  if (!name.value.trim()) {
    toast.error('El nombre es requerido')
    return
  }
  if (!file.value) {
    toast.error('Seleccioná un archivo .docx')
    return
  }

  submitting.value = true
  const result = await store.create({
    name: name.value,
    description: description.value || null,
    context_needs: selectedNeeds.value,
    file: file.value,
  })
  submitting.value = false

  if (result) {
    toast.success('Documento creado')
    reset()
    emit('close')
  }
  else {
    toast.error(store.error ?? 'Error al guardar el documento')
  }
}

function handleOpenChange(open: boolean) {
  if (!open)
    emit('close')
}
</script>

<template>
  <Sheet :open="props.open" @update:open="handleOpenChange">
    <SheetContent class="sm:max-w-md overflow-y-auto">
      <SheetHeader>
        <SheetTitle>Nuevo documento</SheetTitle>
        <SheetDescription>
          Subí un template .docx y configurá qué bloques de datos usa.
        </SheetDescription>
      </SheetHeader>

      <form class="mt-6 space-y-5" @submit.prevent="submit">
        <!-- Nombre -->
        <div class="space-y-1.5">
          <Label for="doc-name">Nombre *</Label>
          <Input
            id="doc-name"
            v-model="name"
            placeholder="Ej: Cotización estándar"
          />
        </div>

        <!-- Descripción -->
        <div class="space-y-1.5">
          <Label for="doc-desc">Descripción</Label>
          <Input
            id="doc-desc"
            v-model="description"
            placeholder="Descripción opcional del template"
          />
        </div>

        <!-- Bloques de datos -->
        <div class="space-y-2">
          <Label>Bloques de datos</Label>
          <p class="text-xs text-muted-foreground">
            Seleccioná los datos que usa este template. Determinan qué información se pedirá al probarlo.
          </p>
          <div class="mt-1 space-y-2">
            <label
              v-for="block in DATA_BLOCKS"
              :key="block.id"
              class="flex items-center gap-2.5 cursor-pointer"
            >
              <input
                type="checkbox"
                :checked="selectedNeeds.includes(block.id)"
                class="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                @change="toggleNeed(block.id)"
              >
              <span class="text-sm">{{ block.label }}</span>
            </label>
          </div>
        </div>

        <!-- Archivo .docx -->
        <div class="space-y-1.5">
          <Label>Archivo .docx *</Label>
          <div class="flex items-center gap-3">
            <input
              ref="fileInputRef"
              type="file"
              accept=".docx"
              class="hidden"
              @change="onFileChange"
            >
            <Button
              type="button"
              variant="outline"
              size="sm"
              @click="fileInputRef?.click()"
            >
              {{ file ? 'Cambiar archivo' : 'Seleccionar archivo' }}
            </Button>
            <span class="text-sm text-muted-foreground truncate max-w-[160px]">
              {{ file?.name ?? 'Ningún archivo seleccionado' }}
            </span>
          </div>
          <p v-if="fileError" class="text-xs text-destructive">
            {{ fileError }}
          </p>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="handleOpenChange(false)">
            Cancelar
          </Button>
          <Button type="submit" :disabled="submitting">
            {{ submitting ? 'Guardando...' : 'Crear documento' }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
