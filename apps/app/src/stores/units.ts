import type { Unit, UnitInsert, UnitUpdate, UnitWithContext } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { extractErrorMessage } from '@/lib/utils'

const SELECT_FIELDS = 'id, tower_id, typology_id, unit_number, floor, list_price, created_at, typology:typologies(id, name, surface_m2)'
const SELECT_ALL_FIELDS = 'id, tower_id, typology_id, unit_number, floor, list_price, created_at, typology:typologies(id, name, surface_m2), tower:towers(id, name, delivery_date, min_pie_percentage, max_financing_years, project:projects(id, name, currency:currencies(id, code, symbol, decimal_places)))'

export const useUnitsStore = defineStore('units', () => {
  const units = ref<Unit[]>([])
  const allUnits = ref<UnitWithContext[]>([])
  const allUnitsDirty = ref(false)
  const currentTowerId = ref<string | null>(null)
  const loading = ref(false)
  const loadingAll = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    allUnitsDirty.value = false
    loadingAll.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('units')
        .select(SELECT_ALL_FIELDS)
        .order('floor', { ascending: true })
        .order('unit_number', { ascending: true })
      if (err)
        throw err
      allUnits.value = (data as unknown as UnitWithContext[]) ?? []
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al cargar el stock')
    }
    finally {
      loadingAll.value = false
    }
  }

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
      units.value = (data as unknown as Unit[]) ?? []
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al cargar departamentos')
    }
    finally {
      loading.value = false
    }
  }

  function clearUnits() {
    units.value = []
    currentTowerId.value = null
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
      units.value.unshift(data as unknown as Unit)
      // Mark allUnits stale so StockView re-fetches on next mount
      allUnitsDirty.value = true
      return data as unknown as Unit
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
        units.value[idx] = data as unknown as Unit
      // Mark allUnits stale so StockView re-fetches on next mount
      allUnitsDirty.value = true
      return data as unknown as Unit
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
      allUnits.value = allUnits.value.filter(u => u.id !== id)
      allUnitsDirty.value = true
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al eliminar departamento')
      throw err
    }
    finally {
      loading.value = false
    }
  }

  return { units, allUnits, allUnitsDirty, currentTowerId, loading, loadingAll, error, fetchAll, fetchByTower, clearUnits, create, update, remove }
})
