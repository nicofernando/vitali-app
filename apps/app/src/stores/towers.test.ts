import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTowersStore } from './towers'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

const baseTower = {
  id: 't1',
  project_id: 'p1',
  name: 'Torre A',
  description: null,
  delivery_date: null,
  max_financing_years: 20,
  min_pie_percentage: 20,
  created_at: '',
}
const fakeTowers = [baseTower, { ...baseTower, id: 't2', name: 'Torre B' }]

describe('useTowersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── Estado inicial ───────────────────────────────────────────
  it('inicia vacío, sin loading ni error', () => {
    const store = useTowersStore()
    expect(store.towers).toEqual([])
    expect(store.currentProjectId).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  // ── fetchByProject ───────────────────────────────────────────
  it('fetchByProject: carga torres y guarda projectId', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: fakeTowers, error: null }),
        }),
      }),
    } as any)

    const store = useTowersStore()
    await store.fetchByProject('p1')

    expect(store.towers).toEqual(fakeTowers)
    expect(store.currentProjectId).toBe('p1')
    expect(store.loading).toBe(false)
  })

  it('fetchByProject: limpia torres previas al cambiar de proyecto', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    } as any)

    const store = useTowersStore()
    store.towers = [...fakeTowers]
    await store.fetchByProject('p2')

    expect(store.towers).toEqual([])
    expect(store.currentProjectId).toBe('p2')
  })

  it('fetchByProject: si falla, guarda error y lista queda vacía', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Sin permiso' } }),
        }),
      }),
    } as any)

    const store = useTowersStore()
    await store.fetchByProject('p1')

    expect(store.towers).toEqual([])
    expect(store.error).toBe('Sin permiso')
  })

  // ── create ───────────────────────────────────────────────────
  it('create: agrega torre al inicio de la lista y la retorna', async () => {
    const { supabase } = await import('@/lib/supabase')
    const newTower = { ...baseTower, id: 't3', name: 'Torre C' }
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newTower, error: null }),
        }),
      }),
    } as any)

    const store = useTowersStore()
    store.towers = [...fakeTowers]
    const result = await store.create({ project_id: 'p1', name: 'Torre C', description: null, delivery_date: null, max_financing_years: 20, min_pie_percentage: 20 })

    expect(result).toEqual(newTower)
    expect(store.towers[0]).toEqual(newTower)
    expect(store.towers).toHaveLength(3)
  })

  it('create: si falla, relanza el error y la lista queda intacta', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Constraint error' } }),
        }),
      }),
    } as any)

    const store = useTowersStore()
    store.towers = [...fakeTowers]
    await expect(store.create({ project_id: 'p1', name: 'X', description: null, delivery_date: null, max_financing_years: 20, min_pie_percentage: 20 })).rejects.toThrow()
    expect(store.towers).toHaveLength(2)
  })

  // ── update ───────────────────────────────────────────────────
  it('update: modifica la torre correcta en la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    const updated = { ...baseTower, name: 'Torre A Actualizada' }
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: updated, error: null }),
          }),
        }),
      }),
    } as any)

    const store = useTowersStore()
    store.towers = [{ ...baseTower }, { ...baseTower, id: 't2', name: 'Torre B' }]
    await store.update('t1', { name: 'Torre A Actualizada' })

    expect(store.towers.find(t => t.id === 't1')?.name).toBe('Torre A Actualizada')
    expect(store.towers).toHaveLength(2)
  })

  it('update: si falla, relanza el error y la torre queda sin cambios', async () => {
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

    const store = useTowersStore()
    store.towers = [{ ...baseTower }]
    await expect(store.update('t1', { name: 'X' })).rejects.toThrow()
    expect(store.towers.find(t => t.id === 't1')?.name).toBe('Torre A')
  })

  // ── remove ───────────────────────────────────────────────────
  it('remove: elimina la torre de la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any)

    const store = useTowersStore()
    store.towers = [...fakeTowers]
    await store.remove('t1')

    expect(store.towers.find(t => t.id === 't1')).toBeUndefined()
    expect(store.towers).toHaveLength(1)
  })

  it('remove: si falla, relanza el error y la lista queda intacta', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Torre en uso' } }),
      }),
    } as any)

    const store = useTowersStore()
    store.towers = [...fakeTowers]
    await expect(store.remove('t1')).rejects.toThrow()
    expect(store.towers).toHaveLength(2)
  })
})
