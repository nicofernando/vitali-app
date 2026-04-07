import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSimulatorStore } from './simulator'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'fake-token' } } }),
    },
    functions: { invoke: vi.fn() },
  },
}))

describe('useSimulatorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('inicia sin selección y sin resultado', () => {
    const store = useSimulatorStore()
    expect(store.selectedProject).toBeNull()
    expect(store.selectedTower).toBeNull()
    expect(store.selectedUnit).toBeNull()
    expect(store.result).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('calculate llama a la Edge Function con los parámetros correctos', async () => {
    const { supabase } = await import('@/lib/supabase')
    const fakeResult = { unit: { id: 'u1' }, french: { monthly_payment: 500 } }
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: fakeResult, error: null } as any)

    const store = useSimulatorStore()
    await store.calculate({
      unit_id: 'u1',
      pie_percentage: 20,
      term_years: 20,
      credit_type: 'french',
    })

    expect(supabase.functions.invoke).toHaveBeenCalledWith('calculate-quote', {
      body: { unit_id: 'u1', pie_percentage: 20, term_years: 20, credit_type: 'french' },
      headers: { Authorization: 'Bearer fake-token' },
    })
    expect(store.result).toEqual(fakeResult)
    expect(store.loading).toBe(false)
  })

  it('calculate guarda el error si la Edge Function falla', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: { message: 'PIE mínimo es 20%' } } as any)

    const store = useSimulatorStore()
    await store.calculate({
      unit_id: 'u1',
      pie_percentage: 5,
      term_years: 20,
      credit_type: 'french',
    })

    expect(store.result).toBeNull()
    expect(store.error).toBe('PIE mínimo es 20%')
  })

  it('reset limpia toda la selección y el resultado', () => {
    const store = useSimulatorStore()
    store.result = { unit: { id: 'u1' } } as unknown as typeof store.result
    store.error = 'Error previo'

    store.reset()

    expect(store.result).toBeNull()
    expect(store.error).toBeNull()
    expect(store.selectedProject).toBeNull()
    expect(store.selectedTower).toBeNull()
    expect(store.selectedUnit).toBeNull()
  })
})
