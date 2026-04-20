import type { CalculateQuoteRequest, CalculateQuoteResponse } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { extractErrorMessage } from '@/lib/utils'

export const useSimulatorStore = defineStore('simulator', () => {
  // Form state — persists across navigation
  const selectedProjectId = ref<string>('')
  const selectedTowerId = ref<string>('')
  const selectedUnitId = ref<string>('')
  const piePercentage = ref<number>(20)
  const termYears = ref<number>(20)
  const creditType = ref<'french' | 'smart' | 'both'>('both')
  const smartCuotasPercentage = ref<number>(30)

  // Calculation state
  const result = ref<CalculateQuoteResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function calculate(request: CalculateQuoteRequest) {
    loading.value = true
    error.value = null
    result.value = null
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data, error: fnError } = await supabase.functions.invoke('calculate-quote', {
        body: request,
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
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

  /** Limpia solo el resultado (al cambiar selección en cascada) */
  function clearResult() {
    result.value = null
    error.value = null
  }

  /** Reseteo completo — nueva simulación */
  function reset() {
    selectedProjectId.value = ''
    selectedTowerId.value = ''
    selectedUnitId.value = ''
    piePercentage.value = 20
    termYears.value = 20
    creditType.value = 'both'
    smartCuotasPercentage.value = 30
    result.value = null
    error.value = null
  }

  return {
    selectedProjectId,
    selectedTowerId,
    selectedUnitId,
    piePercentage,
    termYears,
    creditType,
    smartCuotasPercentage,
    result,
    loading,
    error,
    calculate,
    clearResult,
    reset,
  }
})
