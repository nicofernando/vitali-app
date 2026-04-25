<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/composables/usePermissions'
import { getBlocksForDocumentType } from '@/lib/document-variables'
import { supabase } from '@/lib/supabase'

const { can } = usePermissions()
const uploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const documentBlocks = getBlocksForDocumentType('cotizacion')

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return

  if (!can('settings.templates.write')) {
    toast.error('No tenés permisos para actualizar el template')
    return
  }

  if (!file.name.endsWith('.docx')) {
    toast.error('El archivo debe ser un .docx')
    return
  }

  uploading.value = true
  try {
    const { error } = await supabase.storage
      .from('templates')
      .upload('cotizacion.docx', file, { upsert: true })

    if (error)
      throw error
    toast.success('Template actualizado correctamente')
  }
  catch {
    toast.error('Error al subir el template')
  }
  finally {
    uploading.value = false
    if (fileInputRef.value)
      fileInputRef.value.value = ''
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-heading font-bold text-foreground">
        Configuración
      </h1>
      <p class="text-sm text-muted-foreground mt-1">
        Ajustes del sistema
      </p>
    </div>

    <Tabs default-value="documentos">
      <TabsList>
        <TabsTrigger value="documentos">
          Documentos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="documentos" class="space-y-6 mt-4">
        <!-- Upload template -->
        <Card>
          <CardHeader>
            <CardTitle class="text-base">
              Template de cotización
            </CardTitle>
            <CardDescription>
              Subí una nueva versión del archivo .docx usado para generar las cotizaciones en PDF.
              Las variables deben seguir la sintaxis Carbone: <code class="text-xs bg-muted px-1 rounded">{d.variable}</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="flex items-center gap-4">
              <input
                ref="fileInputRef"
                type="file"
                accept=".docx"
                class="hidden"
                @change="handleUpload"
              >
              <Button
                variant="outline"
                :disabled="uploading || !can('settings.templates.write')"
                @click="fileInputRef?.click()"
              >
                {{ uploading ? 'Subiendo...' : 'Subir nuevo template (.docx)' }}
              </Button>
              <p class="text-sm text-muted-foreground">
                Archivo actual: <code class="text-xs">cotizacion.docx</code>
              </p>
            </div>
          </CardContent>
        </Card>

        <!-- Tabla de variables -->
        <Card>
          <CardHeader>
            <CardTitle class="text-base">
              Variables disponibles
            </CardTitle>
            <CardDescription>
              Usá estas variables en el .docx con la sintaxis <code class="text-xs bg-muted px-1 rounded">{d.variable}</code>
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <div v-for="block in documentBlocks" :key="block.id">
              <h3 class="text-sm font-semibold mb-2">
                {{ block.label }}
              </h3>
              <Table>
                <TableHeader>
                  <TableRow class="bg-muted/60 hover:bg-muted/60 border-b-2">
                    <TableHead class="font-semibold text-foreground">
                      Variable
                    </TableHead>
                    <TableHead class="font-semibold text-foreground">
                      Descripción
                    </TableHead>
                    <TableHead class="font-semibold text-foreground">
                      Ejemplo
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="variable in block.variables" :key="variable.key">
                    <TableCell>
                      <code class="text-xs bg-muted px-1.5 py-0.5 rounded">{{ variable.key }}</code>
                    </TableCell>
                    <TableCell class="text-sm">
                      {{ variable.label }}
                    </TableCell>
                    <TableCell class="text-sm text-muted-foreground">
                      {{ variable.example }}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>
