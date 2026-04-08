import type { GeneratePdfResponse, QuoteInsert, QuoteSummary } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { extractErrorMessage } from '@/lib/utils'

export const useQuotesStore = defineStore('quotes', () => {
  const quotes = ref<QuoteSummary[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const { data, error: dbError } = await supabase.rpc('get_quotes_with_details')
      if (dbError)
        throw dbError
      quotes.value = data ?? []
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al cargar cotizaciones')
    }
    finally {
      loading.value = false
    }
  }

  async function create(payload: QuoteInsert): Promise<string> {
    const { data, error: dbError } = await supabase
      .from('quotes')
      .insert(payload)
      .select('id')
      .single()
    if (dbError)
      throw dbError
    return data.id
  }

  async function generatePdf(quoteId: string): Promise<GeneratePdfResponse> {
    const { data, error: fnError } = await supabase.functions.invoke('generate-pdf', {
      body: { quote_id: quoteId },
    })
    if (fnError)
      throw new Error(fnError.message)
    const result = data as GeneratePdfResponse
    const idx = quotes.value.findIndex(q => q.id === quoteId)
    if (idx !== -1)
      quotes.value[idx].pdf_path = result.pdf_path
    return result
  }

  return { quotes, loading, error, fetchAll, create, generatePdf }
})
