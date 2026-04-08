import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useClientsStore } from './clients'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}))

const fakeClients = [
  {
    id: 'cl1',
    full_name: 'Juan Pérez',
    rut: '12.345.678-9',
    address: 'Av. Providencia 1234',
    commune: 'Providencia',
    phone: '+56912345678',
    email: 'juan@test.com',
    created_by: 'u1',
    created_at: '2026-04-07T00:00:00Z',
  },
  {
    id: 'cl2',
    full_name: 'María González',
    rut: '9.876.543-2',
    address: null,
    commune: null,
    phone: null,
    email: null,
    created_by: 'u1',
    created_at: '2026-04-07T01:00:00Z',
  },
]

describe('useClientsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── Estado inicial ───────────────────────────────────────────
  it('inicia con lista vacía, sin loading ni error', () => {
    const store = useClientsStore()
    expect(store.clients).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  // ── fetchAll ─────────────────────────────────────────────────
  it('fetchAll: carga clientes ordenados por nombre', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: fakeClients, error: null }),
      }),
    } as any)

    const store = useClientsStore()
    await store.fetchAll()

    expect(store.clients).toEqual(fakeClients)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchAll: si falla, guarda error y lista queda vacía', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }),
    } as any)

    const store = useClientsStore()
    await store.fetchAll()

    expect(store.clients).toEqual([])
    expect(store.error).toBe('DB error')
    expect(store.loading).toBe(false)
  })

  // ── search ───────────────────────────────────────────────────
  it('search: retorna resultados del RPC search_clients', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [fakeClients[0]], error: null } as any)

    const store = useClientsStore()
    const results = await store.search('Juan')

    expect(supabase.rpc).toHaveBeenCalledWith('search_clients', { p_query: 'Juan' })
    expect(results).toEqual([fakeClients[0]])
  })

  it('search: si falla el RPC, relanza el error', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'RPC error' } } as any)

    const store = useClientsStore()
    await expect(store.search('x')).rejects.toThrow('RPC error')
  })

  // ── create ───────────────────────────────────────────────────
  it('create: agrega al inicio de la lista y retorna el cliente creado', async () => {
    const { supabase } = await import('@/lib/supabase')
    const newClient = { ...fakeClients[0], id: 'cl3', full_name: 'Pedro López' }
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newClient, error: null }),
        }),
      }),
    } as any)

    const store = useClientsStore()
    store.clients = [...fakeClients]
    const result = await store.create({ full_name: 'Pedro López', rut: null, address: null, commune: null, phone: null, email: null })

    expect(result).toEqual(newClient)
    expect(store.clients[0]).toEqual(newClient)
    expect(store.clients).toHaveLength(3)
  })

  it('create: si falla, relanza el error y la lista queda intacta', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'RLS violation' } }),
        }),
      }),
    } as any)

    const store = useClientsStore()
    store.clients = [...fakeClients]
    await expect(store.create({ full_name: 'X', rut: null, address: null, commune: null, phone: null, email: null })).rejects.toThrow()
    expect(store.clients).toHaveLength(2)
  })

  // ── update ───────────────────────────────────────────────────
  it('update: modifica el ítem correcto en la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    const updated = { ...fakeClients[0], full_name: 'Juan Pérez Actualizado' }
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: updated, error: null }),
          }),
        }),
      }),
    } as any)

    const store = useClientsStore()
    store.clients = [...fakeClients]
    await store.update('cl1', { full_name: 'Juan Pérez Actualizado' })

    expect(store.clients.find(c => c.id === 'cl1')?.full_name).toBe('Juan Pérez Actualizado')
    expect(store.clients).toHaveLength(2)
  })

  it('update: si falla, relanza el error y el ítem queda sin cambios', async () => {
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

    const store = useClientsStore()
    store.clients = [...fakeClients]
    await expect(store.update('cl1', { full_name: 'X' })).rejects.toThrow()
    expect(store.clients.find(c => c.id === 'cl1')?.full_name).toBe('Juan Pérez')
  })

  // ── remove ───────────────────────────────────────────────────
  it('remove: elimina el ítem de la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any)

    const store = useClientsStore()
    store.clients = [...fakeClients]
    await store.remove('cl1')

    expect(store.clients.find(c => c.id === 'cl1')).toBeUndefined()
    expect(store.clients).toHaveLength(1)
  })

  it('remove: si falla, relanza el error y la lista queda intacta', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'FK violation' } }),
      }),
    } as any)

    const store = useClientsStore()
    store.clients = [...fakeClients]
    await expect(store.remove('cl1')).rejects.toThrow()
    expect(store.clients).toHaveLength(2)
  })
})
