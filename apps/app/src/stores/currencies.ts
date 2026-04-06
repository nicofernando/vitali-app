import type { Currency, CurrencyInsert, CurrencyUpdate } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { extractErrorMessage } from '@/lib/utils'

export const useCurrenciesStore = defineStore('currencies', () => {
  const currencies = ref<Currency[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const { data, error: dbError } = await supabase
        .from('currencies')
        .select('id, code, name, symbol, decimal_places')
        .order('code')
      if (dbError)
        throw dbError
      currencies.value = data ?? []
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al cargar monedas')
    }
    finally {
      loading.value = false
    }
  }

  async function create(payload: CurrencyInsert) {
    const { data, error: dbError } = await supabase
      .from('currencies')
      .insert(payload)
      .select('id, code, name, symbol, decimal_places')
      .single()
    if (dbError)
      throw dbError
    currencies.value.unshift(data)
  }

  async function update(id: string, payload: CurrencyUpdate) {
    const { data, error: dbError } = await supabase
      .from('currencies')
      .update(payload)
      .eq('id', id)
      .select('id, code, name, symbol, decimal_places')
      .single()
    if (dbError)
      throw dbError
    const idx = currencies.value.findIndex(c => c.id === id)
    if (idx !== -1)
      currencies.value[idx] = data
  }

  async function remove(id: string) {
    const { error: dbError } = await supabase.from('currencies').delete().eq('id', id)
    if (dbError)
      throw dbError
    currencies.value = currencies.value.filter(c => c.id !== id)
  }

  return { currencies, loading, error, fetchAll, create, update, remove }
})
