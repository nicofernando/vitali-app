import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProjectsStore } from './projects'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

describe('useProjectsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('inicia con lista vacía y sin errores', () => {
    const store = useProjectsStore()
    expect(store.projects).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchAll carga proyectos y los guarda', async () => {
    const { supabase } = await import('@/lib/supabase')
    const fakeProjects = [{ id: '1', name: 'Torre del Sol', currency: { code: 'CLP' } }]
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: fakeProjects, error: null }),
      }),
    } as any)

    const store = useProjectsStore()
    await store.fetchAll()

    expect(store.projects).toEqual(fakeProjects)
    expect(store.error).toBeNull()
  })

  it('fetchAll guarda el error si supabase falla', async () => {
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

  it('create agrega el proyecto al inicio de la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    const newProject = { id: '2', name: 'Nuevo', currency: { code: 'MXN' } }
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newProject, error: null }),
        }),
      }),
    } as any)

    const store = useProjectsStore()
    const result = await store.create({
      name: 'Nuevo',
      description: null,
      location: null,
      currency_id: 'uuid',
      annual_interest_rate: 0.08,
      french_credit_enabled: true,
      smart_credit_enabled: true,
    })

    expect(result).toEqual(newProject)
    expect(store.projects[0]).toEqual(newProject)
  })

  it('create re-lanza el error para que el componente lo capture', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Constraint error' } }),
        }),
      }),
    } as any)

    const store = useProjectsStore()
    await expect(store.create({
      name: 'X',
      description: null,
      location: null,
      currency_id: 'uuid',
      annual_interest_rate: 0.08,
      french_credit_enabled: true,
      smart_credit_enabled: true,
    })).rejects.toThrow()
  })

  it('remove elimina el proyecto de la lista local', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any)

    const store = useProjectsStore()
    store.projects = [
      { id: '1', name: 'A', description: null, location: null, currency_id: 'x', annual_interest_rate: 0.08, french_credit_enabled: true, smart_credit_enabled: true, created_at: '' },
      { id: '2', name: 'B', description: null, location: null, currency_id: 'x', annual_interest_rate: 0.08, french_credit_enabled: true, smart_credit_enabled: true, created_at: '' },
    ]

    await store.remove('1')

    expect(store.projects).toHaveLength(1)
    expect(store.projects[0].id).toBe('2')
  })
})
