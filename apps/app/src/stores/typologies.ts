import type { Typology, TypologyInsert, TypologyUpdate } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { extractErrorMessage } from '@/lib/utils'

const SELECT_FIELDS = 'id, name, surface_m2, description, created_at'

export const useTypologiesStore = defineStore('typologies', () => {
  const typologies = ref<Typology[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('typologies')
        .select(SELECT_FIELDS)
        .order('name', { ascending: true })
      if (err)
        throw err
      typologies.value = (data as Typology[]) ?? []
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al cargar tipologías')
    }
    finally {
      loading.value = false
    }
  }

  async function fetchByProject(projectId: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('project_typologies')
        .select(`typology:typologies(${SELECT_FIELDS})`)
        .eq('project_id', projectId)
      if (err)
        throw err
      typologies.value = (data?.map((r: { typology: Typology }) => r.typology) ?? []) as Typology[]
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al cargar tipologías del proyecto')
    }
    finally {
      loading.value = false
    }
  }

  async function create(payload: TypologyInsert) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('typologies')
        .insert(payload)
        .select(SELECT_FIELDS)
        .single()
      if (err)
        throw err
      typologies.value.unshift(data as Typology)
      return data as Typology
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al crear tipología')
      throw err
    }
    finally {
      loading.value = false
    }
  }

  async function update(id: string, payload: TypologyUpdate) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('typologies')
        .update(payload)
        .eq('id', id)
        .select(SELECT_FIELDS)
        .single()
      if (err)
        throw err
      const idx = typologies.value.findIndex(t => t.id === id)
      if (idx !== -1)
        typologies.value[idx] = data as Typology
      return data as Typology
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al actualizar tipología')
      throw err
    }
    finally {
      loading.value = false
    }
  }

  async function remove(id: string) {
    loading.value = true
    error.value = null
    try {
      const { error: err } = await supabase
        .from('typologies')
        .delete()
        .eq('id', id)
      if (err)
        throw err
      typologies.value = typologies.value.filter(t => t.id !== id)
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al eliminar tipología')
      throw err
    }
    finally {
      loading.value = false
    }
  }

  async function assignToProject(projectId: string, typologyId: string) {
    const { error: err } = await supabase
      .from('project_typologies')
      .insert({ project_id: projectId, typology_id: typologyId })
    if (err)
      throw err
  }

  async function removeFromProject(projectId: string, typologyId: string) {
    const { error: err } = await supabase
      .from('project_typologies')
      .delete()
      .eq('project_id', projectId)
      .eq('typology_id', typologyId)
    if (err)
      throw err
  }

  return {
    typologies,
    loading,
    error,
    fetchAll,
    fetchByProject,
    create,
    update,
    remove,
    assignToProject,
    removeFromProject,
  }
})
