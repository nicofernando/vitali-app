import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTowersStore } from './towers'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

describe('useTowersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('inicia vacío', () => {
    const store = useTowersStore()
    expect(store.towers).toEqual([])
    expect(store.currentProjectId).toBeNull()
  })

  it('fetchByProject carga torres del proyecto dado', async () => {
    const { supabase } = await import('@/lib/supabase')
    const fakeTowers = [{ id: 't1', project_id: 'p1', name: 'Torre A' }]
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
  })

  it('fetchByProject limpia torres al cambiar de proyecto', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    } as any)

    const store = useTowersStore()
    store.towers = [{ id: 't1', project_id: 'p1', name: 'Torre A', description: null, delivery_date: null, max_financing_years: 20, min_pie_percentage: 20, created_at: '' }]

    await store.fetchByProject('p2')

    expect(store.towers).toEqual([])
    expect(store.currentProjectId).toBe('p2')
  })

  it('create agrega torre al inicio de la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    const newTower = { id: 't2', project_id: 'p1', name: 'Torre B' }
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newTower, error: null }),
        }),
      }),
    } as any)

    const store = useTowersStore()
    const result = await store.create({
      project_id: 'p1',
      name: 'Torre B',
      description: null,
      delivery_date: null,
      max_financing_years: 20,
      min_pie_percentage: 20,
    })

    expect(result).toEqual(newTower)
    expect(store.towers[0]).toEqual(newTower)
  })

  it('remove elimina la torre de la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any)

    const store = useTowersStore()
    store.towers = [{ id: 't1', project_id: 'p1', name: 'A', description: null, delivery_date: null, max_financing_years: 20, min_pie_percentage: 20, created_at: '' }]

    await store.remove('t1')
    expect(store.towers).toHaveLength(0)
  })
})
