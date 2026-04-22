import type { GeneratePdfResponse, QuoteInsert, QuoteSummary } from '@/types'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { supabase } from '@/lib/supabase'
import { extractErrorMessage } from '@/lib/utils'

export const useQuotesStore = defineStore('quotes', () => {
  const quotes = shallowRef<QuoteSummary[]>([])
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
    if (fnError) {
      if (fnError instanceof FunctionsHttpError) {
        const status = fnError.context.status
        let serverMsg = fnError.message
        try {
          const text = await fnError.context.text()
          if (text) {
            try {
              const body = JSON.parse(text)
              serverMsg = body.error ?? body.message ?? body.msg ?? text
            }
            catch {
              serverMsg = text
            }
          }
        }
        catch {}
        throw new Error(`generate-pdf [${status}]: ${serverMsg}`)
      }
      throw new Error(fnError.message)
    }
    if (!data || !data.url || !data.pdf_path)
      throw new Error('Respuesta inválida de generate-pdf')
    const result = data as GeneratePdfResponse
    const idx = quotes.value.findIndex(q => q.id === quoteId)
    if (idx !== -1)
      quotes.value = quotes.value.map((q, i) => i === idx ? { ...q, pdf_path: result.pdf_path } : q)
    return result
  }

  return { quotes, loading, error, fetchAll, create, generatePdf }
})
