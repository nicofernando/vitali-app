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
const baseUser = { id: 'u1', email: 'a@test.com', full_name: 'Ana', phone: null, is_active: true, roles: [] }

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
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: [
        { id: 'u1', email: 'a@test.com', full_name: 'Ana', phone: null },
        { id: 'u2', email: 'b@test.com', full_name: 'Bob', phone: null },
      ],
      error: null,
    } as any)
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ user_id: 'u1', roles: role }],
        error: null,
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
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: 'No autorizado' },
    } as any)
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
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
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: [], error: null } as any)
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
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
  it('updateProfile: actualiza el ítem en memoria (upsert)', async () => {
    const { supabase } = await import('@/lib/supabase')
    // updateProfile usa upsert para manejar usuarios sin fila en user_profiles
    vi.mocked(supabase.from).mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
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
      upsert: vi.fn().mockResolvedValue({ error: { message: 'RLS violation' } }),
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

  it('assignRole: reemplaza el rol del usuario en memoria (no acumula)', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as any)

    const otherRole = { id: 'r-prev', name: 'Vendedor', description: null, is_system: false, created_at: '' }
    const store = useUsersStore()
    store.users = [{ ...baseUser, roles: [otherRole] }]
    await store.assignRole('u1', 'r1', role)

    expect(store.users[0].roles).toEqual([role])
    expect(store.users[0].roles).toHaveLength(1)
  })

  it('assignRole: setea array vacío si no se provee el objeto role', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as any)

    const store = useUsersStore()
    store.users = [{ ...baseUser, roles: [role] }]
    await store.assignRole('u1', 'r1')

    expect(store.users[0].roles).toEqual([])
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

  // ── toggleUser ───────────────────────────────────────────────
  it('toggleUser: llama a admin-toggle-user con los parámetros correctos', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ error: null } as any)

    const store = useUsersStore()
    store.users = [{ ...baseUser, is_active: true }]
    await store.toggleUser('u1', false)

    expect(supabase.functions.invoke).toHaveBeenCalledWith('admin-toggle-user', {
      body: { user_id: 'u1', enable: false },
    })
    expect(store.users[0].is_active).toBe(false)
  })

  it('toggleUser: activa un usuario desactivado', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ error: null } as any)

    const store = useUsersStore()
    store.users = [{ ...baseUser, is_active: false }]
    await store.toggleUser('u1', true)

    expect(store.users[0].is_active).toBe(true)
  })

  it('toggleUser: si falla, relanza el error y el estado queda sin cambios', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ error: { message: 'Sin permisos' } } as any)

    const store = useUsersStore()
    store.users = [{ ...baseUser, is_active: true }]
    await expect(store.toggleUser('u1', false)).rejects.toThrow()
    expect(store.users[0].is_active).toBe(true)
  })

  // ── deleteUser ───────────────────────────────────────────────
  it('deleteUser: llama a admin-delete-user y elimina el usuario de la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ error: null } as any)

    const store = useUsersStore()
    store.users = [{ ...baseUser }, { ...baseUser, id: 'u2', email: 'b@test.com', full_name: 'Bob' }]
    await store.deleteUser('u1')

    expect(supabase.functions.invoke).toHaveBeenCalledWith('admin-delete-user', {
      body: { user_id: 'u1' },
    })
    expect(store.users.find(u => u.id === 'u1')).toBeUndefined()
    expect(store.users).toHaveLength(1)
  })

  it('deleteUser: si falla, relanza el error y la lista queda intacta', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ error: { message: 'No autorizado' } } as any)

    const store = useUsersStore()
    store.users = [{ ...baseUser }]
    await expect(store.deleteUser('u1')).rejects.toThrow()
    expect(store.users).toHaveLength(1)
  })
})
