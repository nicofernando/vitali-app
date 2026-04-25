import type { DocumentTemplate, DocumentTemplateInsert, GenerateDocumentResponse } from '@/types'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { extractErrorMessage } from '@/lib/utils'

export const useDocumentTemplatesStore = defineStore('documentTemplates', () => {
  const templates = ref<DocumentTemplate[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasFetched = ref(false)

  async function fetchAll(): Promise<void> {
    if (hasFetched.value)
      return
    loading.value = true
    error.value = null
    try {
      const { data, error: dbError } = await supabase
        .from('document_templates')
        .select('*')
        .order('created_at', { ascending: false })
      if (dbError)
        throw dbError
      templates.value = (data as DocumentTemplate[]) ?? []
      hasFetched.value = true
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al cargar los documentos')
    }
    finally {
      loading.value = false
    }
  }

  async function create(payload: {
    name: string
    description: string | null
    context_needs: string[]
    file: File
  }): Promise<DocumentTemplate | null> {
    error.value = null
    const templateId = crypto.randomUUID()
    const storagePath = `templates/${templateId}.docx`

    try {
      const { error: storageError } = await supabase.storage
        .from('templates')
        .upload(storagePath, payload.file, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })
      if (storageError)
        throw storageError

      const insert: DocumentTemplateInsert & { id: string } = {
        id: templateId,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        storage_path: storagePath,
        context_needs: payload.context_needs as DocumentTemplate['context_needs'],
        is_active: true,
        version: 1,
      }

      const { data, error: dbError } = await supabase
        .from('document_templates')
        .insert(insert)
        .select('*')
        .single()
      if (dbError)
        throw dbError

      hasFetched.value = false
      await fetchAll()
      return data as DocumentTemplate
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al guardar el documento')
      return null
    }
  }

  async function toggleActive(id: string): Promise<void> {
    const template = templates.value.find(t => t.id === id)
    if (!template)
      return
    error.value = null
    const { error: dbError } = await supabase
      .from('document_templates')
      .update({ is_active: !template.is_active })
      .eq('id', id)
    if (dbError) {
      error.value = extractErrorMessage(dbError, 'Error al actualizar el documento')
      return
    }
    template.is_active = !template.is_active
  }

  async function remove(id: string): Promise<void> {
    const template = templates.value.find(t => t.id === id)
    error.value = null
    try {
      if (template) {
        await supabase.storage.from('templates').remove([template.storage_path])
      }
      const { error: dbError } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', id)
      if (dbError)
        throw dbError
      templates.value = templates.value.filter(t => t.id !== id)
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al eliminar el documento')
    }
  }

  async function generateTest(
    templateId: string,
    context: { quote_id?: string, unit_id?: string, client_id?: string },
  ): Promise<string | null> {
    error.value = null
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-document', {
        body: { template_id: templateId, context },
      })
      if (fnError) {
        if (fnError instanceof FunctionsHttpError) {
          const body = await fnError.context.json().catch(() => ({ error: fnError.message }))
          throw new Error(body?.error ?? fnError.message)
        }
        throw fnError
      }
      return (data as GenerateDocumentResponse).url
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al generar el PDF de prueba')
      return null
    }
  }

  return {
    templates,
    loading,
    error,
    hasFetched,
    fetchAll,
    create,
    toggleActive,
    remove,
    generateTest,
  }
})
