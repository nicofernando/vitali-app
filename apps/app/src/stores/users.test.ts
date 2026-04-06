import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUsersStore } from './users'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}))

const role = { id: 'r1', name: 'Admin', description: null, created_at: '' }
const baseUser = { id: 'u1', email: 'a@test.com', full_name: 'Ana', phone: null, roles: [] }
const fakeUsers = [baseUser, { ...baseUser, id: 'u2', email: 'b@test.com', full_name: 'Bob' }]

describe('useUsersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── Estado inicial ───────────────────────────────────────────
  it('inicia con lista vacía, sin loading ni error', () => {
    const store = useUsersStore()
    expect(store.users).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  // ── fetchAll ─────────────────────────────────────────────────
  it('fetchAll: carga usuarios aplanando la relación user_roles', async () => {
    const { supabase } = await import('@/lib/supabase')
    const rawData = [
      { id: 'u1', email: 'a@test.com', full_name: 'Ana', phone: null, user_roles: [{ roles: role }] },
      { id: 'u2', email: 'b@test.com', full_name: 'Bob', phone: null, user_roles: [] },
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
    expect(store.users[0].phone).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('fetchAll: si falla, guarda error y lista queda vacía', async () => {
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

  // ── createUser ───────────────────────────────────────────────
  it('createUser: llama a la edge function con los parámetros correctos', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ error: null } as any)
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as any)

    const store = useUsersStore()
    await store.createUser({ email: 'nuevo@test.com', full_name: 'Nuevo', phone: '+56912345678' })

    expect(supabase.functions.invoke).toHaveBeenCalledWith('admin-create-user', {
      body: { email: 'nuevo@test.com', full_name: 'Nuevo', phone: '+56912345678' },
    })
  })

  it('createUser: si falla, relanza el error', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ error: { message: 'Email ya existe' } } as any)

    const store = useUsersStore()
    await expect(store.createUser({ email: 'dup@test.com', full_name: null, phone: null })).rejects.toThrow()
  })

  // ── updateProfile ────────────────────────────────────────────
  it('updateProfile: actualiza el ítem en memoria', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any)

    const store = useUsersStore()
    store.users = [{ ...baseUser }]
    await store.updateProfile('u1', { full_name: 'Ana Actualizada', phone: '+56900000000' })

    const user = store.users.find(u => u.id === 'u1')
    expect(user?.full_name).toBe('Ana Actualizada')
    expect(user?.phone).toBe('+56900000000')
  })

  it('updateProfile: si falla, relanza el error y el usuario queda sin cambios', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'RLS violation' } }),
      }),
    } as any)

    const store = useUsersStore()
    store.users = [{ ...baseUser }]
    await expect(store.updateProfile('u1', { full_name: 'X' })).rejects.toThrow()
    expect(store.users.find(u => u.id === 'u1')?.full_name).toBe('Ana')
  })

  // ── assignRole ───────────────────────────────────────────────
  it('assignRole: llama a rpc con los parámetros correctos', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as any)

    const store = useUsersStore()
    await store.assignRole('u1', 'r1')

    expect(supabase.rpc).toHaveBeenCalledWith('assign_role', { p_user_id: 'u1', p_role_id: 'r1' })
  })

  it('assignRole: agrega el rol al usuario en memoria', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as any)

    const store = useUsersStore()
    store.users = [{ ...baseUser, roles: [] }]
    await store.assignRole('u1', 'r1', role)

    expect(store.users[0].roles).toContainEqual(role)
  })

  it('assignRole: no duplica el rol si ya estaba asignado', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as any)

    const store = useUsersStore()
    store.users = [{ ...baseUser, roles: [role] }]
    await store.assignRole('u1', 'r1', role)

    expect(store.users[0].roles).toHaveLength(1)
  })

  it('assignRole: si falla, relanza el error', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.rpc).mockResolvedValue({ error: { message: 'Error RPC' } } as any)

    const store = useUsersStore()
    await expect(store.assignRole('u1', 'r1')).rejects.toThrow()
  })

  // ── removeRole ───────────────────────────────────────────────
  it('removeRole: llama a rpc con los parámetros correctos', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as any)

    const store = useUsersStore()
    await store.removeRole('u1', 'r1')

    expect(supabase.rpc).toHaveBeenCalledWith('remove_role', { p_user_id: 'u1', p_role_id: 'r1' })
  })

  it('removeRole: elimina el rol del usuario en memoria', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as any)

    const store = useUsersStore()
    store.users = [{ ...baseUser, roles: [role] }]
    await store.removeRole('u1', 'r1')

    expect(store.users[0].roles).toHaveLength(0)
  })

  it('removeRole: si falla, relanza el error y los roles quedan intactos', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.rpc).mockResolvedValue({ error: { message: 'Error RPC' } } as any)

    const store = useUsersStore()
    store.users = [{ ...baseUser, roles: [role] }]
    await expect(store.removeRole('u1', 'r1')).rejects.toThrow()
    expect(store.users[0].roles).toHaveLength(1)
  })
})
