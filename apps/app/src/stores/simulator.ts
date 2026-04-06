import type { CalculateQuoteRequest, CalculateQuoteResponse, Project, Tower, Unit } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { extractErrorMessage } from '@/lib/utils'

export const useSimulatorStore = defineStore('simulator', () => {
  const selectedProject = ref<Project | null>(null)
  const selectedTower = ref<Tower | null>(null)
  const selectedUnit = ref<Unit | null>(null)
  const result = ref<CalculateQuoteResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function calculate(request: CalculateQuoteRequest) {
    loading.value = true
    error.value = null
    result.value = null
    try {
      const { data, error: fnError } = await supabase.functions.invoke('calculate-quote', {
        body: request,
      })
      if (fnError)
        throw fnError
      result.value = data as CalculateQuoteResponse
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al calcular la cotización')
    }
    finally {
      loading.value = false
    }
  }

  function reset() {
    selectedProject.value = null
    selectedTower.value = null
    selectedUnit.value = null
    result.value = null
    error.value = null
  }

  return {
    selectedProject,
    selectedTower,
    selectedUnit,
    result,
    loading,
    error,
    calculate,
    reset,
  }
})
