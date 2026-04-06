import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUsersStore } from './users'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

describe('useUsersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('inicia con lista vacía y sin loading', () => {
    const store = useUsersStore()
    expect(store.users).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchAll carga usuarios con roles', async () => {
    const { supabase } = await import('@/lib/supabase')
    const role = { id: 'r1', name: 'admin', description: null, created_at: '' }
    // Supabase devuelve user_roles:[{roles:{...}}], el store lo aplana a roles:[{...}]
    const rawData = [
      { id: 'u1', email: 'a@test.com', full_name: 'Ana', user_roles: [{ roles: role }] },
      { id: 'u2', email: 'b@test.com', full_name: 'Bob', user_roles: [] },
    ]
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: rawData, error: null }),
      }),
    } as any)

    const store = useUsersStore()
    await store.fetchAll()

    expect(store.users[0].roles).toEqual([role])
    expect(store.users[1].roles).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('fetchAll guarda el error si Supabase falla', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'No autorizado' } }),
      }),
    } as any)

    const store = useUsersStore()
    await store.fetchAll()

    expect(store.users).toEqual([])
    expect(store.error).toBe('No autorizado')
  })

  it('assignRole llama a rpc con los parámetros correctos', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as any)

    const store = useUsersStore()
    await store.assignRole('u1', 'r1')

    expect(supabase.rpc).toHaveBeenCalledWith('assign_role', { p_user_id: 'u1', p_role_id: 'r1' })
  })

  it('removeRole llama a rpc con los parámetros correctos', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as any)

    const store = useUsersStore()
    await store.removeRole('u1', 'r1')

    expect(supabase.rpc).toHaveBeenCalledWith('remove_role', { p_user_id: 'u1', p_role_id: 'r1' })
  })

  it('assignRole actualiza la lista de usuarios en memoria', async () => {
    const { supabase } = await import('@/lib/supabase')
    const role = { id: 'r1', name: 'admin', description: null, created_at: '' }
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as any)

    const store = useUsersStore()
    store.users = [{ id: 'u1', email: 'a@test.com', full_name: 'Ana', phone: null, roles: [] }]
    await store.assignRole('u1', 'r1', role)

    expect(store.users[0].roles).toContainEqual(role)
  })

  it('removeRole actualiza la lista de usuarios en memoria', async () => {
    const { supabase } = await import('@/lib/supabase')
    const role = { id: 'r1', name: 'admin', description: null, created_at: '' }
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as any)

    const store = useUsersStore()
    store.users = [{ id: 'u1', email: 'a@test.com', full_name: 'Ana', phone: null, roles: [role] }]
    await store.removeRole('u1', 'r1')

    expect(store.users[0].roles).toHaveLength(0)
  })
})
