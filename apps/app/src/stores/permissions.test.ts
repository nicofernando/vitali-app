import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePermissionsStore } from './permissions'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn(),
      }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
  },
}))

const mockDbResponse = {
  data: [
    {
      roles: {
        role_permissions: [
          { permissions: { module: 'projects', action: 'read' } },
          { permissions: { module: 'projects', action: 'create' } },
          { permissions: { module: 'simulator', action: 'use' } },
        ],
      },
    },
  ],
  error: null,
}

describe('usePermissionsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('comienza sin permisos', () => {
    const store = usePermissionsStore()
    expect(store.permissions).toEqual([])
    expect(store.loaded).toBe(false)
  })

  it('can() retorna false si no tiene el permiso', () => {
    const store = usePermissionsStore()
    expect(store.can('projects.delete')).toBe(false)
  })

  it('load() carga permisos desde la DB y los aplana', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(mockDbResponse),
      }),
    } as any)

    const store = usePermissionsStore()
    await store.load('user-1')

    expect(store.permissions).toContain('projects.read')
    expect(store.permissions).toContain('projects.create')
    expect(store.permissions).toContain('simulator.use')
    expect(store.loaded).toBe(true)
  })

  it('can() retorna true después de cargar un permiso existente', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(mockDbResponse),
      }),
    } as any)

    const store = usePermissionsStore()
    await store.load('user-1')

    expect(store.can('projects.read')).toBe(true)
    expect(store.can('projects.delete')).toBe(false)
  })

  it('canAny() retorna true si tiene al menos uno de los permisos', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(mockDbResponse),
      }),
    } as any)

    const store = usePermissionsStore()
    await store.load('user-1')

    expect(store.canAny('projects.delete', 'projects.read')).toBe(true)
    expect(store.canAny('users.create', 'users.delete')).toBe(false)
  })

  it('reset() limpia los permisos', async () => {
    const store = usePermissionsStore()
    store.permissions = ['projects.read']
    store.loaded = true

    store.reset()

    expect(store.permissions).toEqual([])
    expect(store.loaded).toBe(false)
  })

  // ── reload ────────────────────────────────────────────────────
  it('reload() fuerza una nueva carga aunque ya esté loaded', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(mockDbResponse),
      }),
    } as any)

    const store = usePermissionsStore()
    await store.load('user-1')
    expect(supabase.from).toHaveBeenCalledTimes(1)

    await store.reload('user-1')
    expect(supabase.from).toHaveBeenCalledTimes(2)
    expect(store.loaded).toBe(true)
    expect(store.permissions).toContain('projects.read')
  })

  // ── deduplicación concurrente ──────────────────────────────────
  it('load() concurrente usa la misma promesa en vuelo y no hace doble request', async () => {
    const { supabase } = await import('@/lib/supabase')
    let resolveLoad!: (val: any) => void
    const pendingLoad = new Promise<any>((resolve) => {
      resolveLoad = resolve
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue(pendingLoad),
      }),
    } as any)

    const store = usePermissionsStore()
    const p1 = store.load('user-1')
    const p2 = store.load('user-1')

    resolveLoad(mockDbResponse)
    await Promise.all([p1, p2])

    expect(supabase.from).toHaveBeenCalledTimes(1)
    expect(store.permissions).toContain('projects.read')
  })
})
