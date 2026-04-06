import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUnitsStore } from './units'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

describe('useUnitsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('inicia vacío', () => {
    const store = useUnitsStore()
    expect(store.units).toEqual([])
    expect(store.currentTowerId).toBeNull()
  })

  it('fetchByTower carga unidades de la torre dada', async () => {
    const { supabase } = await import('@/lib/supabase')
    const fakeUnits = [{ id: 'u1', tower_id: 't1', unit_number: '101' }]
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: fakeUnits, error: null }),
          }),
        }),
      }),
    } as any)

    const store = useUnitsStore()
    await store.fetchByTower('t1')

    expect(store.units).toEqual(fakeUnits)
    expect(store.currentTowerId).toBe('t1')
  })

  it('create agrega unidad al inicio de la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    const newUnit = { id: 'u2', tower_id: 't1', unit_number: '102', floor: 1, list_price: 5000000, typology_id: 'ty1' }
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newUnit, error: null }),
        }),
      }),
    } as any)

    const store = useUnitsStore()
    const result = await store.create({
      tower_id: 't1',
      typology_id: 'ty1',
      unit_number: '102',
      floor: 1,
      list_price: 5000000,
    })

    expect(result).toEqual(newUnit)
    expect(store.units[0]).toEqual(newUnit)
  })

  it('remove elimina la unidad de la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any)

    const store = useUnitsStore()
    store.units = [
      { id: 'u1', tower_id: 't1', typology_id: 'ty1', unit_number: '101', floor: 1, list_price: 5000000, created_at: '' },
    ]

    await store.remove('u1')
    expect(store.units).toHaveLength(0)
  })
})
