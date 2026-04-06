import type { Unit, UnitInsert, UnitUpdate } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { extractErrorMessage } from '@/lib/utils'

const SELECT_FIELDS = 'id, tower_id, typology_id, unit_number, floor, list_price, created_at, typology:typologies(id, name, surface_m2)'

export const useUnitsStore = defineStore('units', () => {
  const units = ref<Unit[]>([])
  const currentTowerId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchByTower(towerId: string) {
    loading.value = true
    error.value = null
    currentTowerId.value = towerId
    units.value = []
    try {
      const { data, error: err } = await supabase
        .from('units')
        .select(SELECT_FIELDS)
        .eq('tower_id', towerId)
        .order('floor', { ascending: true })
        .order('unit_number', { ascending: true })
      if (err)
        throw err
      units.value = (data as Unit[]) ?? []
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al cargar departamentos')
    }
    finally {
      loading.value = false
    }
  }

  async function create(payload: UnitInsert) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('units')
        .insert(payload)
        .select(SELECT_FIELDS)
        .single()
      if (err)
        throw err
      units.value.unshift(data as Unit)
      return data as Unit
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al crear departamento')
      throw err
    }
    finally {
      loading.value = false
    }
  }

  async function update(id: string, payload: UnitUpdate) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('units')
        .update(payload)
        .eq('id', id)
        .select(SELECT_FIELDS)
        .single()
      if (err)
        throw err
      const idx = units.value.findIndex(u => u.id === id)
      if (idx !== -1)
        units.value[idx] = data as Unit
      return data as Unit
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al actualizar departamento')
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
        .from('units')
        .delete()
        .eq('id', id)
      if (err)
        throw err
      units.value = units.value.filter(u => u.id !== id)
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al eliminar departamento')
      throw err
    }
    finally {
      loading.value = false
    }
  }

  return { units, currentTowerId, loading, error, fetchByTower, create, update, remove }
})
