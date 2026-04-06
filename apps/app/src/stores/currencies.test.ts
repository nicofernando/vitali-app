import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCurrenciesStore } from './currencies'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

const fakeCurrencies = [
  { id: 'c1', code: 'CLP', name: 'Peso chileno', symbol: '$', decimal_places: 0 },
  { id: 'c2', code: 'USD', name: 'Dólar', symbol: 'US$', decimal_places: 2 },
]

describe('useCurrenciesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('inicia con lista vacía', () => {
    const store = useCurrenciesStore()
    expect(store.currencies).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('fetchAll carga y ordena por code', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: fakeCurrencies, error: null }),
      }),
    } as any)

    const store = useCurrenciesStore()
    await store.fetchAll()

    expect(store.currencies).toEqual(fakeCurrencies)
    expect(store.loading).toBe(false)
  })

  it('create agrega la moneda a la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    const newCurrency = { id: 'c3', code: 'MXN', name: 'Peso mexicano', symbol: '$', decimal_places: 2 }
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newCurrency, error: null }),
        }),
      }),
    } as any)

    const store = useCurrenciesStore()
    await store.create({ code: 'MXN', name: 'Peso mexicano', symbol: '$', decimal_places: 2 })

    expect(store.currencies[0]).toEqual(newCurrency)
  })

  it('update modifica la moneda en la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    const updated = { ...fakeCurrencies[0], name: 'Peso chileno actualizado' }
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: updated, error: null }),
          }),
        }),
      }),
    } as any)

    const store = useCurrenciesStore()
    store.currencies = [...fakeCurrencies]
    await store.update('c1', { name: 'Peso chileno actualizado' })

    expect(store.currencies.find(c => c.id === 'c1')?.name).toBe('Peso chileno actualizado')
  })

  it('remove elimina la moneda de la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any)

    const store = useCurrenciesStore()
    store.currencies = [...fakeCurrencies]
    await store.remove('c1')

    expect(store.currencies.find(c => c.id === 'c1')).toBeUndefined()
    expect(store.currencies).toHaveLength(1)
  })
})
