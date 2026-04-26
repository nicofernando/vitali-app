import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/lib/supabase'

import { useAuditStore } from './audit'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const mockEntry = {
  id: 'a1',
  entity_type: 'clients',
  entity_id: 'c1',
  action: 'create' as const,
  actor_id: 'u1',
  payload: { after: { full_name: 'Juan' } },
  created_at: '2026-04-25T12:00:00Z',
}

function mockChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'order', 'range', 'eq', 'gte', 'lte', 'in']
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  chain.then = (resolve: (v: unknown) => void) => {
    Promise.resolve(result).then(resolve)
    return Promise.resolve(result)
  }
  ;(chain as any)[Symbol.toStringTag] = 'MockChain'
  return chain
}

describe('useAuditStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('estado inicial: entries vacíos, sin loading ni error', () => {
    const store = useAuditStore()
    expect(store.entries).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.total).toBe(0)
  })

  describe('fetchAll', () => {
    it('carga entries correctamente', async () => {
      const chain = mockChain({ data: [mockEntry], error: null, count: 1 })
      vi.mocked(supabase.from).mockReturnValue(chain as any)
      const store = useAuditStore()
      await store.fetchAll({})
      expect(store.entries).toHaveLength(1)
      expect(store.error).toBeNull()
    })

    it('setea error si la consulta falla', async () => {
      const chain = mockChain({ data: null, error: { message: 'permission denied' }, count: 0 })
      vi.mocked(supabase.from).mockReturnValue(chain as any)
      const store = useAuditStore()
      await store.fetchAll({})
      expect(store.error).toBe('permission denied')
      expect(store.entries).toEqual([])
    })

    it('aplica filtro entity_type cuando se provee', async () => {
      const chain = mockChain({ data: [mockEntry], error: null, count: 1 })
      vi.mocked(supabase.from).mockReturnValue(chain as any)
      const store = useAuditStore()
      await store.fetchAll({ entity_type: 'clients' })
      expect(chain.eq).toHaveBeenCalledWith('entity_type', 'clients')
    })

    it('aplica filtro actor_id cuando se provee', async () => {
      const chain = mockChain({ data: [mockEntry], error: null, count: 1 })
      vi.mocked(supabase.from).mockReturnValue(chain as any)
      const store = useAuditStore()
      await store.fetchAll({ actor_id: 'u1' })
      expect(chain.eq).toHaveBeenCalledWith('actor_id', 'u1')
    })
  })

  describe('fetchByEntity', () => {
    it('carga entries filtrados por entityType y entityId', async () => {
      const chain = mockChain({ data: [mockEntry], error: null })
      vi.mocked(supabase.from).mockReturnValue(chain as any)
      const store = useAuditStore()
      const result = await store.fetchByEntity('clients', 'c1')
      expect(result).toHaveLength(1)
      expect(chain.eq).toHaveBeenCalledWith('entity_type', 'clients')
      expect(chain.eq).toHaveBeenCalledWith('entity_id', 'c1')
    })

    it('retorna array vacío si la consulta falla', async () => {
      const chain = mockChain({ data: null, error: { message: 'error' } })
      vi.mocked(supabase.from).mockReturnValue(chain as any)
      const store = useAuditStore()
      const result = await store.fetchByEntity('clients', 'c1')
      expect(result).toEqual([])
    })
  })
})
