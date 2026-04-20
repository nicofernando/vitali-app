import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUnitsStore } from './units'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

const baseUnit = {
  id: 'u1',
  tower_id: 't1',
  typology_id: 'ty1',
  unit_number: '101',
  floor: 1,
  list_price: 5_000_000,
  created_at: '',
}
const fakeUnits = [baseUnit, { ...baseUnit, id: 'u2', unit_number: '102' }]

describe('useUnitsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── Estado inicial ───────────────────────────────────────────
  it('inicia vacío, sin loading ni error', () => {
    const store = useUnitsStore()
    expect(store.units).toEqual([])
    expect(store.currentTowerId).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  // ── fetchByTower ─────────────────────────────────────────────
  it('fetchByTower: carga unidades y guarda towerId', async () => {
    const { supabase } = await import('@/lib/supabase')
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
    expect(store.loading).toBe(false)
  })

  it('fetchByTower: limpia unidades previas al cambiar de torre', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    } as any)

    const store = useUnitsStore()
    store.units = [...fakeUnits]
    await store.fetchByTower('t2')

    expect(store.units).toEqual([])
    expect(store.currentTowerId).toBe('t2')
  })

  it('fetchByTower: si falla, guarda error y lista queda vacía', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Sin permiso' } }),
          }),
        }),
      }),
    } as any)

    const store = useUnitsStore()
    await store.fetchByTower('t1')

    expect(store.units).toEqual([])
    expect(store.error).toBe('Sin permiso')
  })

  // ── create ───────────────────────────────────────────────────
  it('create: agrega unidad al inicio de la lista y la retorna', async () => {
    const { supabase } = await import('@/lib/supabase')
    const newUnit = { ...baseUnit, id: 'u3', unit_number: '103' }
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newUnit, error: null }),
        }),
      }),
    } as any)

    const store = useUnitsStore()
    store.units = [...fakeUnits]
    const result = await store.create({ tower_id: 't1', typology_id: 'ty1', unit_number: '103', floor: 1, list_price: 5_000_000 })

    expect(result).toEqual(newUnit)
    expect(store.units[0]).toEqual(newUnit)
    expect(store.units).toHaveLength(3)
  })

  it('create: si falla, relanza el error y la lista queda intacta', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Número duplicado' } }),
        }),
      }),
    } as any)

    const store = useUnitsStore()
    store.units = [...fakeUnits]
    await expect(store.create({ tower_id: 't1', typology_id: 'ty1', unit_number: '101', floor: 1, list_price: 0 })).rejects.toThrow()
    expect(store.units).toHaveLength(2)
  })

  // ── update ───────────────────────────────────────────────────
  it('update: modifica la unidad correcta en la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    const updated = { ...baseUnit, list_price: 6_000_000 }
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: updated, error: null }),
          }),
        }),
      }),
    } as any)

    const store = useUnitsStore()
    store.units = [{ ...baseUnit }, { ...baseUnit, id: 'u2', unit_number: '102' }]
    await store.update('u1', { list_price: 6_000_000 })

    expect(store.units.find(u => u.id === 'u1')?.list_price).toBe(6_000_000)
    expect(store.units).toHaveLength(2)
  })

  it('update: si falla, relanza el error y la unidad queda sin cambios', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
          }),
        }),
      }),
    } as any)

    const store = useUnitsStore()
    store.units = [{ ...baseUnit }]
    await expect(store.update('u1', { list_price: 999 })).rejects.toThrow()
    expect(store.units.find(u => u.id === 'u1')?.list_price).toBe(5_000_000)
  })

  // ── remove ───────────────────────────────────────────────────
  it('remove: elimina la unidad de la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any)

    const store = useUnitsStore()
    store.units = [...fakeUnits]
    await store.remove('u1')

    expect(store.units.find(u => u.id === 'u1')).toBeUndefined()
    expect(store.units).toHaveLength(1)
  })

  it('remove: si falla, relanza el error y la lista queda intacta', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Unidad en uso' } }),
      }),
    } as any)

    const store = useUnitsStore()
    store.units = [...fakeUnits]
    await expect(store.remove('u1')).rejects.toThrow()
    expect(store.units).toHaveLength(2)
  })
})
