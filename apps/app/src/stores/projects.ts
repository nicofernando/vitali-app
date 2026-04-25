import type { Project, ProjectInsert, ProjectUpdate } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { extractErrorMessage } from '@/lib/utils'

const SELECT_FIELDS = 'id, name, description, location, currency_id, annual_interest_rate, french_credit_enabled, smart_credit_enabled, created_at, currency:currencies(id, code, name, symbol, decimal_places)'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasFetched = ref(false)

  async function fetchAll() {
    if (hasFetched.value)
      return
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('projects')
        .select(SELECT_FIELDS)
        .order('created_at', { ascending: false })
      if (err)
        throw err
      projects.value = (data as unknown as Project[]) ?? []
      hasFetched.value = true
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al cargar proyectos')
    }
    finally {
      loading.value = false
    }
  }

  async function create(payload: ProjectInsert) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('projects')
        .insert(payload)
        .select(SELECT_FIELDS)
        .single()
      if (err)
        throw err
      projects.value.unshift(data as unknown as Project)
      return data as unknown as Project
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al crear proyecto')
      throw err
    }
    finally {
      loading.value = false
    }
  }

  async function update(id: string, payload: ProjectUpdate) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('projects')
        .update(payload)
        .eq('id', id)
        .select(SELECT_FIELDS)
        .single()
      if (err)
        throw err
      const idx = projects.value.findIndex(p => p.id === id)
      if (idx !== -1)
        projects.value[idx] = data as unknown as Project
      return data as unknown as Project
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al actualizar proyecto')
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
        .from('projects')
        .delete()
        .eq('id', id)
      if (err)
        throw err
      projects.value = projects.value.filter(p => p.id !== id)
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al eliminar proyecto')
      throw err
    }
    finally {
      loading.value = false
    }
  }

  return { projects, loading, error, hasFetched, fetchAll, create, update, remove }
})
