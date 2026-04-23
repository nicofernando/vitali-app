import type { CalculateQuoteResponse } from '@/types'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSimulatorStore } from './simulator'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
  },
}))

describe('useSimulatorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('inicia sin selección, con defaults de formulario y sin resultado', () => {
    const store = useSimulatorStore()
    expect(store.selectedProjectId).toBe('')
    expect(store.selectedTowerId).toBe('')
    expect(store.selectedUnitId).toBe('')
    expect(store.piePercentage).toBe(20)
    expect(store.termYears).toBe(20)
    expect(store.creditType).toBe('both')
    expect(store.smartCuotasPercentage).toBe(30)
    expect(store.result).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
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

  it('clearResult limpia solo el resultado sin tocar la selección', () => {
    const store = useSimulatorStore()
    store.selectedProjectId = 'p1'
    store.selectedTowerId = 't1'
    store.selectedUnitId = 'u1'
    store.result = { unit: { id: 'u1' } } as CalculateQuoteResponse
    store.error = 'Error previo'

    store.clearResult()

    expect(store.result).toBeNull()
    expect(store.error).toBeNull()
    expect(store.selectedProjectId).toBe('p1')
    expect(store.selectedTowerId).toBe('t1')
    expect(store.selectedUnitId).toBe('u1')
  })

  it('calculate es no-op si loading ya es true', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: {}, error: null } as any)

    const store = useSimulatorStore()
    store.loading = true
    await store.calculate({ unit_id: 'u1', pie_percentage: 20, term_years: 20, credit_type: 'french' })

    expect(supabase.functions.invoke).not.toHaveBeenCalled()
  })

  it('calculate es no-op si creditType está vacío', async () => {
    const { supabase } = await import('@/lib/supabase')
    const store = useSimulatorStore()
    store.creditType = '' as any
    await store.calculate({ unit_id: 'u1', pie_percentage: 20, term_years: 20, credit_type: 'french' })
    expect(supabase.functions.invoke).not.toHaveBeenCalled()
  })

  it('calculate deja loading en false tras un error de la Edge Function', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: { message: 'Server error' } } as any)

    const store = useSimulatorStore()
    await store.calculate({ unit_id: 'u1', pie_percentage: 20, term_years: 20, credit_type: 'french' })

    expect(store.loading).toBe(false)
    expect(store.error).toBe('Server error')
  })

  it('reset limpia toda la selección, parámetros y resultado', () => {
    const store = useSimulatorStore()
    store.selectedProjectId = 'p1'
    store.selectedTowerId = 't1'
    store.selectedUnitId = 'u1'
    store.piePercentage = 35
    store.termYears = 15
    store.creditType = 'french'
    store.smartCuotasPercentage = 50
    store.result = { unit: { id: 'u1' } } as CalculateQuoteResponse
    store.error = 'Error previo'

    store.reset()

    expect(store.selectedProjectId).toBe('')
    expect(store.selectedTowerId).toBe('')
    expect(store.selectedUnitId).toBe('')
    expect(store.piePercentage).toBe(20)
    expect(store.termYears).toBe(20)
    expect(store.creditType).toBe('both')
    expect(store.smartCuotasPercentage).toBe(30)
    expect(store.result).toBeNull()
    expect(store.error).toBeNull()
  })
})
