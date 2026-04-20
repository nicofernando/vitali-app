import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTypologiesStore } from './typologies'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

const baseTypology = { id: 'ty1', name: '2D', surface_m2: 65, description: null, created_at: '' }
const fakeTypologies = [baseTypology, { ...baseTypology, id: 'ty2', name: '3D', surface_m2: 85 }]

describe('useTypologiesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── Estado inicial ───────────────────────────────────────────
  it('inicia vacío, sin loading ni error', () => {
    const store = useTypologiesStore()
    expect(store.typologies).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  // ── fetchAll ─────────────────────────────────────────────────
  it('fetchAll: carga todas las tipologías', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: fakeTypologies, error: null }),
      }),
    } as any)

    const store = useTypologiesStore()
    await store.fetchAll()

    expect(store.typologies).toEqual(fakeTypologies)
    expect(store.loading).toBe(false)
  })

  it('fetchAll: si falla, guarda error y lista queda vacía', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
      }),
    } as any)

    const store = useTypologiesStore()
    await store.fetchAll()

    expect(store.typologies).toEqual([])
    expect(store.error).toBe('Error')
  })

  // ── fetchByProject ───────────────────────────────────────────
  it('fetchByProject: carga tipologías del proyecto dado', async () => {
    const { supabase } = await import('@/lib/supabase')
    const rawData = fakeTypologies.map(t => ({ typology: t }))
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: rawData, error: null }),
      }),
    } as any)

    const store = useTypologiesStore()
    await store.fetchByProject('p1')

    expect(store.typologies).toEqual(fakeTypologies)
    expect(store.loading).toBe(false)
  })

  it('fetchByProject: si falla, guarda error y lista queda vacía', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Sin permiso' } }),
      }),
    } as any)

    const store = useTypologiesStore()
    await store.fetchByProject('p1')

    expect(store.typologies).toEqual([])
    expect(store.error).toBe('Sin permiso')
  })

  // ── create ───────────────────────────────────────────────────
  it('create: agrega al inicio de la lista y la retorna', async () => {
    const { supabase } = await import('@/lib/supabase')
    const newTypo = { ...baseTypology, id: 'ty3', name: '4D' }
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newTypo, error: null }),
        }),
      }),
    } as any)

    const store = useTypologiesStore()
    store.typologies = [...fakeTypologies]
    const result = await store.create({ name: '4D', surface_m2: 100, description: null })

    expect(result).toEqual(newTypo)
    expect(store.typologies[0]).toEqual(newTypo)
    expect(store.typologies).toHaveLength(3)
  })

  it('create: si falla, relanza el error y la lista queda intacta', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Nombre duplicado' } }),
        }),
      }),
    } as any)

    const store = useTypologiesStore()
    store.typologies = [...fakeTypologies]
    await expect(store.create({ name: '2D', surface_m2: 65, description: null })).rejects.toThrow()
    expect(store.typologies).toHaveLength(2)
  })

  // ── update ───────────────────────────────────────────────────
  it('update: modifica la tipología correcta en la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    const updated = { ...baseTypology, surface_m2: 70 }
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: updated, error: null }),
          }),
        }),
      }),
    } as any)

    const store = useTypologiesStore()
    store.typologies = [{ ...baseTypology }, { ...baseTypology, id: 'ty2', name: '3D' }]
    await store.update('ty1', { surface_m2: 70 })

    expect(store.typologies.find(t => t.id === 'ty1')?.surface_m2).toBe(70)
    expect(store.typologies).toHaveLength(2)
  })

  it('update: si falla, relanza el error y la tipología queda sin cambios', async () => {
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

    const store = useTypologiesStore()
    store.typologies = [{ ...baseTypology }]
    await expect(store.update('ty1', { surface_m2: 999 })).rejects.toThrow()
    expect(store.typologies.find(t => t.id === 'ty1')?.surface_m2).toBe(65)
  })

  // ── remove ───────────────────────────────────────────────────
  it('remove: elimina la tipología de la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any)

    const store = useTypologiesStore()
    store.typologies = [...fakeTypologies]
    await store.remove('ty1')

    expect(store.typologies.find(t => t.id === 'ty1')).toBeUndefined()
    expect(store.typologies).toHaveLength(1)
  })

  it('remove: si falla, relanza el error y la lista queda intacta', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Tipología en uso' } }),
      }),
    } as any)

    const store = useTypologiesStore()
    store.typologies = [...fakeTypologies]
    await expect(store.remove('ty1')).rejects.toThrow()
    expect(store.typologies).toHaveLength(2)
  })

  // ── assignToProject / removeFromProject ─────────────────────
  it('assignToProject: llama a supabase con los parámetros correctos', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    } as any)

    const store = useTypologiesStore()
    await store.assignToProject('p1', 'ty1')

    expect(supabase.from).toHaveBeenCalledWith('project_typologies')
  })

  it('assignToProject: si falla, relanza el error', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { message: 'Ya asignada' } }),
    } as any)

    const store = useTypologiesStore()
    await expect(store.assignToProject('p1', 'ty1')).rejects.toThrow()
  })

  it('removeFromProject: llama a supabase con los parámetros correctos', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    } as any)

    const store = useTypologiesStore()
    await store.removeFromProject('p1', 'ty1')

    expect(supabase.from).toHaveBeenCalledWith('project_typologies')
  })
})
