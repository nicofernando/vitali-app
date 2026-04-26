import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/lib/supabase'

import { useRolesStore } from './roles'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

const mockRole = {
  id: 'r1',
  name: 'Asistente',
  description: 'desc',
  is_system: false,
  created_at: '2026-01-01',
  permission_ids: ['p1', 'p2'],
  user_count: 3,
}

const mockPermission = { id: 'p1', module: 'clients', action: 'read', description: null }

describe('useRolesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('estado inicial vacío, sin loading ni error', () => {
    const store = useRolesStore()
    expect(store.roles).toEqual([])
    expect(store.allPermissions).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('fetchAll', () => {
    it('llena roles desde RPC get_roles_with_permissions', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: [mockRole], error: null } as any)
      const store = useRolesStore()
      await store.fetchAll()
      expect(store.roles).toEqual([mockRole])
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('setea error si la RPC falla', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'db error' } } as any)
      const store = useRolesStore()
      await store.fetchAll()
      expect(store.error).toBe('db error')
      expect(store.roles).toEqual([])
    })

    it('usa cache hasFetched — no vuelve a llamar si ya tiene datos', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: [mockRole], error: null } as any)
      const store = useRolesStore()
      await store.fetchAll()
      await store.fetchAll()
      expect(supabase.rpc).toHaveBeenCalledTimes(1)
    })

    it('permite forzar refetch con force=true', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: [mockRole], error: null } as any)
      const store = useRolesStore()
      await store.fetchAll()
      await store.fetchAll(true)
      expect(supabase.rpc).toHaveBeenCalledTimes(2)
    })
  })

  describe('fetchPermissions', () => {
    it('llena allPermissions desde tabla permissions', async () => {
      const mockFrom = {
        select: vi.fn().mockResolvedValueOnce({ data: [mockPermission], error: null }),
      }
      vi.mocked(supabase.from).mockReturnValueOnce(mockFrom as any)
      const store = useRolesStore()
      await store.fetchPermissions()
      expect(store.allPermissions).toEqual([mockPermission])
    })

    it('setea error si falla', async () => {
      const mockFrom = {
        select: vi.fn().mockResolvedValueOnce({ data: null, error: { message: 'fail' } }),
      }
      vi.mocked(supabase.from).mockReturnValueOnce(mockFrom as any)
      const store = useRolesStore()
      await store.fetchPermissions()
      expect(store.error).toBe('fail')
    })

    it('usa cache — no vuelve a llamar si ya tiene datos', async () => {
      const mockFrom = {
        select: vi.fn().mockResolvedValue({ data: [mockPermission], error: null }),
      }
      vi.mocked(supabase.from).mockReturnValue(mockFrom as any)
      const store = useRolesStore()
      await store.fetchPermissions()
      await store.fetchPermissions()
      expect(mockFrom.select).toHaveBeenCalledTimes(1)
    })
  })

  describe('createRole', () => {
    it('llama RPC create_role y recarga la lista', async () => {
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: 'new-id', error: null } as any)
        .mockResolvedValueOnce({ data: [mockRole], error: null } as any)
      const store = useRolesStore()
      const id = await store.createRole('Asistente', 'desc', ['p1'])
      expect(id).toBe('new-id')
      expect(supabase.rpc).toHaveBeenCalledWith('create_role', {
        p_name: 'Asistente',
        p_description: 'desc',
        p_permission_ids: ['p1'],
      })
    })

    it('lanza error si la RPC falla', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'nombre duplicado' } } as any)
      const store = useRolesStore()
      await expect(store.createRole('X', null, [])).rejects.toThrow('nombre duplicado')
    })
  })

  describe('updateRole', () => {
    it('llama RPC update_role y recarga la lista', async () => {
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: null, error: null } as any)
        .mockResolvedValueOnce({ data: [mockRole], error: null } as any)
      const store = useRolesStore()
      await store.updateRole('r1', 'Nuevo', null, ['p2'])
      expect(supabase.rpc).toHaveBeenCalledWith('update_role', {
        p_role_id: 'r1',
        p_name: 'Nuevo',
        p_description: null,
        p_permission_ids: ['p2'],
      })
    })

    it('lanza error si la RPC falla (is_system)', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'no se puede modificar' } } as any)
      const store = useRolesStore()
      await expect(store.updateRole('r-sys', 'X', null, [])).rejects.toThrow('no se puede modificar')
    })
  })

  describe('deleteRole', () => {
    it('llama RPC delete_role y actualiza lista local', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null } as any)
      const store = useRolesStore()
      store.roles = [mockRole]
      await store.deleteRole('r1')
      expect(store.roles).toEqual([])
      expect(supabase.rpc).toHaveBeenCalledWith('delete_role', { p_role_id: 'r1' })
    })

    it('lanza error si hay usuarios asignados', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: '3 usuario(s)' } } as any)
      const store = useRolesStore()
      await expect(store.deleteRole('r1')).rejects.toThrow('3 usuario(s)')
    })
  })
})
