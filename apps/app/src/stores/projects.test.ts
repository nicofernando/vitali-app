import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProjectsStore } from './projects'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

const basePayload = {
  name: 'Torre del Sol',
  description: null,
  location: null,
  currency_id: 'uuid-currency',
  annual_interest_rate: 0.08,
  french_credit_enabled: true,
  smart_credit_enabled: true,
}

const fakeCurrency = { id: 'uuid-currency', code: 'CLP', name: 'Peso Chileno', symbol: '$', decimal_places: 0 }
const fakeProject = { id: '1', ...basePayload, created_at: '', currency: fakeCurrency }
const fakeProject2 = { id: '2', ...basePayload, name: 'Torre Luna', created_at: '', currency: fakeCurrency }

describe('useProjectsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── Estado inicial ───────────────────────────────────────────
  it('inicia con lista vacía, sin loading ni error', () => {
    const store = useProjectsStore()
    expect(store.projects).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  // ── fetchAll ─────────────────────────────────────────────────
  it('fetchAll: carga proyectos y limpia loading', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [fakeProject], error: null }),
      }),
    } as any)

    const store = useProjectsStore()
    await store.fetchAll()

    expect(store.projects).toEqual([fakeProject])
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('fetchAll: si falla, guarda error y lista queda vacía', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }),
    } as any)

    const store = useProjectsStore()
    await store.fetchAll()

    expect(store.projects).toEqual([])
    expect(store.error).toBe('DB error')
  })

  // ── create ───────────────────────────────────────────────────
  it('create: agrega proyecto al inicio de la lista y lo retorna', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: fakeProject, error: null }),
        }),
      }),
    } as any)

    const store = useProjectsStore()
    store.projects = [fakeProject2]
    const result = await store.create(basePayload)

    expect(result).toEqual(fakeProject)
    expect(store.projects[0]).toEqual(fakeProject)
    expect(store.projects).toHaveLength(2)
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

    const store = useProjectsStore()
    store.projects = [fakeProject]
    await expect(store.create(basePayload)).rejects.toThrow()
    expect(store.projects).toHaveLength(1)
  })

  // ── update ───────────────────────────────────────────────────
  it('update: modifica el proyecto correcto en la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    const updated = { ...fakeProject, name: 'Torre del Sol Actualizado' }
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: updated, error: null }),
          }),
        }),
      }),
    } as any)

    const store = useProjectsStore()
    store.projects = [{ ...fakeProject }, fakeProject2]
    await store.update('1', { name: 'Torre del Sol Actualizado' })

    expect(store.projects.find(p => p.id === '1')?.name).toBe('Torre del Sol Actualizado')
    expect(store.projects).toHaveLength(2)
  })

  it('update: si falla, relanza el error y el proyecto queda sin cambios', async () => {
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

    const store = useProjectsStore()
    store.projects = [{ ...fakeProject }]
    await expect(store.update('1', { name: 'X' })).rejects.toThrow()
    expect(store.projects.find(p => p.id === '1')?.name).toBe('Torre del Sol')
  })

  // ── remove ───────────────────────────────────────────────────
  it('remove: elimina el proyecto de la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any)

    const store = useProjectsStore()
    store.projects = [{ ...fakeProject }, fakeProject2]
    await store.remove('1')

    expect(store.projects.find(p => p.id === '1')).toBeUndefined()
    expect(store.projects).toHaveLength(1)
  })

  it('remove: si falla, relanza el error y la lista queda intacta', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Proyecto en uso' } }),
      }),
    } as any)

    const store = useProjectsStore()
    store.projects = [{ ...fakeProject }, fakeProject2]
    await expect(store.remove('1')).rejects.toThrow()
    expect(store.projects).toHaveLength(2)
  })
})
