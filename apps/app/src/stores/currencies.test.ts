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

function mockFrom(chain: Record<string, any>) {
  return { from: vi.fn().mockReturnValue(chain) }
}

describe('useCurrenciesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── Estado inicial ───────────────────────────────────────────
  it('inicia con lista vacía, sin loading ni error', () => {
    const store = useCurrenciesStore()
    expect(store.currencies).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  // ── fetchAll ─────────────────────────────────────────────────
  it('fetchAll: carga monedas y limpia loading', async () => {
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
    expect(store.error).toBeNull()
  })

  it('fetchAll: si falla, guarda error y lista queda vacía', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }),
    } as any)

    const store = useCurrenciesStore()
    await store.fetchAll()

    expect(store.currencies).toEqual([])
    expect(store.error).toBe('DB error')
    expect(store.loading).toBe(false)
  })

  // ── create ───────────────────────────────────────────────────
  it('create: agrega al inicio de la lista', async () => {
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
    store.currencies = [...fakeCurrencies]
    await store.create({ code: 'MXN', name: 'Peso mexicano', symbol: '$', decimal_places: 2 })

    expect(store.currencies[0]).toEqual(newCurrency)
    expect(store.currencies).toHaveLength(3)
  })

  it('create: si falla, relanza el error y la lista queda intacta', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Código duplicado' } }),
        }),
      }),
    } as any)

    const store = useCurrenciesStore()
    store.currencies = [...fakeCurrencies]
    await expect(store.create({ code: 'CLP', name: 'Dup', symbol: '$', decimal_places: 0 })).rejects.toThrow()
    expect(store.currencies).toHaveLength(2)
  })

  // ── update ───────────────────────────────────────────────────
  it('update: modifica el ítem correcto en la lista', async () => {
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
    expect(store.currencies).toHaveLength(2)
  })

  it('update: si falla, relanza el error y el ítem queda sin cambios', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'RLS violation' } }),
          }),
        }),
      }),
    } as any)

    const store = useCurrenciesStore()
    store.currencies = [...fakeCurrencies]
    await expect(store.update('c1', { name: 'X' })).rejects.toThrow()
    expect(store.currencies.find(c => c.id === 'c1')?.name).toBe('Peso chileno')
  })

  // ── remove ───────────────────────────────────────────────────
  it('remove: elimina el ítem de la lista', async () => {
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

  it('remove: si falla, relanza el error y la lista queda intacta', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Moneda en uso' } }),
      }),
    } as any)

    const store = useCurrenciesStore()
    store.currencies = [...fakeCurrencies]
    await expect(store.remove('c1')).rejects.toThrow()
    expect(store.currencies).toHaveLength(2)
  })
})
