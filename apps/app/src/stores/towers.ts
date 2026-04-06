import type { Tower, TowerInsert, TowerUpdate } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { extractErrorMessage } from '@/lib/utils'

const SELECT_FIELDS = 'id, project_id, name, description, delivery_date, max_financing_years, min_pie_percentage, created_at'

export const useTowersStore = defineStore('towers', () => {
  const towers = ref<Tower[]>([])
  const currentProjectId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchByProject(projectId: string) {
    loading.value = true
    error.value = null
    currentProjectId.value = projectId
    towers.value = []
    try {
      const { data, error: err } = await supabase
        .from('towers')
        .select(SELECT_FIELDS)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (err)
        throw err
      towers.value = (data as Tower[]) ?? []
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al cargar torres')
    }
    finally {
      loading.value = false
    }
  }

  async function create(payload: TowerInsert) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('towers')
        .insert(payload)
        .select(SELECT_FIELDS)
        .single()
      if (err)
        throw err
      towers.value.unshift(data as Tower)
      return data as Tower
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al crear torre')
      throw err
    }
    finally {
      loading.value = false
    }
  }

  async function update(id: string, payload: TowerUpdate) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('towers')
        .update(payload)
        .eq('id', id)
        .select(SELECT_FIELDS)
        .single()
      if (err)
        throw err
      const idx = towers.value.findIndex(t => t.id === id)
      if (idx !== -1)
        towers.value[idx] = data as Tower
      return data as Tower
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al actualizar torre')
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
        .from('towers')
        .delete()
        .eq('id', id)
      if (err)
        throw err
      towers.value = towers.value.filter(t => t.id !== id)
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al eliminar torre')
      throw err
    }
    finally {
      loading.value = false
    }
  }

  return { towers, currentProjectId, loading, error, fetchByProject, create, update, remove }
})
