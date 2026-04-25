<script setup lang="ts">
import type { DocumentTemplate } from '@/types'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import DocumentTestSheet from '@/components/documents/DocumentTestSheet.vue'
import DocumentUploadSheet from '@/components/documents/DocumentUploadSheet.vue'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { DATA_BLOCKS } from '@/lib/document-variables'
import { useDocumentTemplatesStore } from '@/stores/documentTemplates'

const store = useDocumentTemplatesStore()
const { templates, loading } = storeToRefs(store)

const showUpload = ref(false)
const testTarget = ref<DocumentTemplate | null>(null)
const pendingDelete = ref<DocumentTemplate | null>(null)

onMounted(() => store.fetchAll())

function labelFor(need: string): string {
  return DATA_BLOCKS.find(b => b.id === need)?.label ?? need
}

async function handleToggle(id: string) {
  await store.toggleActive(id)
  if (store.error)
    toast.error(store.error)
}

async function handleDelete() {
  if (!pendingDelete.value)
    return
  await store.remove(pendingDelete.value.id)
  if (store.error) {
    toast.error(store.error)
  }
  else {
    toast.success('Documento eliminado')
    pendingDelete.value = null
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-heading font-bold text-foreground">
          Documentos
        </h1>
        <p class="text-sm text-muted-foreground mt-1">
          Templates de documentos configurables con Carbone
        </p>
      </div>
      <Button @click="showUpload = true">
        Nuevo documento
      </Button>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Skeleton v-for="i in 3" :key="i" class="h-40" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="templates.length === 0"
      class="flex flex-col items-center justify-center py-20 gap-3 text-center"
    >
      <p class="text-muted-foreground text-sm">
        No hay documentos todavía
      </p>
      <Button variant="outline" @click="showUpload = true">
        Subir primer template
      </Button>
    </div>

    <!-- Grid de cards -->
    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card v-for="tpl in templates" :key="tpl.id" class="flex flex-col">
        <CardHeader class="pb-2">
          <div class="flex items-start justify-between gap-2">
            <CardTitle class="text-base leading-tight">
              {{ tpl.name }}
            </CardTitle>
            <Switch
              :checked="tpl.is_active"
              :title="tpl.is_active ? 'Desactivar' : 'Activar'"
              @update:checked="handleToggle(tpl.id)"
            />
          </div>
          <CardDescription class="text-xs" :class="{ italic: !tpl.description }">
            {{ tpl.description ?? 'Sin descripción' }}
          </CardDescription>
        </CardHeader>
        <CardContent class="flex-1 flex flex-col justify-between gap-4">
          <!-- Bloques de datos -->
          <div class="flex flex-wrap gap-1 min-h-[1.5rem]">
            <Badge
              v-for="need in tpl.context_needs"
              :key="need"
              variant="secondary"
              class="text-[10px]"
            >
              {{ labelFor(need) }}
            </Badge>
            <span v-if="tpl.context_needs.length === 0" class="text-xs text-muted-foreground italic">
              Sin bloques configurados
            </span>
          </div>
          <!-- Acciones -->
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              class="flex-1"
              :disabled="!tpl.is_active"
              @click="testTarget = tpl"
            >
              Probar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              @click="pendingDelete = tpl"
            >
              Eliminar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Sheet: subir nuevo template -->
    <DocumentUploadSheet
      :open="showUpload"
      @close="showUpload = false"
    />

    <!-- Sheet: probar template -->
    <DocumentTestSheet
      :template="testTarget"
      :open="!!testTarget"
      @close="testTarget = null"
    />

    <!-- Confirm delete -->
    <AlertDialog :open="!!pendingDelete">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
          <AlertDialogDescription>
            Vas a eliminar <strong>{{ pendingDelete?.name }}</strong>. El archivo .docx y los PDFs de prueba generados serán eliminados permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="pendingDelete = null">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="handleDelete"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
