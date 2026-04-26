import type { GeneratePdfResponse, QuoteInsert, QuoteSummary } from '@/types'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { supabase } from '@/lib/supabase'
import { extractErrorMessage } from '@/lib/utils'

// Extracts the most informative error message from a FunctionsHttpError.
// The response body may be JSON with an `error`/`message` field, or plain text.
// Falls back to the SDK's own message if the body can't be read or parsed.
async function parseFunctionsHttpError(err: FunctionsHttpError): Promise<string> {
  try {
    const text = await err.context.text()
    if (text) {
      try {
        const body = JSON.parse(text)
        return body.error ?? body.message ?? body.msg ?? text
      }
      catch {
        return text
      }
    }
  }
  catch {}
  return err.message
}

export const useQuotesStore = defineStore('quotes', () => {
  const quotes = shallowRef<QuoteSummary[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasFetched = ref(false)

  async function fetchAll() {
    if (hasFetched.value)
      return
    loading.value = true
    error.value = null
    try {
      const { data, error: dbError } = await supabase.rpc('get_quotes_with_details')
      if (dbError)
        throw dbError
      quotes.value = data ?? []
      hasFetched.value = true
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
    hasFetched.value = false
    return data.id
  }

  async function downloadPdf(quoteId: string): Promise<string> {
    const quote = quotes.value.find(q => q.id === quoteId)
    if (quote?.pdf_path) {
      const { data, error: signError } = await supabase.storage
        .from('quotes')
        .createSignedUrl(quote.pdf_path, 3600)
      if (!signError && data?.signedUrl)
        return data.signedUrl
    }
    const result = await generatePdf(quoteId)
    return result.url
  }

  async function generatePdf(quoteId: string): Promise<GeneratePdfResponse> {
    const { data, error: fnError } = await supabase.functions.invoke('generate-pdf', {
      body: { quote_id: quoteId },
    })
    if (fnError) {
      if (fnError instanceof FunctionsHttpError) {
        const msg = await parseFunctionsHttpError(fnError)
        throw new Error(`generate-pdf [${fnError.context.status}]: ${msg}`)
      }
      throw new Error(fnError.message)
    }
    if (!data || !data.url || !data.pdf_path)
      throw new Error('Respuesta inválida de generate-pdf')
    const result = data as GeneratePdfResponse
    quotes.value = quotes.value.map(q => q.id === quoteId ? { ...q, pdf_path: result.pdf_path } : q)
    return result
  }

  return { quotes, loading, error, hasFetched, fetchAll, create, generatePdf, downloadPdf }
})
