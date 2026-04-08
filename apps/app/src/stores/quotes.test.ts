import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuotesStore } from './quotes'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}))

const fakeQuote = {
  id: 'q1',
  status: 'draft' as const,
  credit_type: 'french' as const,
  pie_percentage: 20,
  pie_amount: 24000000,
  financing_amount: 96000000,
  term_years: 20,
  monthly_payment: 800000,
  balloon_payment: null,
  smart_cuotas_percentage: null,
  pdf_path: null,
  created_at: '2026-04-07T00:00:00Z',
  created_by: 'u1',
  client_id: 'cl1',
  client_name: 'Juan Pérez',
  client_rut: '12.345.678-9',
  unit_id: 'un1',
  unit_number: '305',
  floor: 3,
  list_price: 120000000,
  tower_id: 't1',
  tower_name: 'Torre A',
  project_id: 'p1',
  project_name: 'Vitali Las Condes',
  currency_symbol: '$',
}

const fakeInsertPayload = {
  client_id: 'cl1',
  unit_id: 'un1',
  pie_percentage: 20,
  pie_amount: 24000000,
  financing_amount: 96000000,
  credit_type: 'french' as const,
  term_years: 20,
  monthly_rate: 0.006434,
  monthly_payment: 800000,
  balloon_payment: null,
  smart_cuotas_percentage: null,
  quote_data_snapshot: { version: 1 },
}

describe('useQuotesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── Estado inicial ───────────────────────────────────────────
  it('inicia con lista vacía, sin loading ni error', () => {
    const store = useQuotesStore()
    expect(store.quotes).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  // ── fetchAll ─────────────────────────────────────────────────
  it('fetchAll: carga cotizaciones via RPC get_quotes_with_details', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [fakeQuote], error: null } as any)

    const store = useQuotesStore()
    await store.fetchAll()

    expect(supabase.rpc).toHaveBeenCalledWith('get_quotes_with_details')
    expect(store.quotes).toEqual([fakeQuote])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchAll: si falla, guarda error y lista queda vacía', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'DB error' } } as any)

    const store = useQuotesStore()
    await store.fetchAll()

    expect(store.quotes).toEqual([])
    expect(store.error).toBe('DB error')
    expect(store.loading).toBe(false)
  })

  // ── create ───────────────────────────────────────────────────
  it('create: inserta en DB y retorna el id de la cotización creada', async () => {
    const { supabase } = await import('@/lib/supabase')
    const created = { id: 'q2', ...fakeInsertPayload, status: 'draft', pdf_path: null, created_at: '2026-04-07T00:00:00Z', created_by: 'u1' }
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: created, error: null }),
        }),
      }),
    } as any)

    const store = useQuotesStore()
    const id = await store.create(fakeInsertPayload)

    expect(id).toBe('q2')
  })

  it('create: si falla, relanza el error', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'RLS violation' } }),
        }),
      }),
    } as any)

    const store = useQuotesStore()
    await expect(store.create(fakeInsertPayload)).rejects.toThrow()
  })

  // ── generatePdf ──────────────────────────────────────────────
  it('generatePdf: llama Edge Function generate-pdf con el quote_id', async () => {
    const { supabase } = await import('@/lib/supabase')
    const pdfResult = { url: 'https://signed.url/q1.pdf', pdf_path: 'quotes/q1.pdf', expires_at: '2026-04-07T01:00:00Z' }
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: pdfResult, error: null } as any)

    const store = useQuotesStore()
    store.quotes = [fakeQuote]
    const result = await store.generatePdf('q1')

    expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-pdf', {
      body: { quote_id: 'q1' },
    })
    expect(result).toEqual(pdfResult)
  })

  it('generatePdf: actualiza pdf_path en la lista local tras éxito', async () => {
    const { supabase } = await import('@/lib/supabase')
    const pdfResult = { url: 'https://signed.url/q1.pdf', pdf_path: 'quotes/q1.pdf', expires_at: '2026-04-07T01:00:00Z' }
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: pdfResult, error: null } as any)

    const store = useQuotesStore()
    store.quotes = [{ ...fakeQuote }]
    await store.generatePdf('q1')

    expect(store.quotes.find(q => q.id === 'q1')?.pdf_path).toBe('quotes/q1.pdf')
  })

  it('generatePdf: si la Edge Function falla, relanza el error', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: { message: 'Carbone error' } } as any)

    const store = useQuotesStore()
    await expect(store.generatePdf('q1')).rejects.toThrow('Carbone error')
  })
})
